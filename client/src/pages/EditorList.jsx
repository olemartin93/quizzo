import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function EditorList() {
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    api.listQuizzes().then(setQuizzes).catch((e) => setError(e.message));
  }

  useEffect(refresh, []);

  async function remove(quiz) {
    if (!window.confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteQuiz(quiz.id);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="back-link">← Home</Link>
        <h1>Your quizzes</h1>
        <p className="subtitle">Create, edit and manage question sets.</p>
      </header>
      {error && <p className="error-banner">{error}</p>}
      <Link to="/editor/new" className="btn btn-primary">
        ＋ New quiz
      </Link>
      {quizzes == null ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="quiz-list">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-card">
              <span className="quiz-emoji">{quiz.emoji}</span>
              <div className="quiz-card-info">
                <h2>{quiz.title}</h2>
                <p className="muted">{quiz.questionCount} questions</p>
              </div>
              <Link to={`/editor/${quiz.id}`} className="btn btn-ghost">
                Edit ✏️
              </Link>
              <button className="btn btn-danger" onClick={() => remove(quiz)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
