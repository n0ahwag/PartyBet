/**
 * Synthetische Soundeffekte via WebAudio – keine Audio-Dateien nötig.
 * Browser erlauben Audio erst nach einer Nutzer-Geste → unlockAudio() beim ersten Tap.
 */
let ctx;
let muted = localStorage.getItem('fo_muted') === '1';

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function unlockAudio() {
  try {
    const c = ac();
    if (c.state === 'suspended') c.resume();
  } catch {
    /* kein Audio verfügbar */
  }
}

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  localStorage.setItem('fo_muted', v ? '1' : '0');
}

function tone(freq, { start = 0, dur = 0.15, type = 'sine', gain = 0.25, slideTo } = {}) {
  if (muted) return;
  const c = ac();
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  tick: () => tone(880, { dur: 0.08, type: 'square', gain: 0.12 }),
  go: () => tone(1320, { dur: 0.35, type: 'square', gain: 0.18 }),
  gong: () => {
    tone(196, { dur: 1.8, gain: 0.35 });
    tone(392, { dur: 1.4, gain: 0.12 });
    tone(587, { dur: 1.0, gain: 0.06 });
  },
  tusch: () => {
    [523, 659, 784].forEach((f) => tone(f, { dur: 0.12, type: 'sawtooth', gain: 0.12 }));
    [523, 659, 784, 1047].forEach((f) => tone(f, { start: 0.18, dur: 0.6, type: 'sawtooth', gain: 0.12 }));
  },
  betJingle: () => {
    [988, 1319].forEach((f, i) => tone(f, { start: i * 0.08, dur: 0.18, type: 'triangle', gain: 0.2 }));
  },
  coins: () => {
    for (let i = 0; i < 5; i++) tone(1800 + i * 120, { start: i * 0.05, dur: 0.08, type: 'triangle', gain: 0.1 });
  },
  fail: () => tone(330, { dur: 0.6, type: 'sawtooth', gain: 0.15, slideTo: 110 }),
  alarm: () => {
    for (let i = 0; i < 4; i++) {
      tone(600, { start: i * 0.5, dur: 0.25, type: 'square', gain: 0.15, slideTo: 1200 });
      tone(1200, { start: i * 0.5 + 0.25, dur: 0.25, type: 'square', gain: 0.15, slideTo: 600 });
    }
  },
  doom: () => {
    tone(110, { dur: 2.5, type: 'sawtooth', gain: 0.25, slideTo: 40 });
    tone(55, { start: 0.3, dur: 2.2, type: 'square', gain: 0.15 });
  },
  tap: () => tone(1200, { dur: 0.04, type: 'square', gain: 0.08 }),
  dice: () => {
    for (let i = 0; i < 7; i++) tone(500 + Math.random() * 900, { start: i * 0.06, dur: 0.04, type: 'square', gain: 0.07 });
    tone(220, { start: 0.45, dur: 0.12, type: 'triangle', gain: 0.2 });
  },
  step: () => tone(880, { dur: 0.05, type: 'triangle', gain: 0.1 }),
  rocket: () => tone(200, { dur: 0.7, type: 'sawtooth', gain: 0.15, slideTo: 1600 }),
  portal: () => {
    tone(300, { dur: 0.8, type: 'sine', gain: 0.2, slideTo: 900 });
    tone(900, { start: 0.1, dur: 0.7, type: 'sine', gain: 0.12, slideTo: 250 });
  },
  beat: () => { tone(160, { dur: 0.12, type: 'sine', gain: 0.5, slideTo: 60 }); tone(2400, { dur: 0.03, type: 'square', gain: 0.05 }); },
};

export function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
