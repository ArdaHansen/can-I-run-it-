require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const publicDir = path.join(__dirname, 'public');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APP_URL = process.env.APP_URL || '';

const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }) : null;

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "blob:", SUPABASE_URL || 'https:'],
      "connect-src": ["'self'", SUPABASE_URL || 'https://*.supabase.co'],
      "object-src": ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({ origin: isProd && APP_URL ? APP_URL : true, credentials: false }));
app.use(express.json({ limit: '512kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 250, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(publicDir, { extensions: ['html'], maxAge: isProd ? '10m' : 0 }));

async function ensureSchema() {
  if (!process.env.SUPABASE_DB_URL) {
    console.log('[schema] SUPABASE_DB_URL not set. Run supabase/schema.sql once in Supabase.');
    return;
  }
  const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'schema.sql'), 'utf8');
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log('[schema] database schema verified');
  } catch (err) {
    console.error('[schema] migration failed:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

function requireConfig(res) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'Supabase env vars missing: SUPABASE_URL and SUPABASE_ANON_KEY are required.' });
    return false;
  }
  return true;
}

async function getUserFromAuth(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !admin) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function cleanText(v, max = 500) { return String(v || '').replace(/[<>]/g, '').trim().slice(0, max); }
function num(v, def = 0) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function paceFrom(distance, duration) {
  if (!distance || !duration) return '';
  const pace = duration / distance;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60).toString().padStart(2, '0');
  return `${m}:${s}/km`;
}
function analyzeRun(r, profile) {
  const distance = num(r.distance_km);
  const duration = num(r.duration_min);
  const hr = num(r.avg_hr);
  const effort = num(r.effort, 5);
  let score = 50;
  if (distance >= 18 && profile?.goal_distance === 'Marathon') score += 15;
  if (distance >= 10) score += 8;
  if (duration > 0 && distance > 0) {
    const pace = duration / distance;
    if (profile?.goal_distance === 'Marathon') {
      const goalMin = num(profile.goal_time_hour, 3) * 60 + num(profile.goal_time_min, 30);
      const goalPace = goalMin / 42.195;
      if (pace <= goalPace + 0.35) score += 18;
      else if (pace <= goalPace + 1.0) score += 8;
      else score -= 3;
    }
  }
  if (hr > 0 && hr < 155 && effort <= 6) score += 8;
  if (effort >= 9 && distance > 15) score -= 8;
  score = clamp(Math.round(score), 8, 96);
  const analysis = [];
  if (distance < 5) analysis.push('Der Lauf ist kurz. Für eine echte Zielprognose brauchst du noch längere, stabile Läufe.');
  if (distance >= 10) analysis.push('Solider Datenpunkt: Distanz reicht aus, um Ausdauer und Pace besser einzuschätzen.');
  if (hr > 165 && effort <= 6) analysis.push('Auffällig: Die Herzfrequenz wirkt für einen lockeren Lauf eher hoch. Easy Runs wahrscheinlich ruhiger laufen.');
  if (effort >= 8) analysis.push('Hohe Belastung erkannt. Plane danach keinen harten Tag, sondern Recovery oder Pause.');
  if (!analysis.length) analysis.push('Guter Upload. Mit weiteren Läufen wird die Einschätzung deutlich genauer.');
  const suggestion = score >= 75 ? 'Diese Woche: 1 lockerer Lauf, 1 Tempoblock, 1 langer Lauf. Belastung vorsichtig steigern.' : score >= 55 ? 'Diese Woche: Fokus auf Konstanz. 2–3 lockere Läufe plus ein längerer Lauf im Wohlfühlbereich.' : 'Diese Woche: Erst Basis stabilisieren. Keine aggressiven Intervalle, lieber locker und regelmäßig laufen.';
  return { readiness_score: score, ai_analysis: analysis.join(' '), training_suggestion: suggestion };
}
function makePlan(profile, runs) {
  if (!profile || runs.length < 3) return null;
  const days = Array.isArray(profile.available_days) && profile.available_days.length ? profile.available_days : ['Mon','Wed','Fri','Sun'];
  const level = profile.level || 'Intermediate';
  const hard = level === 'Competitive' || level === 'Advanced';
  const plan = days.slice(0, clamp(num(profile.training_days, 4), 3, 6)).map((d, i) => {
    if (i === days.length - 1 || i === 3) return { day: d, title: 'Long Run', details: hard ? '75–100 min locker, letzte 15 min steady wenn frisch.' : '55–75 min locker, komplett kontrolliert.' };
    if (i === 1) return { day: d, title: hard ? 'Tempo / Threshold' : 'Steady Run', details: hard ? '15 min easy, 3×8 min zügig, 3 min Trabpause, cooldown.' : '35–50 min locker bis steady, kein All-out.' };
    return { day: d, title: 'Easy Run', details: '30–50 min locker. Ziel: ruhig, sauber, wiederholbar.' };
  });
  return { title: 'Adaptive Week', plan, summary: 'Plan basiert auf Profil, verfügbaren Tagen und deinen letzten Uploads. Erst ab 3 Läufen wird er wirklich personalisiert.' };
}

