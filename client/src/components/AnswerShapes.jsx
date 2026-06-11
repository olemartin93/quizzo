// Kahoot-style answer identities: colored buttons each with a distinct shape.
export const ANSWER_STYLES = [
  { className: 'answer-red', shape: '▲' },
  { className: 'answer-blue', shape: '◆' },
  { className: 'answer-yellow', shape: '●' },
  { className: 'answer-green', shape: '■' },
];

export function AnswerGrid({ answers, onPick, disabled, picked, correctIndex, stats }) {
  return (
    <div className="answer-grid">
      {answers.map((text, i) => {
        const style = ANSWER_STYLES[i % ANSWER_STYLES.length];
        const classes = ['answer-btn', style.className];
        if (picked === i) classes.push('picked');
        if (correctIndex != null) {
          classes.push(i === correctIndex ? 'correct' : 'dimmed');
        }
        return (
          <button
            key={i}
            className={classes.join(' ')}
            disabled={disabled || onPick == null}
            onClick={() => onPick?.(i)}
          >
            <span className="answer-shape">{style.shape}</span>
            <span className="answer-text">{text}</span>
            {stats != null && <span className="answer-stat">{stats[i]}</span>}
          </button>
        );
      })}
    </div>
  );
}
