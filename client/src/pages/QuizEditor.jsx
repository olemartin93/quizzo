import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

const emptyQuestion = () => ({
  text: '',
  answers: ['', '', '', ''],
  correctIndex: 0,
  timeLimit: 20,
});

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('❓');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getQuiz(id)
      .then((quiz) => {
        setTitle(quiz.title);
        setEmoji(quiz.emoji ?? '❓');
        setQuestions(
          quiz.questions.map((q) => ({
            ...q,
            answers: [...q.answers, '', '', ''].slice(0, 4),
          }))
        );
        setLoading(false);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  function patchQuestion(index, patch) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function patchAnswer(qIndex, aIndex, value) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex ? { ...q, answers: q.answers.map((a, j) => (j === aIndex ? value : a)) } : q
      )
    );
  }

  function removeQuestion(index) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  // Empty answer fields are dropped on save; correctIndex is remapped to the
  // compacted answer list.
  function buildPayload() {
    const built = [];
    for (const [i, q] of questions.entries()) {
      const kept = q.answers
        .map((text, index) => ({ text: text.trim(), index }))
        .filter((a) => a.text);
      if (kept.length < 2) throw new Error(`Question ${i + 1}: needs at least 2 answers.`);
      const correctPos = kept.findIndex((a) => a.index === q.correctIndex);
      if (correctPos === -1)
        throw new Error(`Question ${i + 1}: mark one of the filled-in answers as correct.`);
      built.push({
        text: q.text,
        answers: kept.map((a) => a.text),
        correctIndex: correctPos,
        timeLimit: Number(q.timeLimit),
      });
    }
    return { title, emoji, questions: built };
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = buildPayload();
      if (id) await api.updateQuiz(id, payload);
      else await api.createQuiz(payload);
      navigate('/editor');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading && !error) return <div className="page"><p className="muted">Loading…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/editor" className="back-link">← Quizzes</Link>
        <h1>{id ? 'Edit quiz' : 'New quiz'}</h1>
      </header>
      <form className="editor-form" onSubmit={save}>
        <div className="editor-title-row">
          <label className="editor-emoji-field">
            Emoji
            <input
              className="input"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
            />
          </label>
          <label className="editor-title-field">
            Quiz title
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome quiz"
              required
            />
          </label>
        </div>

        {questions.map((q, qi) => (
          <fieldset key={qi} className="question-editor">
            <legend>Question {qi + 1}</legend>
            <label>
              Question text
              <input
                className="input"
                value={q.text}
                onChange={(e) => patchQuestion(qi, { text: e.target.value })}
                placeholder="What is…?"
                required
              />
            </label>
            <div className="editor-answers">
              {q.answers.map((a, ai) => (
                <label key={ai} className="editor-answer">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.correctIndex === ai}
                    onChange={() => patchQuestion(qi, { correctIndex: ai })}
                    title="Mark as correct answer"
                  />
                  <input
                    className="input"
                    value={a}
                    onChange={(e) => patchAnswer(qi, ai, e.target.value)}
                    placeholder={ai < 2 ? `Answer ${ai + 1}` : `Answer ${ai + 1} (optional)`}
                  />
                </label>
              ))}
            </div>
            <div className="question-editor-footer">
              <label>
                Time limit (seconds)
                <input
                  className="input input-number"
                  type="number"
                  min={5}
                  max={120}
                  value={q.timeLimit}
                  onChange={(e) => patchQuestion(qi, { timeLimit: Number(e.target.value) })}
                  required
                />
              </label>
              {questions.length > 1 && (
                <button type="button" className="btn btn-danger btn-small" onClick={() => removeQuestion(qi)}>
                  Remove question
                </button>
              )}
            </div>
          </fieldset>
        ))}

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
        >
          ＋ Add question
        </button>

        {error && <p className="error-banner">{error}</p>}
        <button type="submit" className="btn btn-primary btn-big" disabled={saving}>
          {saving ? 'Saving…' : 'Save quiz 💾'}
        </button>
      </form>
    </div>
  );
}
