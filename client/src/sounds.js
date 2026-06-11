// Tiny Web Audio synth — all sound effects are generated, no audio files needed.

let ctx = null;
let muted = localStorage.getItem('quizzo-muted') === 'true';

function ensureCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('quizzo-muted', String(muted));
  if (muted) stopThinking();
  return muted;
}

function tone({
  freq,
  start = 0,
  at = null,
  duration = 0.15,
  type = 'square',
  volume = 0.12,
  glideTo = null,
  dest = null,
}) {
  if (muted) return;
  const audio = ensureCtx();
  if (!audio) return;
  const t0 = at ?? audio.currentTime + start;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(dest ?? audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// ---- "Thinking" loop: subtle pulsing music while answers come in ----

let thinking = null; // { timer, gain }

const EIGHTH = 60 / 112 / 2; // 112 BPM, eighth-note grid
const BAR = EIGHTH * 8;

// Two alternating bars (Am-ish and G-ish): root/fifth bass, soft arpeggio on top.
const THINKING_BARS = [
  {
    bass: [110.0, null, 164.81, null, 110.0, null, 164.81, null],
    arp: [220.0, 261.63, 329.63, 261.63, 220.0, 261.63, 329.63, 440.0],
  },
  {
    bass: [98.0, null, 146.83, null, 98.0, null, 146.83, null],
    arp: [196.0, 246.94, 293.66, 246.94, 196.0, 246.94, 293.66, 392.0],
  },
];

function startThinking() {
  if (muted || thinking) return;
  const audio = ensureCtx();
  if (!audio) return;

  const master = audio.createGain();
  master.gain.value = 0.55;
  master.connect(audio.destination);
  thinking = { timer: null, gain: master };

  let barIndex = 0;
  let nextBarAt = audio.currentTime + 0.1;

  const scheduleBar = () => {
    if (!thinking) return;
    const bar = THINKING_BARS[barIndex % THINKING_BARS.length];
    bar.bass.forEach((freq, i) => {
      if (freq)
        tone({ freq, at: nextBarAt + i * EIGHTH, duration: EIGHTH * 0.9, type: 'triangle', volume: 0.07, dest: master });
    });
    bar.arp.forEach((freq, i) => {
      if (freq)
        tone({ freq, at: nextBarAt + i * EIGHTH, duration: EIGHTH * 0.55, type: 'sine', volume: 0.045, dest: master });
    });
    // off-beat ticks for a gentle pulse
    [1, 3, 5, 7].forEach((i) =>
      tone({ freq: 1568, at: nextBarAt + i * EIGHTH, duration: 0.03, type: 'square', volume: 0.012, dest: master })
    );
    barIndex += 1;
    nextBarAt += BAR;
    thinking.timer = setTimeout(scheduleBar, (nextBarAt - audio.currentTime - 0.25) * 1000);
  };

  scheduleBar();
}

function stopThinking() {
  if (!thinking) return;
  clearTimeout(thinking.timer);
  const master = thinking.gain;
  thinking = null;
  if (ctx && master) {
    // short fade-out to avoid clicks
    const g = master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    setTimeout(() => master.disconnect(), 400);
  }
}

export const sounds = {
  startThinking,
  stopThinking,
  join() {
    tone({ freq: 660, duration: 0.08, type: 'sine', volume: 0.15 });
    tone({ freq: 880, start: 0.08, duration: 0.12, type: 'sine', volume: 0.15 });
  },
  countdown() {
    tone({ freq: 440, duration: 0.12, type: 'triangle', volume: 0.18 });
  },
  go() {
    tone({ freq: 880, duration: 0.3, type: 'triangle', volume: 0.2 });
  },
  lockIn() {
    tone({ freq: 520, duration: 0.07, type: 'square', volume: 0.1 });
    tone({ freq: 780, start: 0.07, duration: 0.1, type: 'square', volume: 0.1 });
  },
  correct() {
    tone({ freq: 523, duration: 0.12, type: 'square', volume: 0.12 });
    tone({ freq: 659, start: 0.11, duration: 0.12, type: 'square', volume: 0.12 });
    tone({ freq: 784, start: 0.22, duration: 0.2, type: 'square', volume: 0.14 });
    tone({ freq: 1047, start: 0.34, duration: 0.3, type: 'square', volume: 0.14 });
  },
  wrong() {
    tone({ freq: 220, duration: 0.25, type: 'sawtooth', volume: 0.12, glideTo: 130 });
    tone({ freq: 165, start: 0.22, duration: 0.35, type: 'sawtooth', volume: 0.12, glideTo: 90 });
  },
  reveal() {
    tone({ freq: 392, duration: 0.1, type: 'triangle', volume: 0.12 });
    tone({ freq: 523, start: 0.1, duration: 0.18, type: 'triangle', volume: 0.12 });
  },
  fanfare() {
    const notes = [523, 523, 523, 659, 784, 659, 784, 1047];
    notes.forEach((freq, i) =>
      tone({ freq, start: i * 0.14, duration: i === notes.length - 1 ? 0.6 : 0.13, type: 'square', volume: 0.13 })
    );
  },
  tickUrgent() {
    tone({ freq: 990, duration: 0.05, type: 'square', volume: 0.08 });
  },
};

// Handy for manual testing from the browser console: quizzoSounds.correct()
if (typeof window !== 'undefined') window.quizzoSounds = sounds;
