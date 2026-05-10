const cfg = window.CIRI_CONFIG || {}
const supabaseClient = window.supabase?.createClient(cfg.supabaseUrl || '', cfg.supabaseAnonKey || '')
let authMode = 'signup'
let sessionUser = null
let profile = null
let runs = []
let availableDays = ['Tue','Thu','Sun']
const maxFileSize = 4 * 1024 * 1024
const allowedTypes = ['image/png','image/jpeg','image/webp']

const $ = (id) => document.getElementById(id)
const views = [...document.querySelectorAll('.view')]
function show(view){ views.forEach(v => v.classList.toggle('active', v.id === view)); if(view==='dashboard') loadDashboard(); if(view==='onboarding') loadProfileForm(); window.scrollTo({top:0,behavior:'smooth'}) }
document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => show(btn.dataset.view)))
function setMsg(id, msg){ $(id).textContent = msg || '' }
function sanitizeText(s, max=300){ return String(s || '').replace(/[<>]/g,'').trim().slice(0,max) }
function pace(distance, duration){ return duration && distance ? duration / distance : 0 }
function formatPace(p){ if(!p) return '—'; const m=Math.floor(p); const s=String(Math.round((p-m)*60)).padStart(2,'0'); return `${m}:${s}/km` }
function readinessScore(){
  if(!runs.length) return 0
  const weeklyKm = Number(profile?.weekly_km || 0)
  const longest = Math.max(...runs.map(r => Number(r.distance_km || 0)))
  const avgPace = runs.reduce((a,r)=>a+pace(Number(r.distance_km), Number(r.duration_min)),0)/runs.length
  const consistency = Math.min(25, runs.length * 6)
  const volume = Math.min(25, weeklyKm / 3)
  const longRun = Math.min(25, longest * 1.2)
  const speed = Math.max(0, Math.min(25, 35 - avgPace * 4))
  return Math.round(Math.max(5, Math.min(96, consistency + volume + longRun + speed)))
}
function coachAdvice(){
  if(runs.length < 3) return [`Upload ${3-runs.length} more run${3-runs.length===1?'':'s'} to unlock adaptive training suggestions.`, 'Until then, keep most running easy and avoid chasing pace too early.']
  const score = readinessScore()
  const longest = Math.max(...runs.map(r => Number(r.distance_km)))
  const easyCount = runs.filter(r => r.effort === 'easy').length
  const advice = []
  if(score < 45) advice.push('Your current goal looks aggressive. Build consistency before adding hard sessions.')
  if(score >= 45 && score < 70) advice.push('Your base is forming. Add one longer aerobic run and one controlled quality day per week.')
  if(score >= 70) advice.push('Your readiness is strong. Keep volume stable and sharpen with race-specific work.')
  if(profile?.goal_distance === 'marathon' && longest < 12) advice.push('Your long run is the limiter. Progress it slowly before adding marathon-pace blocks.')
  if(easyCount < Math.ceil(runs.length / 2)) advice.push('More genuinely easy running would improve adaptation and reduce injury risk.')
  advice.push('Next 7 days: 2 easy runs, 1 longer aerobic run, 1 optional strides/technique day and rest around harder work.')
  return advice
}
function planLabel(level){ return level === 'competitive' ? 'Competitive Builder' : level === 'advanced' ? 'Advanced Performance' : level === 'intermediate' ? 'Intermediate Base' : 'Beginner Safe Start' }

async function requireUser(){
  if(!supabaseClient || !cfg.supabaseUrl || !cfg.supabaseAnonKey){ alert('Supabase env vars are missing on Render.'); return null }
  const { data } = await supabaseClient.auth.getUser()
  sessionUser = data.user
  if(!sessionUser){ show('auth'); return null }
  return sessionUser
}

$('toggleAuth').addEventListener('click', () => {
  authMode = authMode === 'signup' ? 'login' : 'signup'
  $('authTitle').textContent = authMode === 'signup' ? 'Create account' : 'Welcome back'
  $('authSubmit').textContent = authMode === 'signup' ? 'Create account' : 'Login'
  $('toggleAuth').textContent = authMode === 'signup' ? 'Already have an account? Login' : 'Need an account? Sign up'
  setMsg('authMsg','')
})
$('authForm').addEventListener('submit', async (e) => {
  e.preventDefault(); setMsg('authMsg','')
  const email = $('email').value.trim().toLowerCase(); const password = $('password').value
  if(!email || password.length < 8) return setMsg('authMsg','Use a real email and at least 8 characters.')
  const redirectTo = `${location.origin}/#dashboard`
  const res = authMode === 'signup'
    ? await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
    : await supabaseClient.auth.signInWithPassword({ email, password })
  if(res.error) return setMsg('authMsg', res.error.message)
  if(authMode === 'signup') return setMsg('authMsg','Check your email once. Customize Supabase email templates for a professional branded verification email.')
  show('dashboard')
})
$('logoutBtn').addEventListener('click', async () => { await supabaseClient.auth.signOut(); sessionUser=null; profile=null; runs=[]; show('home') })

