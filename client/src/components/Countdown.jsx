import { useEffect, useState } from 'react';
import { sounds } from '../sounds.js';

export function Countdown({ seconds, label }) {
  const [n, setN] = useState(seconds);

  useEffect(() => {
    setN(seconds);
    sounds.countdown();
    const interval = setInterval(() => {
      setN((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          sounds.go();
          return 0;
        }
        sounds.countdown();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  return (
    <div className="countdown">
      {label && <p className="countdown-label">{label}</p>}
      <div className="countdown-number" key={n}>
        {n > 0 ? n : 'GO!'}
      </div>
    </div>
  );
}
