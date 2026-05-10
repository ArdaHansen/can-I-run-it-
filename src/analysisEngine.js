function paceToSec(pace) {
  if (!pace) return null;
  if (typeof pace === 'number') return Math.round(pace);
  const m = String(pace).match(/(\d{1,2})[:.](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function goalPaceSec(goalDistance, goalTimeMin) {
  const km = goalDistance === 'marathon' ? 42.195 : goalDistance === 'half' ? 21.0975 : Number(goalDistance);
  return Math.round((goalTimeMin * 60) / km);
}

function formatPace(sec) {
  if (!sec) return 'n/a';
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s} min/km`;
}

function estimateRaceTimeFromRun(distanceKm, durationMin, targetKm) {
  if (!distanceKm || !durationMin || distanceKm < 1) return null;
  const exponent = 1.06;
  return durationMin * Math.pow(targetKm / distanceKm, exponent);
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export function normalizeRun(raw = {}) {
  return {
    date: raw.date || new Date().toISOString().slice(0, 10),
    distanceKm: Number(raw.distanceKm || raw.distance_km || 0) || null,
    durationMin: Number(raw.durationMin || raw.duration_min || 0) || null,
    avgPaceSec: paceToSec(raw.avgPaceSec || raw.avg_pace_sec || raw.pace) || null,
    avgHr: Number(raw.avgHr || raw.avg_hr || 0) || null,
    elevationM: Number(raw.elevationM || raw.elevation_m || 0) || null,
    cadence: Number(raw.cadence || 0) || null,
    notes: String(raw.notes || '').slice(0, 500)
  };
}

export function analyzeGoal({ latestRun, recentRuns = [], goalDistance, goalTimeMin }) {
  const targetKm = goalDistance === 'marathon' ? 42.195 : goalDistance === 'half' ? 21.0975 : 10;
  const gp = goalPaceSec(goalDistance, goalTimeMin);
  const runs = [latestRun, ...recentRuns].filter(Boolean);
  const bestLong = Math.max(...runs.map(r => r.distanceKm || 0), 0);
  const totalKm14d = runs.reduce((a, r) => a + (r.distanceKm || 0), 0);
  const avgKm = runs.length ? totalKm14d / Math.min(2, Math.max(1, runs.length / 7)) : 0;
  const est = latestRun ? estimateRaceTimeFromRun(latestRun.distanceKm, latestRun.durationMin, targetKm) : null;
  const estGap = est ? (est - goalTimeMin) : 30;

  let score = 50;
  score += clamp((bestLong / targetKm) * 25, 0, 25);
  score += clamp((avgKm / (goalDistance === 'marathon' ? 65 : 35)) * 20, 0, 20);
  if (latestRun?.avgPaceSec) score += clamp(((gp + 60 - latestRun.avgPaceSec) / 60) * 15, -15, 15);
  if (est) score += clamp((-estGap / 20) * 20, -20, 20);
  if (latestRun?.avgHr && latestRun.avgHr > 170) score -= 6;
  score = clamp(Math.round(score), 5, 98);

  const probability = clamp(Math.round(score * 0.9 + (estGap < 0 ? 8 : -Math.min(estGap, 40) * 0.7)), 1, 97);
  const verdict = probability >= 75 ? 'Realistisch, wenn du gesund bleibst.' : probability >= 50 ? 'Machbar, aber noch nicht stabil abgesichert.' : 'Aktuell eher zu aggressiv.';
  const weaknesses = [];
  if (goalDistance === 'marathon' && bestLong < 26) weaknesses.push('Longruns sind für Marathon-Ziel noch zu kurz. Ziel: schrittweise 28–32 km.' );
  if (avgKm < (goalDistance === 'marathon' ? 45 : 25)) weaknesses.push('Wochenumfang wirkt noch dünn für dein Ziel. Erst Konstanz, dann mehr Tempo.' );
  if (latestRun?.avgPaceSec && latestRun.avgPaceSec > gp + 35) weaknesses.push(`Dein letzter Lauf liegt deutlich über Zielpace (${formatPace(gp)}). Tempoausdauer fehlt noch.`);
  if (latestRun?.avgHr && latestRun.avgHr > 170) weaknesses.push('Herzfrequenz war hoch. Das Ziel darf nicht nur über Härte, sondern über stabile Aerobic kommen.');
  if (!weaknesses.length) weaknesses.push('Die Basis sieht solide aus. Jetzt zählt spezifisches Training und Verletzungsfreiheit.');

  const nextWorkouts = goalDistance === 'marathon'
    ? ['Easy Run 8–12 km in Zone 2', 'Marathon-Pace Block: 3 × 4 km in Zielpace mit 1 km locker', 'Longrun 24–30 km ruhig, letzte 5 km kontrolliert']
    : ['Easy Run 6–10 km', 'Schwelle: 4 × 8 min hart-kontrolliert', 'Longrun 14–18 km locker'];

  return {
    readinessScore: score,
    probability,
    verdict,
    goalPace: formatPace(gp),
    estimatedTimeMin: est ? Math.round(est) : null,
    weaknesses,
    nextWorkouts,
    disclaimer: 'Keine medizinische Beratung. Bei Schmerzen, Krankheit oder Verletzungszeichen Training reduzieren und Fachperson fragen.'
  };
}
