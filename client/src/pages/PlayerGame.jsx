import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { socket } from '../socket.js';
import { sounds } from '../sounds.js';
import { AVATARS, randomAvatar } from '../avatars.js';
import { AnswerGrid } from '../components/AnswerShapes.jsx';
import { Leaderboard } from '../components/Leaderboard.jsx';
import { Podium } from '../components/Podium.jsx';
import { QuestionTimer } from '../components/QuestionTimer.jsx';
import { Countdown } from '../components/Countdown.jsx';
import { MuteButton } from '../components/MuteButton.jsx';

export default function PlayerGame() {
  const [searchParams] = useSearchParams();

  const [phase, setPhase] = useState('join');
  const [pin, setPin] = useState(searchParams.get('pin') ?? '');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(randomAvatar());
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null); // { playerId, nickname, avatar, quizTitle, questionCount }
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [question, setQuestion] = useState(null);
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [top, setTop] = useState([]);
  const [podium, setPodium] = useState(null);
  const [endedReason, setEndedReason] = useState(null);

  useEffect(() => {
    const onPlayers = ({ players: list }) => setPlayers(list);
    const onCountdown = (payload) => {
      setCountdown(payload);
      setQuestion(null);
      setPicked(null);
      setResult(null);
      setPhase('countdown');
    };
    const onQuestion = (payload) => {
      setQuestion({ ...payload, startedAt: Date.now() });
      setPhase('question');
    };
    const onResult = (payload) => {
      setResult(payload);
      setPhase('result');
      if (payload.correct) sounds.correct();
      else sounds.wrong();
    };
    const onLeaderboard = (payload) => {
      setTop(payload.top);
      setPhase('leaderboard');
    };
    const onPodium = (payload) => {
      setPodium(payload);
      setPhase('podium');
      sounds.fanfare();
    };
    const onEnded = ({ reason }) => {
      setEndedReason(reason);
      setPhase('ended');
    };

    socket.on('game:players', onPlayers);
    socket.on('game:countdown', onCountdown);
    socket.on('game:question', onQuestion);
    socket.on('player:result', onResult);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:podium', onPodium);
    socket.on('game:ended', onEnded);
    return () => {
      socket.off('game:players', onPlayers);
      socket.off('game:countdown', onCountdown);
      socket.off('game:question', onQuestion);
      socket.off('player:result', onResult);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:podium', onPodium);
      socket.off('game:ended', onEnded);
    };
  }, []);

  function join(e) {
    e.preventDefault();
    setError(null);
    socket.emit('player:join', { pin: pin.trim(), nickname, avatar }, (res) => {
      if (!res?.ok) return setError(res?.error ?? 'Could not join the game.');
      setMe(res);
      setPhase('lobby');
      sounds.join();
    });
  }

  function answer(i) {
    if (picked != null) return;
    setPicked(i);
    sounds.lockIn();
    socket.emit('player:answer', { answerIndex: i }, () => {});
  }

  const myRank = (list) => list.find((p) => p.id === me?.playerId);

  return (
    <div className="page player-page">
      {me && (
        <header className="game-header">
          <span className="game-header-title">
            {me.avatar} {me.nickname}
          </span>
          <span className="game-header-pin">{me.quizTitle}</span>
          <span className="game-header-actions">
            <MuteButton />
          </span>
        </header>
      )}

      {phase === 'join' && (
        <form className="join-form" onSubmit={join}>
          <Link to="/" className="back-link">← Home</Link>
          <h1>Join a game</h1>
          <label>
            Game PIN
            <input
              className="input input-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoFocus
              required
            />
          </label>
          <label>
            Nickname
            <input
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="QuizWizard"
              maxLength={20}
              required
            />
          </label>
          <p className="avatar-label">Pick your character</p>
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                className={`avatar-option${a === avatar ? ' selected' : ''}`}
                onClick={() => setAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
          {error && <p className="error-banner">{error}</p>}
          <button type="submit" className="btn btn-primary btn-big">
            Join 🚀
          </button>
        </form>
      )}

      {phase === 'lobby' && (
        <div className="centered-screen">
          <div className="big-avatar bounce">{avatar}</div>
          <h2>You're in, {me.nickname}!</h2>
          <p className="muted pulse">Watch the host screen — waiting for the game to start…</p>
          <div className="lobby-players">
            {players.map((p) => (
              <span
                key={p.id}
                className={`player-chip pop-in${p.id === me.playerId ? ' me' : ''}`}
              >
                <span className="player-chip-avatar">{p.avatar}</span>
                {p.nickname}
              </span>
            ))}
          </div>
        </div>
      )}

      {phase === 'countdown' && countdown && (
        <Countdown
          key={countdown.index}
          seconds={countdown.seconds}
          label={`Question ${countdown.index + 1} of ${countdown.total}`}
        />
      )}

      {phase === 'question' && question && (
        <div className="question-screen">
          <h2 className="question-text">{question.text}</h2>
          <QuestionTimer timeLimit={question.timeLimit} startedAt={question.startedAt} />
          {picked == null ? (
            <AnswerGrid answers={question.answers} onPick={answer} />
          ) : (
            <div className="locked-in">
              <div className="big-avatar pulse">🔒</div>
              <h2>Locked in!</h2>
              <p className="muted">Fingers crossed…</p>
            </div>
          )}
        </div>
      )}

      {phase === 'result' && result && (
        <div className={`centered-screen result-screen ${result.correct ? 'good' : 'bad'}`}>
          <div className="big-avatar">{result.correct ? '✅' : result.answered ? '❌' : '⏰'}</div>
          <h2>
            {result.correct ? 'Correct!' : result.answered ? 'Wrong!' : "Time's up!"}
          </h2>
          {result.correct && (
            <p className="points-earned">+{result.pointsEarned.toLocaleString()} points</p>
          )}
          {result.streak >= 2 && <p className="streak-banner">🔥 {result.streak} answer streak!</p>}
          <p className="muted">
            You're in place #{result.rank} of {result.totalPlayers} · {result.score.toLocaleString()} pts
          </p>
        </div>
      )}

      {phase === 'leaderboard' && (
        <div className="centered-screen">
          <h2>Leaderboard</h2>
          <Leaderboard entries={top} highlightId={me?.playerId} />
          <p className="muted pulse">Next question coming up…</p>
        </div>
      )}

      {phase === 'podium' && podium && (
        <div className="centered-screen">
          <h2>🏆 Final results</h2>
          <Podium podium={podium.podium} />
          {myRank(podium.players) && (
            <p className="points-earned">
              You finished #{myRank(podium.players).rank} with{' '}
              {myRank(podium.players).score.toLocaleString()} points!
            </p>
          )}
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
        </div>
      )}

      {phase === 'ended' && (
        <div className="centered-screen">
          <h2>Game over</h2>
          <p className="muted">{endedReason}</p>
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
