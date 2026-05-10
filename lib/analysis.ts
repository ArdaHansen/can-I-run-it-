export type RunInput = {
  distanceKm: number
  pace: string
  avgHr?: number
  weeklyKm?: number
  longRunKm?: number
  goal: string
}

function paceToSeconds(pace: string) {
  const [m, s] = pace.split(':').map(Number)
  if (!Number.isFinite(m) || !Number.isFinite(s)) return 360
  return m * 60 + s
}

export function analyzeRun(input: RunInput) {
  const paceSec = paceToSeconds(input.pace)
  let score = 45
  if (input.weeklyKm && input.weeklyKm >= 40) score += 10
  if (input.weeklyKm && input.weeklyKm >= 60) score += 12
  if (input.longRunKm && input.longRunKm >= 24) score += 13
  if (input.longRunKm && input.longRunKm >= 30) score += 8
  if (paceSec <= 300) score += 10
  if (paceSec <= 270) score += 10
  if (input.avgHr && input.avgHr > 170) score -= 8
  if (input.distanceKm < 8) score -= 6
  score = Math.max(5, Math.min(96, score))

  const verdict = score >= 80 ? 'Sehr realistisch' : score >= 65 ? 'Realistisch mit sauberem Block' : score >= 50 ? 'Noch wacklig' : 'Aktuell nicht realistisch'
  const next = score >= 70
    ? 'Halte deine Wochenkilometer stabil und baue alle 7–10 Tage eine längere Einheit mit Zielpace-Blöcken ein.'
    : 'Fokus auf Konstanz: 3–5 lockere Läufe pro Woche, ein Longrun und erst danach härtere Tempoeinheiten.'

  return { score, verdict, next }
}
