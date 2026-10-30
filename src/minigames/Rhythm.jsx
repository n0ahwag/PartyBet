import { useState, useRef } from 'react';
import { Waiting } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';
import { rhythmError } from '../game/gameLibrary.js';

/** Spiel 10 – Rhythmus-Echo: Muster anhören, dann exakt nachklopfen. */
function Play({ duel, submit }) {
  const pattern = duel.game.intervals;
  const beats = pattern.length + 1;
  const [step, setStep] = useState('ready'); // ready | listen | tap | done
  const [flash, setFlash] = useState(false);
  const [taps, setTaps] = useState([]);
  const tapsRef = useRef([]);

  const pulse = () => { sfx.beat(); vibrate(25); setFlash(true); setTimeout(() => setFlash(false), 110); };

  const listen = () => {
    setStep('listen');
    // Schlagzeitpunkte relativ zum Start: 0, p1, p1+p2, …
    const times = pattern.reduce((acc, p) => [...acc, acc.at(-1) + p], [0]);
    times.forEach((ms) => setTimeout(pulse, ms));
    setTimeout(() => setStep('tap'), times.at(-1) + 700);
  };

  const tap = (e) => {
    e.preventDefault();
    if (step !== 'tap') return;
    pulse();
    tapsRef.current = [...tapsRef.current, performance.now()];
    setTaps(tapsRef.current);
    if (tapsRef.current.length >= beats) {
      submit({ errorMs: rhythmError(pattern, tapsRef.current) });
      setStep('done');
    }
  };

  if (step === 'ready') {
    return (
      <div className="stack">
        <Waiting text={`Du hörst gleich ${beats} Schläge – nur einmal! Danach klopfst du sie exakt nach.`} />
        <button className="btn primary lg" onClick={listen}>🎧 Rhythmus anhören</button>
      </div>
    );
  }
  if (step === 'done') return <Waiting text="Geklopft! Warte auf dein Gegenüber…" />;
  return (
    <div className="stack center">
      <div className="kicker">{step === 'listen' ? 'Zuhören…' : `Nachklopfen: ${taps.length}/${beats}`}</div>
      <button onPointerDown={tap} disabled={step !== 'tap'}
        style={{ width: 'min(75vw, 300px)', aspectRatio: '1', borderRadius: '50%', border: 'none', margin: '0 auto',
          background: flash ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 22%, var(--card))',
          color: flash ? '#fff' : 'var(--ink)', fontSize: 64, transition: 'background 0.08s', opacity: 1 }}>
        🥁
      </button>
    </div>
  );
}

function Review({ duel, byId }) {
  return (
    <div className="card stack">
      <h3>Abweichung (kleiner = genauer)</h3>
      {[duel.playerA, duel.playerB].map((id) => {
        const r = duel.results?.[id];
        return (
          <div key={id} className="row between">
            <b>{byId[id]?.avatar} {byId[id]?.name}</b>
            <span className="balance">{r ? `± ${r.errorMs} ms` : 'klopft…'}</span>
          </div>
        );
      })}
    </div>
  );
}

export const Rhythm = { Play: ({ duel, submit }) => <Play duel={duel} submit={(d) => submit(null, d)} />, Stage: Review, Review };
