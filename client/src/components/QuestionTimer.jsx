import { useEffect, useState } from 'react';
import { sounds } from '../sounds.js';

export function QuestionTimer({ timeLimit, startedAt, withSound = false }) {
  const [remaining, setRemaining] = useState(timeLimit);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, timeLimit - elapsed);
      setRemaining(left);
      if (withSound && left > 0 && left <= 5 && Math.abs(left - Math.round(left)) < 0.06) {
        sounds.tickUrgent();
      }
      if (left <= 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [timeLimit, startedAt, withSound]);

  const fraction = remaining / timeLimit;
  return (
    <div className="timer">
      <div
        className={`timer-bar${fraction < 0.25 ? ' urgent' : ''}`}
        style={{ width: `${fraction * 100}%` }}
      />
      <span className="timer-label">{Math.ceil(remaining)}</span>
    </div>
  );
}
