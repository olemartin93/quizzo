import crypto from 'node:crypto';
import { Router } from 'express';
import { getQuiz as getQuizDefinition } from './quizStore.js';
import { pusher } from './pusher.js';
import {
  generatePin,
  createGame,
  getMeta,
  saveMeta,
  loadGame,
  setPlayer,
  setAnswer,
  clearAnswers,
  deleteGame,
} from './gameStore.js';
import { publicPlayers, standings, computeReveal, buildPodium } from './gameLogic.js';

const COUNTDOWN_SECONDS = 3;

export const gameRouter = Router();

const broadcastChannel = (pin) => `game-${pin}`;
const hostChannel = (pin, hostToken) => `game-${pin}-host-${hostToken}`;
const playerChannel = (pin, playerId) => `game-${pin}-player-${playerId}`;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * If the current question's time limit has elapsed but the host never called
 * end-question (e.g. their tab closed), finalize it now so the game doesn't
 * get stuck.
 */
async function maybeFinalizeExpired(game) {
  if (game.meta.state === 'question' && Date.now() > game.meta.questionEndsAt) {
    await finalizeQuestion(game);
    return loadGame(game.pin);
  }
  return game;
}

async function finalizeQuestion(game) {
  const { pin, meta, quiz, players, answers } = game;
  if (meta.state !== 'question') return null;

  const question = quiz.questions[meta.questionIndex];
  const { stats, correctIndex, results } = computeReveal(question, players, answers);

  await Promise.all([...players.values()].map((p) => setPlayer(pin, p.id, p)));

  meta.state = 'reveal';
  await saveMeta(pin, meta);

  const reveal = {
    index: meta.questionIndex,
    total: meta.totalQuestions,
    correctIndex,
    stats,
  };

  await pusher.trigger(broadcastChannel(pin), 'reveal', reveal);
  await pusher.triggerBatch(
    [...results.entries()].map(([playerId, payload]) => ({
      channel: playerChannel(pin, playerId),
      name: 'result',
      data: payload,
    }))
  );

  return reveal;
}

gameRouter.post('/create', async (req, res) => {
  const { quizId } = req.body ?? {};
  const quiz = await getQuizDefinition(quizId);
  if (!quiz) return res.json({ ok: false, error: 'Quiz not found' });
  if (quiz.questions.length === 0) return res.json({ ok: false, error: 'Quiz has no questions' });

  const pin = await generatePin();
  const hostToken = crypto.randomUUID();
  await createGame(pin, { quiz, quizTitle: quiz.title, hostToken });

  res.json({ ok: true, pin, hostToken, quizTitle: quiz.title, questionCount: quiz.questions.length });
});

gameRouter.post('/:pin/join', async (req, res) => {
  const { pin } = req.params;
  const { nickname, avatar } = req.body ?? {};

  const meta = await getMeta(pin);
  if (!meta) return res.json({ ok: false, error: 'Game not found. Check the PIN!' });
  if (meta.state !== 'lobby') return res.json({ ok: false, error: 'This game has already started.' });

  const name = String(nickname ?? '').trim().slice(0, 20);
  if (!name) return res.json({ ok: false, error: 'Pick a nickname first!' });

  const game = await loadGame(pin);
  if ([...game.players.values()].some((p) => p.nickname.toLowerCase() === name.toLowerCase()))
    return res.json({ ok: false, error: 'That nickname is taken.' });

  const player = {
    id: crypto.randomUUID(),
    nickname: name,
    avatar: typeof avatar === 'string' && avatar ? avatar : '🙂',
    score: 0,
    streak: 0,
    connected: true,
    lastResult: null,
  };
  await setPlayer(pin, player.id, player);
  game.players.set(player.id, player);

  await pusher.trigger(broadcastChannel(pin), 'players', { players: publicPlayers(game.players) });

  res.json({
    ok: true,
    playerId: player.id,
    nickname: player.nickname,
    avatar: player.avatar,
    quizTitle: meta.quizTitle,
    questionCount: meta.totalQuestions,
  });
});

