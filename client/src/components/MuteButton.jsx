import { useState } from 'react';
import { isMuted, toggleMute } from '../sounds.js';

export function MuteButton() {
  const [muted, setMuted] = useState(isMuted());
  return (
    <button
      className="mute-btn"
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      onClick={() => setMuted(toggleMute())}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
