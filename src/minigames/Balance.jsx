import { useEffect, useRef, useState } from 'react';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { requestMotionPermission } from '../lib/device.js';
import { sfx, vibrate } from '../lib/sound.js';

/**
 * Spiel 3 – Handy-Balance. Misst die mittlere Änderung der Beschleunigung
 * ("Wackel-Wert") über die Spieldauer. Kleiner = ruhiger = besser.
 */
function Measure({ duel, submit }) {
  const [step, setStep] = useState('perm'); // perm | count | run | done
  const [error, setError] = useState(null);
  const [live, setLive] = useState({ x: 0, y: 0, wobble: 0, left: 0 });
  const acc = useRef({ last: null, sum: 0, n: 0 });

  const n = useGo(step === 'count', () => setStep('run'));

  useEffect(() => {
    if (step !== 'run') return undefined;
    const st = acc.current;
    st.last = null; st.sum = 0; st.n = 0;
    const started = performance.now();
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a || a.x == null) return;
      if (st.last) {
        const d = Math.hypot(a.x - st.last.x, a.y - st.last.y, a.z - st.last.z);
        st.sum += d;
        st.n += 1;
      }
      st.last = { x: a.x, y: a.y, z: a.z };
      setLive((l) => ({ ...l, x: a.x, y: a.y, wobble: st.n ? st.sum / st.n : 0 }));
    };
    window.addEventListener('devicemotion', onMotion);
    const tick = setInterval(() => {
      const left = Math.max(0, duel.game.durationMs - (performance.now() - started));
      setLive((l) => ({ ...l, left }));
      if (left <= 0) {
        clearInterval(tick);
        window.removeEventListener('devicemotion', onMotion);
        const wobble = st.n ? Number((st.sum / st.n).toFixed(4)) : 99;
        submit({ wobble, samples: st.n });
        sfx.gong();
        vibrate(300);
        setStep('done');
      }
    }, 100);
    return () => { clearInterval(tick); window.removeEventListener('devicemotion', onMotion); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === 'perm') {
    return (
      <div className="stack">
        <Waiting text="Handy flach auf die Handfläche legen. Sobald es losgeht: nicht wackeln!" />
        {error && <p className="center" style={{ color: 'var(--bad)' }}>{error}</p>}
        <button className="btn primary lg" onClick={async () => {
          const ok = await requestMotionPermission();
          if (!ok) setError('Bewegungssensor nicht freigegeben – der Host kann manuell entscheiden.');
          else setStep('count');
        }}>Sensor freigeben & starten</button>
      </div>
    );
  }
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text="Gemessen! Warte auf dein Gegenüber…" />;

  const clamp = (v) => Math.max(-9, Math.min(9, v));
  return (
    <div className="stack center">
      <div className="big-number">{(live.left / 1000).toFixed(1)}s</div>
      <div className="wobble-meter" style={{ width: '100%' }}>
        <div className="wobble-dot" style={{ transform: `translate(calc(-50% + ${clamp(live.x) * -10}px), calc(-50% + ${clamp(live.y) * 10}px))` }} />
      </div>
      <p className="muted" style={{ fontWeight: 700 }}>Wackel-Wert: {live.wobble.toFixed(3)}</p>
    </div>
  );
}

function Review({ duel, byId }) {
  const ids = [duel.playerA, duel.playerB];
  return (
    <div className="card stack">
      <h3>Wackel-Werte (kleiner = ruhiger)</h3>
      {ids.map((id) => {
        const res = duel.results?.[id];
        return (
          <div key={id} className="row between">
            <b>{byId[id]?.avatar} {byId[id]?.name}</b>
            <span className="balance">{res ? res.wobble.toFixed(3) : 'misst…'}</span>
          </div>
        );
      })}
      {duel.sabotage && <p className="small muted" style={{ margin: 0 }}>🧪 Sabotage: Wert von {byId[duel.sabotage.target]?.name} zählt +15 %.</p>}
    </div>
  );
}

export const Balance = {
  Play: ({ duel, submit }) => <Measure duel={duel} submit={(d) => submit(null, d)} />,
  Stage: Review,
  Review,
};
