export function Leaderboard({ entries, highlightId }) {
  return (
    <div className="leaderboard">
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          className={`leaderboard-row${entry.id === highlightId ? ' me' : ''}`}
          style={{ animationDelay: `${i * 0.12}s` }}
        >
          <span className="lb-rank">#{entry.rank}</span>
          <span className="lb-avatar">{entry.avatar}</span>
          <span className="lb-name">{entry.nickname}</span>
          {entry.streak >= 2 && <span className="lb-streak">🔥{entry.streak}</span>}
          <span className="lb-score">{entry.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
