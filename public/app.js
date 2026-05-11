let sb = null;
let session = null;
const $ = (id) => document.getElementById(id);
const msg = (id, text, bad=false) => { const el=$(id); el.textContent=text; el.style.color=bad?'#ff7a7a':'#38d5ff'; };
async function boot(){
  const cfg = await fetch('/api/config').then(r=>r.json());
  if(!cfg.supabaseUrl || !cfg.anonKey){ msg('authMsg','Server env vars missing. Add SUPABASE_URL and SUPABASE_ANON_KEY in Render.', true); return; }
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.anonKey);
  const s = await sb.auth.getSession(); session = s.data.session;
  if(session) showApp();
}
async function showApp(){ $('hero').classList.add('hidden'); $('app').classList.remove('hidden'); $('logoutBtn').classList.remove('hidden'); await loadDashboard(); }
async function authHeaders(){ const s = await sb.auth.getSession(); session=s.data.session; return { Authorization:`Bearer ${session.access_token}`}; }
$('signupBtn').onclick = async()=>{ const {error}=await sb.auth.signUp({email:$('email').value,password:$('password').value}); msg('authMsg', error?error.message:'Account created. Check your email confirmation link.', !!error); };
$('loginBtn').onclick = async()=>{ const {data,error}=await sb.auth.signInWithPassword({email:$('email').value,password:$('password').value}); if(error) return msg('authMsg',error.message,true); session=data.session; showApp(); };
$('logoutBtn').onclick = async()=>{ await sb.auth.signOut(); location.reload(); };
$('profileForm').onsubmit = async(e)=>{ e.preventDefault(); const fd=new FormData(e.target); const body=Object.fromEntries(fd.entries()); body.available_days=String(body.available_days||'').split(',').map(x=>x.trim()).filter(Boolean); const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json',...(await authHeaders())},body:JSON.stringify(body)}); const j=await r.json(); if(!r.ok) return msg('profileMsg',j.error,true); msg('profileMsg','Profile saved.'); loadDashboard(); };
$('runForm').onsubmit = async(e)=>{ e.preventDefault(); const fd=new FormData(e.target); const r=await fetch('/api/runs',{method:'POST',headers:await authHeaders(),body:fd}); const j=await r.json(); if(!r.ok) return msg('runMsg',j.error,true); msg('runMsg','Run analyzed.'); renderCoach(j.analysis); e.target.reset(); loadDashboard(); };
async function loadDashboard(){ const r=await fetch('/api/dashboard',{headers:await authHeaders()}); const j=await r.json(); if(!r.ok){ $('coach').innerHTML=`<p class="muted">${j.error}</p>`; return; } const runs=j.runs||[]; $('runCount').textContent=runs.length; $('streak').textContent=`${j.profile?.streak||0}🔥`; const score=runs[0]?.readiness_score||0; $('readiness').textContent=`${score}%`; $('planLock').textContent=j.canPlan?'Training plan unlocked':'Upload 3 runs to unlock plans'; if(runs[0]?.analysis) renderCoach(runs[0].analysis); renderRuns(runs); }
function renderCoach(a){ if(!a){$('coach').innerHTML='<p class="muted">Upload a run to get coaching output.</p>';return;} const insights=a.insights||[]; const suggestions=a.suggestion||[]; $('coach').innerHTML=`<div class="coachCard"><strong>Readiness ${a.readiness_score}%</strong><p class="muted">Estimated pace: ${a.pace_text||'unknown'}</p></div>${insights.map(x=>`<div class="coachCard">${escapeHtml(x)}</div>`).join('')}<h3>Next Suggestions</h3>${suggestions.map(s=>`<div class="coachCard"><strong>${escapeHtml(s.day)} · ${escapeHtml(s.title)}</strong><p class="muted">${escapeHtml(s.detail)}</p></div>`).join('')}`; }
function renderRuns(runs){ $('runs').innerHTML = runs.length ? runs.map(r=>`<div class="runItem"><div><strong>${r.distance_km||0} km · ${r.pace_text||''}</strong><p class="muted">${new Date(r.created_at).toLocaleDateString()} · ${r.run_type||'Run'}</p></div><strong>${r.readiness_score||0}%</strong></div>`).join('') : '<p class="muted">No runs yet.</p>'; }
function escapeHtml(v){return String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
boot();
