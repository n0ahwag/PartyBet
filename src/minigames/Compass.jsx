import { useEffect, useRef, useState } from 'react';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { requestOrientationPermission } from '../lib/device.js';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

const TOLERANCE = 12;
const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

/** Spiel 7 – Kompass-Axt: Als Erster in die Zielrichtung ausrichten und kurz halten. Ein Pfeil zeigt den Weg. */
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
        <Waiting text={t('Halte das Handy flach vor dich. Gleich erscheint eine Himmelsrichtung – dreh dich dorthin!')} />
        <button className="btn primary lg" onClick={async () => { await requestOrientationPermission(); setStep('count'); }}>{t('Kompass freigeben & starten')}</button>
      </div>
    );
  }
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('Erledigt! Warte auf dein Gegenüber…')} />;

  // Pfeil zeigt zur Zielrichtung (relativ zur Blickrichtung des Handys); oben = richtig ausgerichtet
  const rel = heading == null ? 0 : ((target.deg - heading + 540) % 360) - 180;
  const onTarget = heading != null && Math.abs(rel) <= TOLERANCE;
  return (
    <div className="stack center">
      <div className="kicker">{t('Richte dich aus nach')}</div>
      <div className="big-number">{t(target.label)}</div>
      <div style={{ width: 230, height: 230, borderRadius: '50%', position: 'relative', margin: '0 auto', background: 'var(--card)',
        border: `6px solid ${onTarget ? '#16A34A' : 'var(--line)'}`, boxShadow: onTarget ? '0 0 0 8px rgba(22,163,74,0.18)' : 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
        {/* Markierung oben: hierhin muss der Pfeil zeigen */}
        <div style={{ position: 'absolute', left: '50%', top: -16, transform: 'translateX(-50%)', width: 0, height: 0,
          borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: `16px solid ${onTarget ? '#16A34A' : 'var(--ink-faint)'}` }} />
        <svg viewBox="-100 -100 200 200" width="100%" height="100%" style={{ position: 'absolute', inset: 0, transform: `rotate(${rel}deg)`, transition: 'transform 0.12s linear' }}>
          <path d="M0 -82 L34 -22 L12 -22 L12 46 L-12 46 L-12 -22 L-34 -22 Z" fill={onTarget ? '#16A34A' : 'var(--accent)'} stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
        </svg>
        <div style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', fontWeight: 900, fontSize: 18 }}>
          {heading == null ? '…' : `${Math.round(heading)}°`}
        </div>
      </div>
      <div className="bar" style={{ width: '100%' }}><div style={{ width: `${holding * 100}%`, background: onTarget ? '#16A34A' : undefined }} /></div>
      <p className="muted small" style={{ margin: 0 }}>{onTarget ? `✅ ${t('Richtig! Jetzt still halten…')}` : t('Dreh dich, bis der Pfeil nach oben zeigt – dann still halten.')}</p>
      {noSensor && <button className="btn ghost sm" onClick={() => { st.current.done = true; submit({ ms: null }); setStep('done'); }}>{t('Kein Kompass – aufgeben')}</button>}
    </div>
  );
}

function Review({ duel, byId }) {
  return (
    <div className="card stack">
      <h3>{t('Ziel')}: {t(duel.game.target.label)}</h3>
      {[duel.playerA, duel.playerB].map((id) => {
        const r = duel.results?.[id];
        return (
          <div key={id} className="row between">
            <b>{byId[id]?.avatar} {byId[id]?.name}</b>
            <span className="balance">{!r ? t('sucht…') : r.ms == null ? `❌ ${t('nicht geschafft')}` : `${(r.ms / 1000).toFixed(2)}s`}</span>
          </div>
        );
      })}
    </div>
  );
}

export const Compass = { Play: ({ duel, submit }) => <Play duel={duel} submit={(d) => submit(null, d)} />, Stage: Review, Review };
