function clamp(n, min, max) { return Math.max(min, Math.min(max, Number(n) || 0)); }
function goalMinutes(profile = {}) {
  return (Number(profile.goal_time_hour || 0) * 60) + Number(profile.goal_time_min || 0);
}
function paceFrom(distanceKm, durationMin) {
  const d = Number(distanceKm); const m = Number(durationMin);
  if (!d || !m) return '';
  const p = m / d;
  const min = Math.floor(p); const sec = Math.round((p - min) * 60).toString().padStart(2,'0');
  return `${min}:${sec}/km`;
}
function analyzeRun(run, profile = {}, allRuns = []) {
  const distance = Number(run.distance_km || 0);
  const duration = Number(run.duration_min || 0);
  const hr = Number(run.avg_hr || 0);
  const effort = Number(run.effort || 5);
  const weeklyKm = Number(profile.weekly_km || 0);
  const level = profile.level || 'Beginner';
  const goal = profile.goal_distance || 'Marathon';
  let score = 45;
  if (distance >= 18 && goal === 'Marathon') score += 18;
  if (distance >= 10) score += 10;
  if (weeklyKm >= 60) score += 15; else if (weeklyKm >= 35) score += 8; else if (weeklyKm < 20) score -= 8;
  if (hr && hr > 170 && effort <= 5) score -= 10;
  if (effort >= 8) score -= 4;
  if (allRuns.length >= 3) score += 8;
  if (level === 'Advanced' || level === 'Competitive') score += 6;
  score = clamp(Math.round(score), 5, 96);
  const insights = [];
  if (allRuns.length < 3) insights.push(`Lade noch ${3 - allRuns.length} Lauf/Läufe hoch, dann kann Can I Run It echte Trainingsvorschläge erzeugen.`);
  if (distance < 8 && goal === 'Marathon') insights.push('Für ein Marathonziel fehlen noch längere aerobe Läufe. Baue zuerst sichere Longruns auf.');
  if (hr && hr > 165 && effort <= 5) insights.push('Deine Herzfrequenz wirkt für einen lockeren Lauf hoch. Nächste Einheit lieber ruhiger laufen.');
  if (weeklyKm < 25) insights.push('Dein Wochenumfang ist noch niedrig. Mehr Konstanz bringt mehr als harte Einzeltrainings.');
  if (!insights.length) insights.push('Solider Lauf. Der nächste Schritt ist mehr Struktur statt einfach mehr Härte.');
  const suggestion = allRuns.length >= 3
    ? buildPlan(profile, allRuns)
    : [{ day: 'Next run', title: 'Easy Run', detail: '30–45 min locker, ohne Pace-Druck. Ziel: sauber Daten sammeln.' }];
  return { readiness_score: score, pace_text: run.pace_text || paceFrom(distance, duration), insights, suggestion };
}
function buildPlan(profile = {}, runs = []) {
  const days = Array.isArray(profile.available_days) && profile.available_days.length ? profile.available_days : ['Mon','Wed','Sat'];
  const level = profile.level || 'Beginner';
  const goal = profile.goal_distance || 'Marathon';
  const easy = level === 'Beginner' ? '30–40 min easy' : '45–60 min easy';
  const quality = level === 'Beginner' ? '6 × 1 min zügig, dazwischen 2 min locker' : '3 × 8 min kontrolliert zügig, 3 min locker';
  const longrun = goal === 'Marathon' ? (level === 'Beginner' ? '70–90 min locker' : '90–120 min locker') : '55–75 min locker';
  return [
    { day: days[0] || 'Mon', title: 'Easy Base', detail: easy },
    { day: days[1] || 'Wed', title: 'Controlled Quality', detail: quality },
    { day: days[2] || 'Sat', title: 'Long Run', detail: longrun }
  ];
}
module.exports = { analyzeRun, buildPlan, paceFrom };