app.get('/api/config', (req, res) => {
  if (!requireConfig(res)) return;
  res.json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY });
});

app.get('/api/health', (req, res) => res.json({ ok: true, version: '2.1.0' }));

app.post('/api/profile', async (req, res) => {
  const user = await getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const b = req.body || {};
  const profile = {
    id: user.id,
    email: user.email,
    username: cleanText(b.username, 40),
    full_name: cleanText(b.full_name, 80),
    level: cleanText(b.level, 30) || 'Intermediate',
    experience: cleanText(b.experience, 50),
    goal_distance: cleanText(b.goal_distance, 30) || 'Marathon',
    goal_time_hour: clamp(num(b.goal_time_hour, 3), 0, 12),
    goal_time_min: clamp(num(b.goal_time_min, 30), 0, 59),
    target_race: cleanText(b.target_race, 120),
    weekly_goal: clamp(num(b.weekly_goal, 4), 1, 7),
    weekly_km: clamp(num(b.weekly_km, 0), 0, 300),
    training_days: clamp(num(b.training_days, 4), 1, 7),
    available_days: Array.isArray(b.available_days) ? b.available_days.map(x => cleanText(x, 10)).slice(0,7) : [],
    rest_preference: cleanText(b.rest_preference, 40),
    injury_history: cleanText(b.injury_history, 500),
    current_fitness: cleanText(b.current_fitness, 500),
    notes: cleanText(b.notes, 500),
    onboarding_complete: true,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await admin.from('profiles').upsert(profile).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ profile: data });
});

app.get('/api/me', async (req, res) => {
  const user = await getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const { data: runs } = await admin.from('runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
  const plan = makePlan(profile, runs || []);
  res.json({ user: { id: user.id, email: user.email }, profile, runs: runs || [], plan });
});

app.post('/api/runs', upload.single('screenshot'), async (req, res) => {
  const user = await getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  let screenshot_url = null, image_path = null;
  if (req.file) {
    const allowed = ['image/jpeg','image/png','image/webp'];
    if (!allowed.includes(req.file.mimetype)) return res.status(415).json({ error: 'Only JPG, PNG and WEBP are allowed.' });
    const safe = await sharp(req.file.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    image_path = `${user.id}/${uuidv4()}.jpg`;
    const up = await admin.storage.from('run-screenshots').upload(image_path, safe, { contentType: 'image/jpeg', upsert: false });
    if (!up.error) {
      const signed = await admin.storage.from('run-screenshots').createSignedUrl(image_path, 60 * 60 * 24 * 7);
      screenshot_url = signed.data?.signedUrl || null;
    }
  }
  const b = req.body || {};
  const distance = clamp(num(b.distance_km), 0, 300);
  const duration = clamp(num(b.duration_min), 0, 3000);
  const base = {
    user_id: user.id,
    title: cleanText(b.title, 80) || 'Run upload',
    source: req.file ? 'screenshot+manual' : 'manual',
    screenshot_url,
    image_path,
    distance_km: distance,
    duration_min: duration,
    pace_text: cleanText(b.pace_text, 20) || paceFrom(distance, duration),
    avg_hr: b.avg_hr ? clamp(num(b.avg_hr), 40, 230) : null,
    max_hr: b.max_hr ? clamp(num(b.max_hr), 40, 240) : null,
    elevation_gain: clamp(num(b.elevation_gain), 0, 10000),
    effort: clamp(num(b.effort, 5), 1, 10),
    run_type: cleanText(b.run_type, 40) || 'Easy',
    notes: cleanText(b.notes, 500),
    parsed_data: { ocr_status: 'beta_manual_correction_required' }
  };
  const analysis = analyzeRun(base, profile);
  const payload = { ...base, ...analysis };
  const { data, error } = await admin.from('runs').insert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ run: data });
});

app.post('/api/bootstrap', async (req, res) => {
  if (!process.env.SUPABASE_DB_URL) return res.status(400).json({ error: 'SUPABASE_DB_URL not set' });
  await ensureSchema();
  res.json({ ok: true });
});

app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

ensureSchema().finally(() => {
  app.listen(PORT, () => console.log(`Can I Run It V2.1 running on :${PORT}`));
});
