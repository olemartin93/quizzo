import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket.js';
import { sounds } from '../sounds.js';
import { AnswerGrid } from '../components/AnswerShapes.jsx';
import { Leaderboard } from '../components/Leaderboard.jsx';
import { Podium } from '../components/Podium.jsx';
import { QuestionTimer } from '../components/QuestionTimer.jsx';
import { Countdown } from '../components/Countdown.jsx';
import { MuteButton } from '../components/MuteButton.jsx';

export default function HostGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const game = location.state; // { pin, quizTitle, questionCount }

  const [phase, setPhase] = useState('lobby');
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answerCount, setAnswerCount] = useState(0);
  const [reveal, setReveal] = useState(null);
  const [top, setTop] = useState([]);
  const [podium, setPodium] = useState(null);
  const [endedReason, setEndedReason] = useState(null);
  const [error, setError] = useState(null);
  const playerCountRef = useRef(0);

  useEffect(() => {
    if (!game?.pin) navigate('/host', { replace: true });
  }, [game, navigate]);

  useEffect(() => {
    const onPlayers = ({ players: list }) => {
      if (list.length > playerCountRef.current) sounds.join();
      playerCountRef.current = list.length;
      setPlayers(list);
    };
    const onCountdown = (payload) => {
      setCountdown(payload);
      setReveal(null);
      setPhase('countdown');
    };
    const onQuestion = (payload) => {
      setQuestion({ ...payload, startedAt: Date.now() });
      setAnswerCount(0);
      setPhase('question');
    };
    const onAnswerCount = ({ answered }) => setAnswerCount(answered);
    const onReveal = (payload) => {
      setReveal(payload);
      setPhase('reveal');
      sounds.reveal();
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
    socket.on('game:answerCount', onAnswerCount);
    socket.on('game:reveal', onReveal);
    socket.on('game:leaderboard', onLeaderboard);
    socket.on('game:podium', onPodium);
    socket.on('game:ended', onEnded);
    return () => {
      socket.off('game:players', onPlayers);
      socket.off('game:countdown', onCountdown);
      socket.off('game:question', onQuestion);
      socket.off('game:answerCount', onAnswerCount);
      socket.off('game:reveal', onReveal);
      socket.off('game:leaderboard', onLeaderboard);
      socket.off('game:podium', onPodium);
      socket.off('game:ended', onEnded);
    };
  }, []);

  // Subtle Kahoot-style waiting music while answers come in.
  useEffect(() => {
    if (phase !== 'question') return;
    sounds.startThinking();
    return () => sounds.stopThinking();
  }, [phase]);

  if (!game?.pin) return null;

  function start() {
    socket.emit('host:start', {}, (res) => {
      if (!res?.ok) setError(res?.error ?? 'Could not start the game.');
    });
  }

  function next() {
    socket.emit('host:next', {}, () => {});
  }

  function skip() {
    socket.emit('host:skip', {}, () => {});
  }

  function endGame() {
    socket.emit('host:end');
    navigate('/host');
  }

  const joinUrl = `${window.location.origin}/play`;
  const questionLabel = question ? `${question.index + 1} / ${question.total}` : '';

  return (
    <div className="page host-page">
      <header className="game-header">
        <span className="game-header-title">
          {game.quizTitle}
          {phase === 'question' || phase === 'reveal' ? ` — Q${questionLabel}` : ''}
        </span>
        <span className="game-header-pin">PIN: {game.pin}</span>
        <span className="game-header-actions">
          <MuteButton />
          <button className="btn btn-ghost btn-small" onClick={endGame}>
            End game
          </button>
        </span>
      </header>

      {phase === 'lobby' && (
        <div className="lobby">
          <div className="lobby-banner">
            <p className="lobby-join-hint">
              Join at <strong>{joinUrl}</strong> with PIN
            </p>
            <div className="lobby-pin">{game.pin}</div>
          </div>
          {error && <p className="error-banner">{error}</p>}
          <div className="lobby-players">
            {players.length === 0 ? (
              <p className="muted pulse">Waiting for players to join…</p>
            ) : (
              players.map((p) => (
                <span key={p.id} className="player-chip pop-in">
                  <span className="player-chip-avatar">{p.avatar}</span>
                  {p.nickname}
                </span>
              ))
            )}
          </div>
          <button className="btn btn-primary btn-big" onClick={start} disabled={players.length === 0}>
            Start game ({players.length} {players.length === 1 ? 'player' : 'players'})
          </button>
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
          <QuestionTimer timeLimit={question.timeLimit} startedAt={question.startedAt} withSound />
          <p className="answer-progress">
            ✋ {answerCount} / {players.length} answered
          </p>
          <AnswerGrid answers={question.answers} disabled />
          <button className="btn btn-ghost" onClick={skip}>
            Skip ⏭
          </button>
        </div>
      )}

      {phase === 'reveal' && question && reveal && (
        <div className="question-screen">
          <h2 className="question-text">{question.text}</h2>
          <AnswerGrid
            answers={question.answers}
            disabled
            correctIndex={reveal.correctIndex}
            stats={reveal.stats}
          />
          <button className="btn btn-primary btn-big" onClick={next}>
            {reveal.index + 1 >= reveal.total ? 'Show podium 🏆' : 'Next ▶'}
          </button>
        </div>
      )}

      {phase === 'leaderboard' && (
        <div className="centered-screen">
          <h2>Leaderboard</h2>
          <Leaderboard entries={top} />
          <button className="btn btn-primary btn-big" onClick={next}>
            Next question ▶
          </button>
        </div>
      )}

      {phase === 'podium' && podium && (
        <div className="centered-screen">
          <h2>🏆 Final results</h2>
          <Podium podium={podium.podium} />
          {podium.players.length > 3 && (
            <Leaderboard entries={podium.players.slice(3)} />
          )}
          <button className="btn btn-primary btn-big" onClick={() => navigate('/host')}>
            Play again 🔁
          </button>
        </div>
      )}

      {phase === 'ended' && (
        <div className="centered-screen">
          <h2>Game over</h2>
          <p className="muted">{endedReason}</p>
          <button className="btn btn-primary" onClick={() => navigate('/host')}>
            Back to quizzes
          </button>
        </div>
      )}
    </div>
  );
}
