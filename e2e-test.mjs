// End-to-end smoke test: simulates a host and two players playing a full game.
// Run with the server already listening on :3000  →  node e2e-test.mjs
import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';
const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};
const assert = (cond, msg) => {
  if (!cond) fail(msg);
  console.log(`✅ ${msg}`);
};

function once(socket, event, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}"`)),
      timeoutMs
    );
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function emitAck(socket, event, payload, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ack of "${event}"`)),
      timeoutMs
    );
    socket.emit(event, payload, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

const quizzes = await fetch(`${URL}/api/quizzes`).then((r) => r.json());
assert(quizzes.length >= 3, `API lists ${quizzes.length} seeded quizzes`);
const quiz = await fetch(`${URL}/api/quizzes/${quizzes[0].id}`).then((r) => r.json());

const host = io(URL);
const alice = io(URL);
const bob = io(URL);

const created = await emitAck(host, 'host:createGame', { quizId: quiz.id });
assert(created.ok && /^\d{6}$/.test(created.pin), `Game created with PIN ${created.pin}`);

const badJoin = await emitAck(alice, 'player:join', { pin: '000000', nickname: 'X', avatar: '🦊' });
assert(!badJoin.ok, `Joining a bad PIN is rejected ("${badJoin.error}")`);

const joinA = await emitAck(alice, 'player:join', { pin: created.pin, nickname: 'Alice', avatar: '🦊' });
assert(joinA.ok, 'Alice joined the lobby');
const [joinB, hostSeesPlayers] = await Promise.all([
  emitAck(bob, 'player:join', { pin: created.pin, nickname: 'Bob', avatar: '🐼' }),
  once(host, 'game:players'),
]);
assert(joinB.ok, 'Bob joined the lobby');
assert(hostSeesPlayers.players.length >= 1, 'Host lobby receives player updates');

const dupJoin = await emitAck(bob, 'player:join', { pin: created.pin, nickname: 'alice', avatar: '🐸' });
assert(!dupJoin.ok, `Duplicate nickname is rejected ("${dupJoin.error}")`);

const started = await emitAck(host, 'host:start', {});
assert(started.ok, 'Host started the game');

for (let q = 0; q < quiz.questions.length; q++) {
  const [question] = await Promise.all([
    once(alice, 'game:question'),
    once(bob, 'game:question'),
    once(host, 'game:question'),
  ]);
  assert(
    question.index === q && question.answers.length >= 2,
    `Q${q + 1}/${question.total} broadcast: "${question.text}"`
  );

  const correct = quiz.questions[q].correctIndex;
  const wrong = (correct + 1) % question.answers.length;
  const resultsPromise = Promise.all([once(alice, 'player:result'), once(bob, 'player:result')]);
  const revealPromise = once(host, 'game:reveal');
  await emitAck(alice, 'player:answer', { answerIndex: correct });
  await emitAck(bob, 'player:answer', { answerIndex: wrong });

  const reveal = await revealPromise;
  assert(
    reveal.correctIndex === correct && reveal.stats[correct] === 1 && reveal.stats[wrong] === 1,
    `Reveal ends early when all answered; stats ${JSON.stringify(reveal.stats)}`
  );
  const [resA, resB] = await resultsPromise;
  assert(resA.correct && resA.pointsEarned >= 500, `Alice +${resA.pointsEarned} (streak ${resA.streak}, rank ${resA.rank})`);
  assert(!resB.correct && resB.pointsEarned === 0, `Bob scored 0 (rank ${resB.rank})`);

  const isLast = q === quiz.questions.length - 1;
  if (isLast) {
    const podiumPromise = once(host, 'game:podium');
    await emitAck(host, 'host:next', {});
    const podium = await podiumPromise;
    assert(
      podium.podium[0].nickname === 'Alice' && podium.podium[1].nickname === 'Bob',
      `Podium: 🥇 ${podium.podium[0].nickname} ${podium.podium[0].score} pts, 🥈 ${podium.podium[1].nickname} ${podium.podium[1].score} pts`
    );
    assert(podium.podium[0].score > 6000, 'Streak bonuses applied (Alice > 6000 pts)');
  } else {
    const lbPromise = once(host, 'game:leaderboard');
    await emitAck(host, 'host:next', {});
    const lb = await lbPromise;
    assert(lb.top[0].nickname === 'Alice', `Leaderboard after Q${q + 1}: Alice leads with ${lb.top[0].score}`);
    await emitAck(host, 'host:next', {});
  }
}

const endedPromise = once(alice, 'game:ended');
host.disconnect();
const ended = await endedPromise;
assert(Boolean(ended.reason), `Players notified when host leaves ("${ended.reason}")`);

console.log('\n🎉 Full game simulation passed!');
alice.disconnect();
bob.disconnect();
process.exit(0);
