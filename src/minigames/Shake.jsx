import { useEffect, useRef, useState } from 'react';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { requestMotionPermission } from '../lib/device.js';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

const HIGH = 22; // m/s² – deutlich über der Erdbeschleunigung
const LOW = 13;

/** Spiel 6 – Schüttel-Manie: Ausschläge der Beschleunigung in 5 s zählen (mit Hysterese). */
function Play({ duel, submit }) {
  const [step, setStep] = useState('perm');
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState(duel.game.durationMs);
  const [noSensor, setNoSensor] = useState(false);
  const st = useRef({ armed: true, n: 0, events: 0, last: 0 });
  const n = useGo(step === 'count', () => setStep('run'));

  useEffect(() => {
    if (step !== 'run') return undefined;
    const s = st.current;
    Object.assign(s, { armed: true, n: 0, events: 0, last: 0 });
    const started = performance.now();
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      s.events += 1;
      const m = Math.hypot(a.x, a.y, a.z);
      if (s.armed && m > HIGH && performance.now() - s.last > 90) {
        s.n += 1;
        s.armed = false;
        s.last = performance.now();
        setCount(s.n);
      } else if (m < LOW) {
        s.armed = true;
      }
    };
    window.addEventListener('devicemotion', onMotion);
    const tick = setInterval(() => {
      const l = Math.max(0, duel.game.durationMs - (performance.now() - started));
      setLeft(l);
      if (l < duel.game.durationMs - 1000 && s.events === 0) setNoSensor(true);
      if (l <= 0) {
        clearInterval(tick);
        window.removeEventListener('devicemotion', onMotion);
        submit({ shakes: s.n });
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
        <Waiting text={t('Handy fest in die Hand – gleich 5 Sekunden lang schütteln, was das Zeug hält!')} />
        <button className="btn primary lg" onClick={async () => { await requestMotionPermission(); setStep('count'); }}>{t('Bereit')}</button>
      </div>
    );
  }
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('{n} Schüttler! Warte auf dein Gegenüber…', { n: count })} />;
  return (
    <div className="stack center">
      <div className="countdown-big pop" key={count}>{count}</div>
      <div className="big-number" style={{ fontSize: 32 }}>{(left / 1000).toFixed(1)}s</div>
      {noSensor ? (
        <button className="btn soft lg block" onPointerDown={() => { st.current.n += 1; setCount(st.current.n); }}>
          {t('Kein Sensor – hier tippen')}
        </button>
      ) : <p className="muted" style={{ fontWeight: 700 }}>{t('SCHÜTTELN!')} 🫨</p>}
    </div>
  );
}

function Review({ duel, byId }) {
  return (
    <div className="card stack">
      <h3>{t('Schüttler in 5 Sekunden')}</h3>
      {[duel.playerA, duel.playerB].map((id) => (
        <div key={id} className="row between">
          <b>{byId[id]?.avatar} {byId[id]?.name}</b>
          <span className="balance">{duel.results?.[id] ? duel.results[id].shakes : t('schüttelt…')}</span>
        </div>
      ))}
      {duel.sabotage && <p className="small muted" style={{ margin: 0 }}>🧪 {t('Sabotage: {name} zählt nur 85 %.', { name: byId[duel.sabotage.target]?.name })}</p>}
    </div>
  );
}

export const Shake = { Play: ({ duel, submit }) => <Play duel={duel} submit={(d) => submit(null, d)} />, Stage: Review, Review };
