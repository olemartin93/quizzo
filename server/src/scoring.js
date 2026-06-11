// Kahoot-style speed scoring: a correct answer is worth 500-1000 points
// depending on how fast it came in, plus a bonus for consecutive correct answers.

export function scorePoints(timeMs, timeLimitMs) {
  const ratio = Math.min(Math.max(timeMs / timeLimitMs, 0), 1);
  return Math.round(1000 * (1 - ratio / 2));
}

export function streakBonus(streak) {
  return 100 * Math.min(Math.max(streak - 1, 0), 5);
}
