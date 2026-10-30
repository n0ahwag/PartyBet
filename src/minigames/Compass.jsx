import { useEffect, useRef, useState } from 'react';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { requestOrientationPermission } from '../lib/device.js';
import { sfx, vibrate } from '../lib/sound.js';

const TOLERANCE = 12;
const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

/** Spiel 7 – Kompass-Axt: Als Erster in die Zielrichtung ausrichten und kurz halten. */
function Play({ duel, submit }) {
  const [step, setStep] = useState('perm');
  const [heading, setHeading] = useState(null);
  const [holding, setHolding] = useState(0);
  const [noSensor, setNoSensor] = useState(false);
  const { target, holdMs, timeoutMs } = duel.game;
  const st = useRef({ heading: null, inZoneSince: null, done: false });
  const n = useGo(step === 'count', () => setStep('run'));

  useEffect(() => {
    if (step !== 'count' && step !== 'run') return undefined;
    const onOrient = (e) => {
      let h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading; // iOS
      else if (e.absolute && e.alpha != null) h = (360 - e.alpha) % 360; // Android
      if (h == null) return;
      st.current.heading = h;
      setHeading(h);
    };
    window.addEventListener('deviceorientationabsolute', onOrient);
    window.addEventListener('deviceorientation', onOrient);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient);
      window.removeEventListener('deviceorientation', onOrient);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'run') return undefined;
    const s = st.current;
    const started = performance.now();
    const finish = (ms) => {
      if (s.done) return;
      s.done = true;
      submit({ ms });
      if (ms != null) { sfx.tusch(); vibrate(200); } else sfx.fail();
      setStep('done');
    };
    const tick = setInterval(() => {
      const now = performance.now();
      if (s.heading == null && now - started > 2000) setNoSensor(true);
      if (s.heading != null && angleDiff(s.heading, target.deg) <= TOLERANCE) {
        s.inZoneSince ??= now;
        setHolding(Math.min(1, (now - s.inZoneSince) / holdMs));
        if (now - s.inZoneSince >= holdMs) finish(Math.round(now - started));
      } else {
        s.inZoneSince = null;
        setHolding(0);
      }
      if (now - started > timeoutMs) finish(null);
    }, 50);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === 'perm') {
    return (
      <div className="stack">
        <Waiting text="Halte das Handy flach vor dich. Gleich erscheint eine Himmelsrichtung – dreh dich dorthin!" />
        <button className="btn primary lg" onClick={async () => { await requestOrientationPermission(); setStep('count'); }}>Kompass freigeben & starten</button>
      </div>
    );
  }
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text="Erledigt! Warte auf dein Gegenüber…" />;

  const rel = heading == null ? 0 : target.deg - heading;
  return (
    <div className="stack center">
      <div className="kicker">Richte dich aus nach</div>
      <div className="big-number">{target.label}</div>
      <div style={{ width: 220, height: 220, borderRadius: '50%', border: '6px solid var(--line)', position: 'relative', margin: '0 auto', background: 'var(--card)' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `rotate(${rel}deg)`, transition: 'transform 0.1s linear' }}>
          <div style={{ position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)', fontSize: 44 }}>🪓</div>
        </div>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontWeight: 900, fontSize: 22 }}>
          {heading == null ? '…' : `${Math.round(heading)}°`}
        </div>
      </div>
      <div className="bar" style={{ width: '100%' }}><div style={{ width: `${holding * 100}%` }} /></div>
      <p className="muted small" style={{ margin: 0 }}>Axt nach oben zeigen lassen und still halten.</p>
      {noSensor && <button className="btn ghost sm" onClick={() => { st.current.done = true; submit({ ms: null }); setStep('done'); }}>Kein Kompass – aufgeben</button>}
    </div>
  );
}

function Review({ duel, byId }) {
  return (
    <div className="card stack">
      <h3>Ziel: {duel.game.target.label}</h3>
      {[duel.playerA, duel.playerB].map((id) => {
        const r = duel.results?.[id];
        return (
          <div key={id} className="row between">
            <b>{byId[id]?.avatar} {byId[id]?.name}</b>
            <span className="balance">{!r ? 'sucht…' : r.ms == null ? '❌ nicht geschafft' : `${(r.ms / 1000).toFixed(2)}s`}</span>
          </div>
        );
      })}
    </div>
  );
}

export const Compass = { Play: ({ duel, submit }) => <Play duel={duel} submit={(d) => submit(null, d)} />, Stage: Review, Review };
