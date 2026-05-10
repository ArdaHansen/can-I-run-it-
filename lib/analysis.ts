export type RunInput = {
  distance: number;
  duration: string;
  pace: string;
  avgHr?: number | null;
  weeklyKm?: number | null;
  goalDistance: '5K' | '10K' | 'HALF' | 'MARATHON';
  goalTime: string;
};

function paceToSeconds(pace: string): number {
  const parts = pace.split(':').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return 0;
  return parts[0] * 60 + parts[1];
}

function timeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

const goalKm = { '5K': 5, '10K': 10, HALF: 21.0975, MARATHON: 42.195 } as const;

export function analyzeRun(input: RunInput) {
  const paceSec = paceToSeconds(input.pace);
  const targetSec = timeToSeconds(input.goalTime);
  const targetPace = targetSec && goalKm[input.goalDistance] ? targetSec / goalKm[input.goalDistance] : 0;
  const weekly = input.weeklyKm ?? 0;

  let score = 48;
  if (paceSec && targetPace) {
    const ratio = targetPace / paceSec;
    score += Math.round((ratio - 0.85) * 75);
  }
  if (input.distance >= goalKm[input.goalDistance] * 0.55) score += 15;
  else if (input.distance >= goalKm[input.goalDistance] * 0.35) score += 8;

  if (input.goalDistance === 'MARATHON') {
    if (weekly >= 70) score += 16;
    else if (weekly >= 50) score += 10;
    else if (weekly >= 35) score += 4;
    else score -= 8;
  } else if (weekly >= 30) score += 8;

  if (input.avgHr && input.avgHr > 175 && input.pace) score -= 8;
  score = Math.max(5, Math.min(96, score));

  const verdict = score >= 80 ? 'Sehr realistisch' : score >= 62 ? 'Realistisch mit sauberem Training' : score >= 45 ? 'Möglich, aber noch nicht stabil' : 'Aktuell eher zu aggressiv';
  const weaknesses: string[] = [];
  if (input.goalDistance === 'MARATHON' && weekly < 50) weaknesses.push('Mehr konstante Wochenkilometer aufbauen');
  if (input.distance < goalKm[input.goalDistance] * 0.45) weaknesses.push('Längere Läufe fehlen noch');
  if (paceSec > targetPace * 1.18) weaknesses.push('Tempoausdauer gezielt verbessern');
  if (input.avgHr && input.avgHr > 170) weaknesses.push('Easy Runs ruhiger halten, damit die aerobe Basis besser wird');
  if (!weaknesses.length) weaknesses.push('Konstanz halten und Belastung nicht zu schnell steigern');

  const nextWorkout = score >= 75
    ? 'Nächste Einheit: 10–14 km locker mit 4 × 20 Sekunden Strides.'
    : score >= 55
      ? 'Nächste Einheit: 45–60 Minuten Zone 2, danach Mobility. Kein Ego-Tempo.'
      : 'Nächste Einheit: 30–45 Minuten sehr locker. Erst Basis stabilisieren.';

  return { score, verdict, weaknesses, nextWorkout };
}
