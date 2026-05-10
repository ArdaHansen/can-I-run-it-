let csrfToken = '';
const $ = (s) => document.querySelector(s);
const authPanel = $('#authPanel');
const analyzePanel = $('#analyzePanel');
const result = $('#result');
const resultEmpty = $('#resultEmpty');
const logoutBtn = $('#logoutBtn');

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(options.method || 'GET')) headers['CSRF-Token'] = csrfToken;
  const res = await fetch(path, { ...options, headers, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function initCsrf() {
  const data = await fetch('/api/csrf', { credentials: 'same-origin' }).then(r => r.json());
  csrfToken = data.csrfToken;
}

function setAuthed(me) {
  authPanel.classList.add('hidden');
  analyzePanel.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  updateStreak(me.streak || { currentStreak: 0 });
}

function updateStreak(streak) {
  $('#streakBadge').textContent = `🔥 ${streak.currentStreak || 0} Tage`;
}

function minsToTime(min) {
  if (!min) return 'n/a';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}:${String(m).padStart(2,'0')} h` : `${m} min`;
}

function renderAnalysis(data) {
  const r = data.result;
  resultEmpty.classList.add('hidden');
  result.classList.remove('hidden');
  updateStreak(data.streak);
  result.innerHTML = `
    <p class="verdict"><strong>${r.verdict}</strong></p>
    <div class="metric">
      <div><span>Readiness</span><strong>${r.readinessScore}</strong></div>
      <div><span>Wahrscheinlichkeit</span><strong>${r.probability}%</strong></div>
    </div>
    <div class="metric">
      <div><span>Zielpace</span><strong style="font-size:22px">${r.goalPace}</strong></div>
      <div><span>Schätzung</span><strong style="font-size:22px">${minsToTime(r.estimatedTimeMin)}</strong></div>
    </div>
    <h3>Was noch fehlt</h3>
    <ul>${r.weaknesses.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
    <h3>Nächste Einheiten</h3>
    <ul>${r.nextWorkouts.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
    <p class="muted small">${escapeHtml(r.disclaimer)}</p>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function showError(form, message) {
  form.querySelector('.error')?.remove();
  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = message;
  form.appendChild(p);
}

document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  $('#manualForm').classList.toggle('hidden', tab.dataset.tab !== 'manual');
  $('#screenshotForm').classList.toggle('hidden', tab.dataset.tab !== 'screenshot');
});

$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mode = e.submitter.dataset.mode;
  const body = Object.fromEntries(new FormData(e.currentTarget));
  try {
    const data = await api(`/api/${mode}`, { method: 'POST', body: JSON.stringify(body) });
    setAuthed({ user: data.user, streak: { currentStreak: 0 } });
  } catch (err) { showError(e.currentTarget, err.message); }
});

$('#manualForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = Object.fromEntries(new FormData(e.currentTarget));
  const numeric = ['distanceKm','durationMin','avgHr','elevationM','goalTimeMin'];
  numeric.forEach(k => { if (raw[k] === '') raw[k] = null; else raw[k] = Number(raw[k]); });
  try {
    const data = await api('/api/analyze/manual', { method: 'POST', body: JSON.stringify(raw) });
    renderAnalysis(data);
  } catch (err) { showError(e.currentTarget, err.message); }
});

$('#screenshotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  try {
    const data = await api('/api/analyze/screenshot', { method: 'POST', body: fd, headers: { 'CSRF-Token': csrfToken } });
    renderAnalysis(data);
  } catch (err) { showError(e.currentTarget, err.message); }
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: '{}' });
  location.reload();
});

(async function boot(){
  await initCsrf();
  try { setAuthed(await api('/api/me')); } catch { /* not logged in */ }
})();
