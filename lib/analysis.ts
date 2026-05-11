export type RunInput = {
  distanceKm: number
  pace: string
  avgHr?: number
  weeklyKm?: number
  longRunKm?: number
  goal: string
}

function paceToSeconds(pace: string): number {
  if (!pace || typeof pace !== 'string') return 360
  const parts = pace.split(':').map(p => String(p).trim())
  if (parts.length !== 2) return 360
  const m = Number(parts[0])
  const s = Number(parts[1])
  if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s >= 60) return 360
  return m * 60 + s
}

export function analyzeRun(input: RunInput) {
  // Validierung
  if (!input || typeof input !== 'object') return { score: 0, verdict: 'Ungültige Eingabe', next: 'Bitte alle Felder korrekt ausfüllen.' }
  
  const distance = Number(input.distanceKm) || 0
  const paceSec = paceToSeconds(input.pace)
  const weeklyKm = Number(input.weeklyKm) || 0
  const longRunKm = Number(input.longRunKm) || 0
  const avgHr = Number(input.avgHr) || 0
  const goal = String(input.goal || '').trim()

  if (distance <= 0 || distance > 300) return { score: 0, verdict: 'Ungültige Distanz', next: 'Distanz muss zwischen 0.1 und 300 km liegen.' }
  if (!goal) return { score: 0, verdict: 'Kein Ziel', next: 'Bitte definiere dein Trainingsziel.' }

  // Score-Berechnung (0-100)
  let score = 45

  // Wochenumfang
  if (weeklyKm >= 40) score += 10
  if (weeklyKm >= 60) score += 12
  if (weeklyKm >= 80) score += 8

  // Longruns
  if (longRunKm >= 24) score += 13
  if (longRunKm >= 30) score += 8
  if (longRunKm >= 36) score += 5

  // Pace (schneller ist besser, aber abhängig vom Ziel)
  const isMarathon = goal.toLowerCase().includes('marathon')
  const targetPace = isMarathon ? 300 : 240
  
  if (paceSec <= targetPace) score += 10
  if (paceSec <= targetPace - 30) score += 10
  if (paceSec <= targetPace - 60) score += 8

  // Herzfrequenz - zu hoch ist schlecht (Übertraining)
  if (avgHr > 170) score -= 8
  if (avgHr > 180) score -= 5

  // Distanz des Laufs - zu kurz ist problematisch
  if (distance < 8) score -= 6
  if (distance < 5) score -= 8

  // Clamp score zwischen 5 und 95
  score = Math.max(5, Math.min(95, Math.round(score)))

  // Verdict basierend auf Score
  const verdict = 
    score >= 80 ? 'Sehr realistisch' : 
    score >= 65 ? 'Realistisch mit sauberem Block' : 
    score >= 50 ? 'Noch wacklig' : 
    'Aktuell nicht realistisch'

  // Nächste Schritte
  const next = 
    score >= 70
      ? 'Halte deine Wochenkilometer stabil und baue alle 7–10 Tage eine längere Einheit mit Zielpace-Blöcken ein.'
      : score >= 50
      ? 'Fokus auf Konstanz: 3–5 lockere Läufe pro Woche, ein Longrun und erst danach härtere Tempoeinheiten.'
      : 'Starte mit einer stabilen Basis: 25–35 km pro Woche locker laufen, dann systematisch aufbauen.'

  return { score, verdict, next }
}