gameRouter.get('/:pin/state', async (req, res) => {
  const { pin } = req.params;
  const { role, token, playerId } = req.query;

  let game = await loadGame(pin);
  if (!game) return res.json({ ok: false, error: 'Game not found' });

  if (role === 'host' && token !== game.meta.hostToken) {
    return res.json({ ok: false, error: 'Invalid host token' });
  }

  game = await maybeFinalizeExpired(game);
  const { meta, quiz, players, answers } = game;

  const base = {
    ok: true,
    state: meta.state,
    quizTitle: meta.quizTitle,
    questionIndex: meta.questionIndex,
    totalQuestions: meta.totalQuestions,
    players: publicPlayers(players),
  };

  if (meta.state === 'countdown') {
    base.countdown = { index: meta.questionIndex, total: meta.totalQuestions, seconds: COUNTDOWN_SECONDS };
  }

  if (meta.state === 'question') {
    const question = quiz.questions[meta.questionIndex];
    base.question = {
      index: meta.questionIndex,
      total: meta.totalQuestions,
      text: question.text,
      answers: question.answers,
      timeLimit: question.timeLimit,
      startedAt: meta.questionStartedAt,
    };
    if (role === 'host') {
      const connected = [...players.values()].filter((p) => p.connected);
      base.answerCount = { answered: answers.size, total: connected.length };
    }
  }

  if (meta.state === 'reveal') {
    const question = quiz.questions[meta.questionIndex];
    const stats = question.answers.map(() => 0);
    for (const player of players.values()) {
      const answer = answers.get(player.id);
      if (answer) stats[answer.answerIndex] += 1;
    }
    base.reveal = {
      index: meta.questionIndex,
      total: meta.totalQuestions,
      correctIndex: question.correctIndex,
      stats,
    };
    if (role === 'player' && playerId) {
      const player = players.get(playerId);
      if (player?.lastResult) {
        const ranked = standings(players);
        const entry = ranked.find((r) => r.id === playerId);
        base.result = {
          ...player.lastResult,
          streak: player.streak,
          score: player.score,
          rank: entry?.rank,
          totalPlayers: ranked.length,
        };
      }
    }
  }

  if (meta.state === 'leaderboard') {
    base.leaderboard = { top: standings(players).slice(0, 5), index: meta.questionIndex, total: meta.totalQuestions };
  }

  if (meta.state === 'podium') {
    base.podium = buildPodium(players);
  }

  if (meta.state === 'ended') {
    base.ended = { reason: meta.endedReason ?? 'The game has ended.' };
  }

  res.json(base);
});

function asHost(handler) {
  return async (req, res) => {
    const { pin } = req.params;
    const { hostToken } = req.body ?? {};
    const meta = await getMeta(pin);
    if (!meta || meta.hostToken !== hostToken) return res.json({ ok: false, error: 'Forbidden' });
    await handler(req, res, meta);
  };
}

gameRouter.post(
  '/:pin/start',
  asHost(async (req, res, meta) => {
    const { pin } = req.params;
    if (meta.state !== 'lobby') return res.json({ ok: false });

    const game = await loadGame(pin);
    if (game.players.size === 0) return res.json({ ok: false, error: 'No players have joined yet.' });

    meta.questionIndex = 0;
    meta.state = 'countdown';
    meta.countdownEndsAt = Date.now() + COUNTDOWN_SECONDS * 1000;
    await clearAnswers(pin);
    await saveMeta(pin, meta);

    await pusher.trigger(broadcastChannel(pin), 'countdown', {
      index: meta.questionIndex,
      total: meta.totalQuestions,
      seconds: COUNTDOWN_SECONDS,
    });

    res.json({ ok: true });
  })
);

gameRouter.post(
  '/:pin/begin-question',
  asHost(async (req, res, meta) => {
    const { pin } = req.params;
    if (meta.state !== 'countdown') return res.json({ ok: false });

    const game = await loadGame(pin);
    const question = game.quiz.questions[meta.questionIndex];

    meta.state = 'question';
    meta.questionStartedAt = Date.now();
    meta.questionEndsAt = meta.questionStartedAt + question.timeLimit * 1000;
    await saveMeta(pin, meta);

    await pusher.trigger(broadcastChannel(pin), 'question', {
      index: meta.questionIndex,
      total: meta.totalQuestions,
      text: question.text,
      answers: question.answers,
      timeLimit: question.timeLimit,
      startedAt: meta.questionStartedAt,
    });

    res.json({ ok: true });
  })
);

