import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { socket } from '../socket.js';

export default function HostSetup() {
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.listQuizzes().then(setQuizzes).catch((e) => setError(e.message));
  }, []);

  function hostQuiz(quiz) {
    socket.emit('host:createGame', { quizId: quiz.id }, (res) => {
      if (!res?.ok) return setError(res?.error ?? 'Could not create the game.');
      navigate('/host/game', {
        state: { pin: res.pin, quizTitle: res.quizTitle, questionCount: res.questionCount },
      });
    });
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="back-link">← Home</Link>
        <h1>Host a game</h1>
        <p className="subtitle">Pick a quiz — players join with the PIN on their own device.</p>
      </header>
      {error && <p className="error-banner">{error}</p>}
      {quizzes == null ? (
        <p className="muted">Loading quizzes…</p>
      ) : quizzes.length === 0 ? (
        <p className="muted">
          No quizzes yet. <Link to="/editor/new">Create one</Link> to get started!
        </p>
      ) : (
        <div className="quiz-list">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-card">
              <span className="quiz-emoji">{quiz.emoji}</span>
              <div className="quiz-card-info">
                <h2>{quiz.title}</h2>
                <p className="muted">{quiz.questionCount} questions</p>
              </div>
              <button className="btn btn-primary" onClick={() => hostQuiz(quiz)}>
                Host ▶
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
