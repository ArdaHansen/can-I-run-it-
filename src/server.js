import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import Joi from 'joi';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { config } from './config.js';
import { db } from './db.js';
import { register, login, signUser, setAuthCookie, clearAuthCookie, requireAuth } from './auth.js';
import { normalizeRun, analyzeGoal } from './analysisEngine.js';
import { extractRunDataFromImage } from './ai.js';
import { updateStreak, getStreak } from './streak.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only JPG, PNG or WEBP images allowed'), allowed.includes(file.mimetype));
  }
});
const csrfProtection = csrf({ cookie: { httpOnly: true, sameSite: 'strict', secure: config.env === 'production' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: '128kb' }));
app.use(cookieParser(config.cookieSecret));
app.use(express.static(path.join(process.cwd(), 'public'), { maxAge: config.env === 'production' ? '1d' : 0 }));
app.use('/api', apiLimiter);

const authSchema = Joi.object({ email: Joi.string().email().max(160).required(), password: Joi.string().min(8).max(128).required() });
const manualRunSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null),
  distanceKm: Joi.number().min(0.1).max(300).required(),
  durationMin: Joi.number().min(1).max(5000).required(),
  pace: Joi.string().max(20).allow('', null),
  avgHr: Joi.number().integer().min(40).max(240).allow(null, ''),
  elevationM: Joi.number().integer().min(0).max(20000).allow(null, ''),
  cadence: Joi.number().integer().min(50).max(260).allow(null, ''),
  notes: Joi.string().max(500).allow('', null),
  goalDistance: Joi.string().valid('10k', 'half', 'marathon').required(),
  goalTimeMin: Joi.number().min(15).max(1000).required()
});

app.get('/api/csrf', csrfProtection, (req, res) => res.json({ csrfToken: req.csrfToken() }));
app.post('/api/register', authLimiter, csrfProtection, async (req, res) => {
  const { error, value } = authSchema.validate(req.body);
  if (error) return res.status(400).json({ error: 'Invalid email or password. Password must be at least 8 chars.' });
  try {
    const user = await register(value.email, value.password);
    setAuthCookie(res, signUser(user));
    res.json({ user });
  } catch (e) {
    res.status(e.message === 'EMAIL_EXISTS' ? 409 : 400).json({ error: e.message === 'EMAIL_EXISTS' ? 'Email already registered.' : 'Registration failed.' });
  }
});
app.post('/api/login', authLimiter, csrfProtection, async (req, res) => {
  const { error, value } = authSchema.validate(req.body);
  if (error) return res.status(400).json({ error: 'Invalid login data.' });
  try {
    const user = await login(value.email, value.password);
    setAuthCookie(res, signUser(user));
    res.json({ user });
  } catch { res.status(401).json({ error: 'Wrong email or password.' }); }
});
app.post('/api/logout', csrfProtection, (req, res) => { clearAuthCookie(res); res.json({ ok: true }); });
app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user, streak: getStreak(req.user.id) }));

function saveRunAndAnalysis(userId, run, goalDistance, goalTimeMin) {
  const runId = uuid();
  db.prepare(`INSERT INTO runs (id, user_id, date, distance_km, duration_min, avg_pace_sec, avg_hr, elevation_m, cadence, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(runId, userId, run.date, run.distanceKm, run.durationMin, run.avgPaceSec, run.avgHr, run.elevationM, run.cadence, run.notes);
  const recentRuns = db.prepare('SELECT distance_km as distanceKm, duration_min as durationMin, avg_pace_sec as avgPaceSec, avg_hr as avgHr FROM runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
  const result = analyzeGoal({ latestRun: run, recentRuns, goalDistance, goalTimeMin });
  const analysisId = uuid();
  db.prepare(`INSERT INTO analyses (id, user_id, run_id, goal_distance, goal_time_min, readiness_score, probability, verdict, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(analysisId, userId, runId, goalDistance, goalTimeMin, result.readinessScore, result.probability, result.verdict, JSON.stringify(result));
  const streak = updateStreak(userId, run.date);
  return { runId, analysisId, run, result, streak };
}

app.post('/api/analyze/manual', requireAuth, csrfProtection, (req, res) => {
  const { error, value } = manualRunSchema.validate(req.body, { convert: true });
  if (error) return res.status(400).json({ error: error.details[0].message });
  const run = normalizeRun(value);
  res.json(saveRunAndAnalysis(req.user.id, run, value.goalDistance, value.goalTimeMin));
});

app.post('/api/analyze/screenshot', requireAuth, csrfProtection, upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Screenshot missing.' });
    const { goalDistance, goalTimeMin } = req.body;
    if (!['10k', 'half', 'marathon'].includes(goalDistance) || Number(goalTimeMin) <= 0) return res.status(400).json({ error: 'Invalid goal.' });
    const safeBuffer = await sharp(req.file.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    await fs.mkdir(path.join(process.cwd(), 'uploads'), { recursive: true });
    const extracted = await extractRunDataFromImage(safeBuffer);
    const fallback = { distanceKm: 5, durationMin: 30, pace: '6:00', avgHr: null, notes: 'Demo extraction: add OPENAI_API_KEY for real screenshot reading.' };
    const run = normalizeRun(extracted || fallback);
    res.json(saveRunAndAnalysis(req.user.id, run, goalDistance, Number(goalTimeMin)));
  } catch (e) {
    res.status(500).json({ error: 'Screenshot analysis failed. Try manual input or check API key.' });
  }
});

app.get('/api/history', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, goal_distance, goal_time_min, readiness_score, probability, verdict, payload, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  res.json({ analyses: rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })) });
});

app.use((err, _req, res, _next) => {
  if (err.code === 'EBADCSRFTOKEN') return res.status(403).json({ error: 'Invalid security token. Refresh and try again.' });
  if (err.message?.includes('Only JPG')) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: 'Server error.' });
});

app.listen(config.port, () => console.log(`Can I Run It running on ${config.appOrigin}`));
