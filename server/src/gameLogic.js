import { scorePoints, streakBonus } from './scoring.js';

export function publicPlayers(players) {
  return [...players.values()].map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    connected: p.connected,
  }));
}

export function standings(players) {
  return [...players.values()]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      rank: i + 1,
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
    }));
}

/**
 * Scores the current question for every player, mutating each player object
 * (score, streak, lastResult). Returns the public reveal payload and a map of
 * per-player result payloads.
 */
export function computeReveal(question, players, answers) {
  const stats = question.answers.map(() => 0);

  for (const player of players.values()) {
    const answer = answers.get(player.id);
    if (answer) stats[answer.answerIndex] += 1;

    const correct = answer ? answer.answerIndex === question.correctIndex : false;
    let pointsEarned = 0;
    if (correct) {
      player.streak += 1;
      pointsEarned = scorePoints(answer.timeMs, question.timeLimit * 1000) + streakBonus(player.streak);
      player.score += pointsEarned;
    } else {
      player.streak = 0;
    }
    player.lastResult = { answered: Boolean(answer), correct, pointsEarned };
  }

  const ranked = standings(players);
  const results = new Map();
  for (const player of players.values()) {
    const entry = ranked.find((r) => r.id === player.id);
    results.set(player.id, {
      ...player.lastResult,
      streak: player.streak,
      score: player.score,
      rank: entry.rank,
      totalPlayers: ranked.length,
    });
  }

  return { stats, correctIndex: question.correctIndex, results };
}

export function buildPodium(players) {
  const ranked = standings(players);
  return { podium: ranked.slice(0, 3), players: ranked };
}