function renderDayButtons(){
  const box = $('dayButtons'); box.innerHTML = ''
  ;['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(day => {
    const b = document.createElement('button'); b.type='button'; b.className = `ghost ${availableDays.includes(day) ? 'active' : ''}`; b.textContent = day
    b.addEventListener('click', () => { availableDays = availableDays.includes(day) ? availableDays.filter(d=>d!==day) : [...availableDays, day]; renderDayButtons() })
    box.appendChild(b)
  })
}
async function loadProfileForm(){
  const user = await requireUser(); if(!user) return
  await fetchData()
  availableDays = profile?.available_days?.length ? profile.available_days : availableDays
  $('username').value = profile?.username || ''
  $('level').value = profile?.level || 'beginner'
  $('weeklyKm').value = profile?.weekly_km || 20
  $('goalDistance').value = profile?.goal_distance || '10k'
  $('goalTime').value = profile?.goal_time_min || 50
  $('restPreference').value = profile?.rest_preference || '1-2'
  $('notes').value = profile?.notes || ''
  renderDayButtons()
}
$('saveProfile').addEventListener('click', async () => {
  const user = await requireUser(); if(!user) return
  const payload = {
    id: user.id,
    username: sanitizeText($('username').value,32),
    level: $('level').value,
    weekly_km: Number($('weeklyKm').value || 0),
    goal_distance: $('goalDistance').value,
    goal_time_min: Number($('goalTime').value || 0),
    available_days: availableDays,
    rest_preference: $('restPreference').value,
    notes: sanitizeText($('notes').value,300),
    updated_at: new Date().toISOString()
  }
  if(payload.weekly_km < 0 || payload.weekly_km > 220) return setMsg('profileMsg','Weekly km must be realistic.')
  const { error } = await supabaseClient.from('profiles').upsert(payload)
  if(error) return setMsg('profileMsg', error.message)
  setMsg('profileMsg','Saved.'); show('dashboard')
})

$('runImage').addEventListener('change', () => {
  const f = $('runImage').files[0]
  if(!f) return
  if(!allowedTypes.includes(f.type)){ $('runImage').value=''; return setMsg('uploadMsg','Only PNG, JPG and WEBP allowed.') }
  if(f.size > maxFileSize){ $('runImage').value=''; return setMsg('uploadMsg','Image is too large. Max 4 MB.') }
  $('fileName').textContent = f.name
})
$('saveRun').addEventListener('click', async () => {
  const user = await requireUser(); if(!user) return
  setMsg('uploadMsg','')
  const distance = Number($('distance').value); const duration = Number($('duration').value); const avgHr = $('avgHr').value ? Number($('avgHr').value) : null
  if(!distance || distance <= 0 || distance > 100) return setMsg('uploadMsg','Distance must be between 0 and 100 km.')
  if(!duration || duration <= 0 || duration > 900) return setMsg('uploadMsg','Duration must be between 1 and 900 minutes.')
  if(avgHr && (avgHr < 60 || avgHr > 230)) return setMsg('uploadMsg','Heart rate looks unrealistic.')
  let screenshot_path = null
  const file = $('runImage').files[0]
  if(file){
    const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabaseClient.storage.from('run-screenshots').upload(path, file, { cacheControl:'3600', upsert:false })
    if(error) return setMsg('uploadMsg', error.message)
    screenshot_path = path
  }
  const p = formatPace(pace(distance,duration))
  const { error } = await supabaseClient.from('runs').insert({ user_id:user.id, distance_km:distance, duration_min:duration, avg_hr:avgHr, effort:$('effort').value, pace_text:p, screenshot_path, source:file?'screenshot_upload':'manual' })
  if(error) return setMsg('uploadMsg', error.message)
  $('runForm').reset(); $('runImage').value=''; $('fileName').textContent='Drop Garmin / Strava screenshot'; show('dashboard')
})

async function fetchData(){
  const user = await requireUser(); if(!user) return
  const [p, r] = await Promise.all([
    supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabaseClient.from('runs').select('*').eq('user_id', user.id).order('created_at', { ascending:false }).limit(30)
  ])
  profile = p.data || null; runs = r.data || []
}
async function loadDashboard(){
  const user = await requireUser(); if(!user) return
  await fetchData()
  $('profileWarning').classList.toggle('hidden', !!profile)
  $('readiness').textContent = `${readinessScore()}%`
  $('runCount').textContent = runs.length
  $('totalKm').textContent = runs.reduce((a,r)=>a+Number(r.distance_km||0),0).toFixed(1)
  $('streak').textContent = `🔥 ${runs.length}`
  $('planName').textContent = planLabel(profile?.level)
  $('goalLine').textContent = `Goal: ${profile?.goal_distance || 'not set'} · Time: ${profile?.goal_time_min || '—'} min · Available: ${profile?.available_days?.join(', ') || 'not set'}`
  const need = Math.max(0, 3-runs.length)
  $('unlockBox').textContent = need ? `Upload ${need} more run${need===1?'':'s'} to unlock adaptive training.` : 'Adaptive training unlocked.'
  $('adviceList').innerHTML = coachAdvice().map(a=>`<p>${a}</p>`).join('')
  $('runsList').innerHTML = runs.length ? runs.map(r => `<div class="run-row"><b>${Number(r.distance_km).toFixed(2)} km</b><span>${r.pace_text || '—'}</span><span>${r.duration_min} min</span><span>${r.avg_hr ? r.avg_hr+' bpm' : 'no HR'}</span><span>${r.effort}</span></div>`).join('') : '<p>No runs yet. Upload your first Garmin or Strava screenshot.</p>'
}

window.addEventListener('hashchange', () => { const v = location.hash.replace('#','') || 'home'; if($(v)) show(v) })
;(async () => { renderDayButtons(); const initial = location.hash.replace('#','') || 'home'; if(initial === 'dashboard') await loadDashboard(); show($(initial)?initial:'home') })()
