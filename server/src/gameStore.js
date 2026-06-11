import { redis } from './redis.js';

const TTL_SECONDS = 4 * 60 * 60; // 4 hours

const metaKey = (pin) => `game:${pin}:meta`;
const quizKey = (pin) => `game:${pin}:quiz`;
const playersKey = (pin) => `game:${pin}:players`;
const answersKey = (pin) => `game:${pin}:answers`;

async function touch(pin) {
  await Promise.all([
    redis.expire(metaKey(pin), TTL_SECONDS),
    redis.expire(quizKey(pin), TTL_SECONDS),
    redis.expire(playersKey(pin), TTL_SECONDS),
    redis.expire(answersKey(pin), TTL_SECONDS),
  ]);
}

export async function generatePin() {
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (await redis.exists(metaKey(pin)));
  return pin;
}

export async function createGame(pin, { quiz, quizTitle, hostToken }) {
  const meta = {
    quizId: quiz.id,
    quizTitle,
    totalQuestions: quiz.questions.length,
    hostToken,
    state: 'lobby',
    questionIndex: -1,
    questionStartedAt: null,
    questionEndsAt: null,
    countdownEndsAt: null,
  };
  await redis.set(metaKey(pin), JSON.stringify(meta));
  await redis.set(quizKey(pin), JSON.stringify(quiz));
  await touch(pin);
  return meta;
}

export async function getMeta(pin) {
  const raw = await redis.get(metaKey(pin));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function saveMeta(pin, meta) {
  await redis.set(metaKey(pin), JSON.stringify(meta));
  await touch(pin);
}

export async function getQuiz(pin) {
  const raw = await redis.get(quizKey(pin));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function getPlayers(pin) {
  const raw = await redis.hgetall(playersKey(pin));
  const players = new Map();
  if (!raw) return players;
  for (const [id, value] of Object.entries(raw)) {
    players.set(id, typeof value === 'string' ? JSON.parse(value) : value);
  }
  return players;
}

export async function getPlayer(pin, playerId) {
  const raw = await redis.hget(playersKey(pin), playerId);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function setPlayer(pin, playerId, player) {
  await redis.hset(playersKey(pin), { [playerId]: JSON.stringify(player) });
  await touch(pin);
}

export async function deletePlayer(pin, playerId) {
  await redis.hdel(playersKey(pin), playerId);
}

export async function getAnswers(pin) {
  const raw = await redis.hgetall(answersKey(pin));
  const answers = new Map();
  if (!raw) return answers;
  for (const [id, value] of Object.entries(raw)) {
    answers.set(id, typeof value === 'string' ? JSON.parse(value) : value);
  }
  return answers;
}

export async function setAnswer(pin, playerId, answer) {
  await redis.hset(answersKey(pin), { [playerId]: JSON.stringify(answer) });
  await touch(pin);
}

export async function clearAnswers(pin) {
  await redis.del(answersKey(pin));
}

export async function deleteGame(pin) {
  await Promise.all([
    redis.del(metaKey(pin)),
    redis.del(quizKey(pin)),
    redis.del(playersKey(pin)),
    redis.del(answersKey(pin)),
  ]);
}

/**
 * Loads the full game snapshot: meta, quiz, players, and answers for the
 * current question. Returns null if the game doesn't exist.
 */
export async function loadGame(pin) {
  const meta = await getMeta(pin);
  if (!meta) return null;
  const [quiz, players, answers] = await Promise.all([
    getQuiz(pin),
    getPlayers(pin),
    getAnswers(pin),
  ]);
  return { pin, meta, quiz, players, answers };
}
