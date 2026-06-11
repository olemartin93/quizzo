const MEDALS = ['🥇', '🥈', '🥉'];

export function Podium({ podium }) {
  // Visual order: 2nd, 1st, 3rd — classic podium layout.
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);
  return (
    <div className="podium">
      {order.map((entry) => {
        const place = entry.rank; // 1, 2 or 3
        return (
          <div key={entry.id} className={`podium-spot place-${place}`}>
            <div className="podium-avatar">{entry.avatar}</div>
            <div className="podium-name">{entry.nickname}</div>
            <div className="podium-score">{entry.score.toLocaleString()}</div>
            <div className="podium-block">
              <span className="podium-medal">{MEDALS[place - 1]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
