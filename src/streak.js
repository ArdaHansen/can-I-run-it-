import { db } from './db.js';

const get = db.prepare('SELECT * FROM streaks WHERE user_id = ?');
const upsert = db.prepare(`INSERT INTO streaks (user_id, current_streak, longest_streak, last_run_date, updated_at)
VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT(user_id) DO UPDATE SET current_streak=excluded.current_streak, longest_streak=excluded.longest_streak, last_run_date=excluded.last_run_date, updated_at=CURRENT_TIMESTAMP`);

function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00Z');
  const d2 = new Date(b + 'T00:00:00Z');
  return Math.round((d2 - d1) / 86400000);
}

export function updateStreak(userId, runDate) {
  const date = runDate || new Date().toISOString().slice(0, 10);
  const s = get.get(userId) || { current_streak: 0, longest_streak: 0, last_run_date: null };
  let current = s.current_streak;
  if (!s.last_run_date) current = 1;
  else {
    const diff = daysBetween(s.last_run_date, date);
    if (diff === 0) current = s.current_streak;
    else if (diff === 1) current = s.current_streak + 1;
    else if (diff > 1) current = 1;
  }
  const longest = Math.max(s.longest_streak, current);
  upsert.run(userId, current, longest, date);
  return { currentStreak: current, longestStreak: longest, lastRunDate: date };
}

export function getStreak(userId) {
  const s = get.get(userId);
  return s ? { currentStreak: s.current_streak, longestStreak: s.longest_streak, lastRunDate: s.last_run_date } : { currentStreak: 0, longestStreak: 0, lastRunDate: null };
}
