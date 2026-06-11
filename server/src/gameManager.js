import crypto from 'node:crypto';
import { getQuiz } from './quizStore.js';
import { scorePoints, streakBonus } from './scoring.js';

const COUNTDOWN_SECONDS = 3;

export function createGameManager(io) {
  /** @type {Map<string, Game>} pin -> game */
  const games = new Map();

  function generatePin() {
    let pin;
    do {
      pin = String(Math.floor(100000 + Math.random() * 900000));
    } while (games.has(pin));
    return pin;
  }

  const roomOf = (game) => `game:${game.pin}`;

  function publicPlayers(game) {
    return [...game.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      connected: p.connected,
    }));
  }

  function standings(game) {
    return [...game.players.values()]
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

  function emitPlayers(game) {
    io.to(roomOf(game)).emit('game:players', { players: publicPlayers(game) });
  }

  function startQuestion(game, index) {
    game.questionIndex = index;
    game.answers = new Map();
    game.state = 'countdown';
    const question = game.quiz.questions[index];
    io.to(roomOf(game)).emit('game:countdown', {
      index,
      total: game.quiz.questions.length,
      seconds: COUNTDOWN_SECONDS,
    });
    game.timer = setTimeout(() => {
      game.state = 'question';
      game.questionStartedAt = Date.now();
      io.to(roomOf(game)).emit('game:question', {
        index,
        total: game.quiz.questions.length,
        text: question.text,
        answers: question.answers,
        timeLimit: question.timeLimit,
      });
      game.timer = setTimeout(() => endQuestion(game), question.timeLimit * 1000);
    }, COUNTDOWN_SECONDS * 1000);
  }

  function endQuestion(game) {
    if (game.state !== 'question') return;
    clearTimeout(game.timer);
    game.state = 'reveal';

    const question = game.quiz.questions[game.questionIndex];
    const stats = question.answers.map(() => 0);

    for (const player of game.players.values()) {
      const answer = game.answers.get(player.id);
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

    const ranked = standings(game);
    io.to(roomOf(game)).emit('game:reveal', {
      index: game.questionIndex,
      total: game.quiz.questions.length,
      correctIndex: question.correctIndex,
      stats,
    });

    // Each player gets a private result with their score and rank.
    for (const player of game.players.values()) {
      const entry = ranked.find((r) => r.id === player.id);
      io.to(player.socketId).emit('player:result', {
        ...player.lastResult,
        streak: player.streak,
        score: player.score,
        rank: entry.rank,
        totalPlayers: ranked.length,
      });
    }
  }

  function showPodium(game) {
    game.state = 'podium';
    const ranked = standings(game);
    io.to(roomOf(game)).emit('game:podium', {
      podium: ranked.slice(0, 3),
      players: ranked,
    });
  }

  function endGame(game, reason) {
    clearTimeout(game.timer);
    games.delete(game.pin);
    io.to(roomOf(game)).emit('game:ended', { reason });
    io.in(roomOf(game)).socketsLeave(roomOf(game));
  }

  function handleConnection(socket) {
    socket.on('host:createGame', ({ quizId } = {}, ack) => {
      const quiz = getQuiz(quizId);
      if (!quiz) return ack?.({ ok: false, error: 'Quiz not found' });
      if (quiz.questions.length === 0) return ack?.({ ok: false, error: 'Quiz has no questions' });

      const game = {
        pin: generatePin(),
        quiz,
        hostSocketId: socket.id,
        players: new Map(),
        state: 'lobby',
        questionIndex: -1,
        answers: new Map(),
        timer: null,
      };
      games.set(game.pin, game);
      socket.data.role = 'host';
      socket.data.pin = game.pin;
      socket.join(roomOf(game));
      ack?.({ ok: true, pin: game.pin, quizTitle: quiz.title, questionCount: quiz.questions.length });
    });

    socket.on('player:join', ({ pin, nickname, avatar } = {}, ack) => {
      const game = games.get(String(pin ?? '').trim());
      if (!game) return ack?.({ ok: false, error: 'Game not found. Check the PIN!' });
      if (game.state !== 'lobby') return ack?.({ ok: false, error: 'This game has already started.' });

      const name = String(nickname ?? '').trim().slice(0, 20);
      if (!name) return ack?.({ ok: false, error: 'Pick a nickname first!' });
      if ([...game.players.values()].some((p) => p.nickname.toLowerCase() === name.toLowerCase()))
        return ack?.({ ok: false, error: 'That nickname is taken.' });

      const player = {
        id: crypto.randomUUID(),
        socketId: socket.id,
        nickname: name,
        avatar: typeof avatar === 'string' && avatar ? avatar : '🙂',
        score: 0,
        streak: 0,
        connected: true,
        lastResult: null,
      };
      game.players.set(player.id, player);
      socket.data.role = 'player';
      socket.data.pin = game.pin;
      socket.data.playerId = player.id;
      socket.join(roomOf(game));

      ack?.({
        ok: true,
        playerId: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        quizTitle: game.quiz.title,
        questionCount: game.quiz.questions.length,
      });
      emitPlayers(game);
    });

    socket.on('player:answer', ({ answerIndex } = {}, ack) => {
      const game = games.get(socket.data.pin);
      if (!game || game.state !== 'question') return ack?.({ ok: false });
      const playerId = socket.data.playerId;
      if (!playerId || !game.players.has(playerId)) return ack?.({ ok: false });
      if (game.answers.has(playerId)) return ack?.({ ok: false, error: 'Already answered' });

      const question = game.quiz.questions[game.questionIndex];
      if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.answers.length)
        return ack?.({ ok: false });

      game.answers.set(playerId, {
        answerIndex,
        timeMs: Date.now() - game.questionStartedAt,
      });
      ack?.({ ok: true });

      const connectedPlayers = [...game.players.values()].filter((p) => p.connected);
      io.to(game.hostSocketId).emit('game:answerCount', {
        answered: game.answers.size,
        total: connectedPlayers.length,
      });
      if (connectedPlayers.every((p) => game.answers.has(p.id))) endQuestion(game);
    });

    function asHost(handler) {
      return (payload, ack) => {
        const game = games.get(socket.data.pin);
        if (!game || game.hostSocketId !== socket.id) return ack?.({ ok: false });
        handler(game, payload, ack);
      };
    }

    socket.on('host:start', asHost((game, _payload, ack) => {
      if (game.state !== 'lobby') return ack?.({ ok: false });
      if (game.players.size === 0) return ack?.({ ok: false, error: 'No players have joined yet.' });
      ack?.({ ok: true });
      startQuestion(game, 0);
    }));

    socket.on('host:skip', asHost((game, _payload, ack) => {
      if (game.state !== 'question') return ack?.({ ok: false });
      ack?.({ ok: true });
      endQuestion(game);
    }));

    socket.on('host:next', asHost((game, _payload, ack) => {
      if (game.state === 'reveal') {
        const isLast = game.questionIndex >= game.quiz.questions.length - 1;
        ack?.({ ok: true });
        if (isLast) return showPodium(game);
        game.state = 'leaderboard';
        io.to(roomOf(game)).emit('game:leaderboard', {
          top: standings(game).slice(0, 5),
          index: game.questionIndex,
          total: game.quiz.questions.length,
        });
      } else if (game.state === 'leaderboard') {
        ack?.({ ok: true });
        startQuestion(game, game.questionIndex + 1);
      } else {
        ack?.({ ok: false });
      }
    }));

    socket.on('host:end', asHost((game) => endGame(game, 'The host ended the game.')));

    socket.on('disconnect', () => {
      const game = games.get(socket.data.pin);
      if (!game) return;

      if (socket.data.role === 'host' && game.hostSocketId === socket.id) {
        endGame(game, 'The host disconnected.');
        return;
      }

      const player = game.players.get(socket.data.playerId);
      if (!player) return;
      if (game.state === 'lobby') {
        game.players.delete(player.id);
      } else {
        player.connected = false;
        // If everyone still connected has answered, close the question.
        if (game.state === 'question') {
          const connectedPlayers = [...game.players.values()].filter((p) => p.connected);
          if (connectedPlayers.length > 0 && connectedPlayers.every((p) => game.answers.has(p.id)))
            endQuestion(game);
        }
      }
      emitPlayers(game);
    });
  }

  return { handleConnection };
}