gameRouter.post('/:pin/answer', async (req, res) => {
  const { pin } = req.params;
  const { playerId, answerIndex } = req.body ?? {};

  const game = await loadGame(pin);
  if (!game) return res.json({ ok: false, error: 'Game not found' });

  if (game.meta.state === 'question' && Date.now() > game.meta.questionEndsAt) {
    await finalizeQuestion(game);
    return res.json({ ok: false, error: "Time's up!" });
  }

  if (game.meta.state !== 'question') return res.json({ ok: false, error: 'No question in progress' });

  const player = game.players.get(playerId);
  if (!player) return res.json({ ok: false, error: 'Unknown player' });
  if (game.answers.has(playerId)) return res.json({ ok: false, error: 'Already answered' });

  const question = game.quiz.questions[game.meta.questionIndex];
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.answers.length)
    return res.json({ ok: false, error: 'Invalid answer' });

  const timeMs = clamp(Date.now() - game.meta.questionStartedAt, 0, question.timeLimit * 1000);
  await setAnswer(pin, playerId, { answerIndex, timeMs });
  game.answers.set(playerId, { answerIndex, timeMs });

  const connectedPlayers = [...game.players.values()].filter((p) => p.connected);
  await pusher.trigger(hostChannel(pin, game.meta.hostToken), 'answerCount', {
    answered: game.answers.size,
    total: connectedPlayers.length,
  });

  if (connectedPlayers.every((p) => game.answers.has(p.id))) {
    await finalizeQuestion(game);
  }

  res.json({ ok: true });
});

gameRouter.post(
  '/:pin/end-question',
  asHost(async (req, res) => {
    const { pin } = req.params;
    const game = await loadGame(pin);
    const reveal = await finalizeQuestion(game);
    if (!reveal) return res.json({ ok: false });
    res.json({ ok: true, reveal });
  })
);

gameRouter.post(
  '/:pin/next',
  asHost(async (req, res, meta) => {
    const { pin } = req.params;
    const game = await loadGame(pin);

    if (meta.state === 'reveal') {
      const isLast = meta.questionIndex >= meta.totalQuestions - 1;
      if (isLast) {
        meta.state = 'podium';
        await saveMeta(pin, meta);
        const podium = buildPodium(game.players);
        await pusher.trigger(broadcastChannel(pin), 'podium', podium);
        return res.json({ ok: true });
      }

      meta.state = 'leaderboard';
      await saveMeta(pin, meta);
      const leaderboard = {
        top: standings(game.players).slice(0, 5),
        index: meta.questionIndex,
        total: meta.totalQuestions,
      };
      await pusher.trigger(broadcastChannel(pin), 'leaderboard', leaderboard);
      return res.json({ ok: true });
    }

    if (meta.state === 'leaderboard') {
      meta.questionIndex += 1;
      meta.state = 'countdown';
      meta.countdownEndsAt = Date.now() + COUNTDOWN_SECONDS * 1000;
      await clearAnswers(pin);
      await saveMeta(pin, meta);
      await pusher.trigger(broadcastChannel(pin), 'countdown', {
        index: meta.questionIndex,
        total: meta.totalQuestions,
        seconds: COUNTDOWN_SECONDS,
      });
      return res.json({ ok: true });
    }

    res.json({ ok: false });
  })
);

gameRouter.post(
  '/:pin/end',
  asHost(async (req, res, meta) => {
    const { pin } = req.params;
    const { reason } = req.body ?? {};
    meta.state = 'ended';
    meta.endedReason = reason ?? 'The host ended the game.';
    await saveMeta(pin, meta);

    await pusher.trigger(broadcastChannel(pin), 'ended', { reason: meta.endedReason });
    await deleteGame(pin);

    res.json({ ok: true });
  })
);
