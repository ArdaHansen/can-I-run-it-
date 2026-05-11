require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { runMigrations } = require('./src/migrate');
const { analyzeRun } = require('./src/engine');

const app = express();
const PORT = process.env.PORT || 10000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '120kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 180, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (req, file, cb) => {
  const ok = ['image/png','image/jpeg','image/webp'].includes(file.mimetype);
  cb(ok ? null : new Error('Only PNG, JPG or WEBP screenshots are allowed.'), ok);
}});

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
function userClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
}
async function requireUser(req, res, next) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ error: 'Missing Supabase env vars.' });
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing auth token.' });
    const supabase = userClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid session.' });
    req.user = data.user;
    req.supabase = supabase;
    req.token = token;
    next();
  } catch (e) { res.status(401).json({ error: 'Auth failed.' }); }
}

app.get('/api/config', (req, res) => {
  res.json({ supabaseUrl: SUPABASE_URL || '', anonKey: SUPABASE_ANON_KEY || '', appName: 'Can I Run It' });
});
app.get('/api/health', (req, res) => res.json({ ok: true, version: '2.1.0' }));

app.post('/api/profile', requireUser, async (req, res) => {
  const b = req.body || {};
  const payload = {
    id: req.user.id,
    email: req.user.email,
    username: String(b.username || '').slice(0, 40),
    full_name: String(b.full_name || '').slice(0, 80),
    level: String(b.level || 'Beginner'),
    experience: String(b.experience || '0-1 years'),
    goal_distance: String(b.goal_distance || 'Marathon'),
    goal_time_hour: Math.max(0, Math.min(9, Number(b.goal_time_hour || 0))),
    goal_time_min: Math.max(0, Math.min(59, Number(b.goal_time_min || 0))),
    target_race: String(b.target_race || '').slice(0, 80),
    weekly_km: Math.max(0, Math.min(220, Number(b.weekly_km || 0))),
    training_days: Math.max(1, Math.min(7, Number(b.training_days || 3))),
    available_days: Array.isArray(b.available_days) ? b.available_days.slice(0, 7) : [],
    rest_preference: String(b.rest_preference || 'balanced'),
    injury_history: String(b.injury_history || '').slice(0, 500),
    notes: String(b.notes || '').slice(0, 500),
    onboarding_complete: true,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await req.supabase.from('profiles').upsert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ profile: data });
});

app.get('/api/dashboard', requireUser, async (req, res) => {
  const { data: profile, error: pErr } = await req.supabase.from('profiles').select('*').eq('id', req.user.id).maybeSingle();
  if (pErr) return res.status(400).json({ error: pErr.message });
  const { data: runs, error: rErr } = await req.supabase.from('runs').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(20);
  if (rErr) return res.status(400).json({ error: rErr.message });
  const canPlan = (runs || []).length >= 3;
  res.json({ profile, runs: runs || [], canPlan });
});

app.post('/api/runs', requireUser, upload.single('screenshot'), async (req, res) => {
  const profileRes = await req.supabase.from('profiles').select('*').eq('id', req.user.id).maybeSingle();
  if (profileRes.error) return res.status(400).json({ error: profileRes.error.message });
  if (!profileRes.data) return res.status(400).json({ error: 'Create your profile first.' });
  const b = req.body || {};
  let image_path = null;
  let image_url = null;
  if (req.file) {
    try {
      const optimized = await sharp(req.file.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      image_path = `${req.user.id}/${uuidv4()}.jpg`;
      const admin = adminClient();
      if (!admin) return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY for secure upload.' });
      const up = await admin.storage.from('run-screenshots').upload(image_path, optimized, { contentType: 'image/jpeg', upsert: false });
      if (up.error) return res.status(400).json({ error: up.error.message });
      const signed = await admin.storage.from('run-screenshots').createSignedUrl(image_path, 60 * 60);
      image_url = signed.data?.signedUrl || null;
    } catch (e) { return res.status(400).json({ error: 'Image processing failed.' }); }
  }
  const previous = await req.supabase.from('runs').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30);
  const runDraft = {
    user_id: req.user.id,
    image_path,
    image_url,
    distance_km: Math.max(0, Math.min(200, Number(b.distance_km || 0))),
    duration_min: Math.max(0, Math.min(1440, Number(b.duration_min || 0))),
    avg_hr: b.avg_hr ? Math.max(30, Math.min(230, Number(b.avg_hr))) : null,
    effort: Math.max(1, Math.min(10, Number(b.effort || 5))),
    run_type: String(b.run_type || 'Easy').slice(0, 40),
    notes: String(b.notes || '').slice(0, 500)
  };
  const analysis = analyzeRun(runDraft, profileRes.data, previous.data || []);
  const payload = { ...runDraft, pace_text: analysis.pace_text, readiness_score: analysis.readiness_score, analysis };
  const { data, error } = await req.supabase.from('runs').insert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ run: data, analysis });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

(async () => {
  try { await runMigrations(); } catch (e) { console.error('[schema] migration failed:', e.message); }
  app.listen(PORT, () => console.log(`Can I Run It v2.1 running on ${PORT}`));
})();
