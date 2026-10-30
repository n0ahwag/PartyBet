import { useEffect, useMemo, useRef, useState } from 'react';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { ResultList } from './Anywhere.jsx';
import { requestMotionPermission, requestOrientationPermission } from '../lib/device.js';
import {
  headingOf, makeRotationTracker, verticalAccel, makeLiftTracker, stretchScore, lumaOf, isCovered,
  tiltError, makeMaze, stepBall, inGoal, BALL_R,
} from '../game/sensors.js';
import { num } from './format.js';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

/*
 * Sensor-Spiele: Wasserwaage, Tresor-Dreher, Höhen-Strecker, Lichtsensor-Blitz, Kugel-Labyrinth.
 * Jede Komponente läuft im Duell und in der Gruppe (liest nur duel.game) und meldet ein Ergebnis.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Freigabe-Schritt (iOS braucht eine Tipp-Geste für Sensoren). Eine Ablehnung blockiert nicht:
 * Kommen danach keine Sensorwerte, erscheint im Spiel der Hinweis mit "Aufgeben".
 */
function PermStep({ text, onGo, kind = 'motion', label }) {
  return (
    <div className="stack">
      <Waiting text={text} />
      <button className="btn primary lg" onClick={async () => {
        if (kind === 'orientation') await requestOrientationPermission();
        else await requestMotionPermission();
        onGo();
      }}>{label ?? t('Sensor freigeben & starten')}</button>
    </div>
  );
}

/** Erkennt, ob nach 2 s noch kein Sensorwert kam. */
function useNoSensor(active, gotRef) {
  const [none, setNone] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    const tm = setTimeout(() => { if (!gotRef.current) setNone(true); }, 2200);
    return () => clearTimeout(tm);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return none;
}

// ------------------------------------------------------------------ 1. Virtuelle Wasserwaage
function SpiritLevel({ duel, submit }) {
  const { target, toleranceDeg, durationMs } = duel.game;
  const [step, setStep] = useState('perm');
  const [live, setLive] = useState({ db: 0, dg: 0, err: 99, cur: 0, best: 0, left: durationMs });
  const st = useRef({ tilt: null, since: null, best: 0, done: false });
  const got = useRef(false);
  const n = useGo(step === 'count', () => setStep('run'));
  const noSensor = useNoSensor(step === 'run', got);

  useEffect(() => {
    if (step !== 'count' && step !== 'run') return undefined;
    const on = (e) => { if (e.beta != null) { got.current = true; st.current.tilt = { beta: e.beta, gamma: e.gamma }; } };
    window.addEventListener('deviceorientation', on);
    return () => window.removeEventListener('deviceorientation', on);
  }, [step]);

  const finish = () => {
    const s = st.current;
    if (s.done) return;
    s.done = true;
    submit({ bestMs: Math.round(s.best) });
    sfx.gong(); vibrate(250);
    setStep('done');
  };

  useEffect(() => {
    if (step !== 'run') return undefined;
    const s = st.current;
    const t0 = performance.now();
    const iv = setInterval(() => {
      const now = performance.now();
      let cur = 0;
      let err = 99;
      if (s.tilt) {
        err = tiltError(s.tilt.beta, s.tilt.gamma, target);
        if (err <= toleranceDeg) {
          if (s.since == null) { s.since = now; vibrate(15); }
          cur = now - s.since;
          if (cur >= 3000 && s.best < 3000) sfx.coins();
          s.best = Math.max(s.best, cur);
        } else s.since = null;
      }
      const left = Math.max(0, durationMs - (now - t0));
      setLive({ db: s.tilt ? s.tilt.beta - target.beta : 0, dg: s.tilt ? s.tilt.gamma - target.gamma : 0, err, cur, best: s.best, left });
      if (left <= 0) finish();
    }, 40);
    return () => clearInterval(iv);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'perm') return <PermStep kind="orientation" onGo={() => setStep('count')} text={t('Gleich erscheint eine Wasserwaage mit schiefer Ziel-Neigung. Kipp dein Handy, bis die Blase in der Mitte sitzt – und halte still!')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('Gemessen! Warte auf die anderen…')} />;

  const K = 5; // px pro Grad
  const ring = toleranceDeg * K * 2 + 34;
  const inside = live.err <= toleranceDeg;
  return (
    <div className="stack center">
      <div className="bar" style={{ width: '100%' }}><div style={{ width: `${(live.left / durationMs) * 100}%` }} /></div>
      <div style={{ width: 260, height: 260, borderRadius: '50%', margin: '0 auto', position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(circle at 40% 35%, #e9fbf3, #b9ecd6 70%, #8fd9b9)', border: '8px solid var(--ink)', boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(0,0,0,0.15)' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(0,0,0,0.15)' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: ring, height: ring, borderRadius: '50%', transform: 'translate(-50%,-50%)',
          border: `3px solid ${inside ? '#16A34A' : 'rgba(0,0,0,0.35)'}` }} />
        <div className="level-bubble" style={{ position: 'absolute', left: '50%', top: '50%', width: 34, height: 34, borderRadius: '50%',
          background: inside ? 'radial-gradient(circle at 35% 30%, #fff, #4ade80)' : 'radial-gradient(circle at 35% 30%, #fff, #d1fae5)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)', transition: 'transform 0.05s linear',
          transform: `translate(calc(-50% + ${clamp(-live.dg * K, -110, 110)}px), calc(-50% + ${clamp(-live.db * K, -110, 110)}px))` }} />
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        <span className={`pill ${inside ? 'good' : ''}`}>{t('Am Stück')}: {num(live.cur / 1000, 1)} s</span>
        <span className="pill accent">{t('Bestwert')}: {num(live.best / 1000, 1)} s</span>
      </div>
      {live.best >= 3000 && <b style={{ color: '#16A34A' }}>✅ {t('3 Sekunden zitterfrei geschafft – weiter so!')}</b>}
      {noSensor && <NoSensor onGiveUp={() => { st.current.best = 0; finish(); }} />}
    </div>
  );
}

function NoSensor({ onGiveUp, text }) {
  return (
    <div className="card flat stack center" style={{ gap: 6 }}>
      <span className="small muted">{text ?? t('Kein Sensor erkannt. Läuft die Seite auf einem Handy und ist der Sensor freigegeben?')}</span>
      <button className="btn ghost sm" onClick={onGiveUp}>{t('Aufgeben')}</button>
    </div>
  );
}

// ------------------------------------------------------------------ 2. Tresor-Dreher
function SafeCracker({ duel, submit }) {
  const { degrees, timeoutMs } = duel.game;
  const [step, setStep] = useState('perm');
  const [total, setTotal] = useState(0);
  const [left, setLeft] = useState(timeoutMs);
  const st = useRef({ tracker: makeRotationTracker(), done: false, t0: 0 });
  const got = useRef(false);
  const n = useGo(step === 'count', () => { st.current.t0 = performance.now(); st.current.tracker = makeRotationTracker(); setStep('run'); });
  const noSensor = useNoSensor(step === 'run', got);

  const finish = (ms) => {
    const s = st.current;
    if (s.done) return;
    s.done = true;
    submit({ ms, degrees: Math.round(clamp(s.tracker.total, 0, degrees)) });
    if (ms != null) { sfx.tusch(); vibrate([100, 60, 300]); } else sfx.fail();
    setStep('done');
  };

  useEffect(() => {
    if (step !== 'count' && step !== 'run') return undefined;
    const s = st.current;
    const on = (e) => {
      const h = headingOf(e);
      if (h == null) return;
      got.current = true;
      const before = Math.floor(Math.max(0, s.tracker.total) / 30);
      const tot = s.tracker.push(h);
      if (step === 'count') return;
      if (Math.floor(Math.max(0, tot) / 30) > before) { sfx.tick(); vibrate(12); } // Klicken wie ein Zahlenschloss
      setTotal(tot);
      if (tot >= degrees) finish(Math.round(performance.now() - s.t0));
    };
    window.addEventListener('deviceorientation', on);
    return () => window.removeEventListener('deviceorientation', on);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 'run') return undefined;
    const iv = setInterval(() => {
      const l = Math.max(0, timeoutMs - (performance.now() - st.current.t0));
      setLeft(l);
      if (l <= 0) finish(null);
    }, 100);
    return () => clearInterval(iv);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'perm') return <PermStep kind="orientation" onGo={() => setStep('count')} label={t('Kompass freigeben & starten')} text={t('Halte dein Handy flach vor dich. Nach dem Countdown: dreh dich einmal komplett im Uhrzeigersinn – so schnell du kannst!')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={total >= degrees ? `🔓 ${t('Tresor geknackt! Warte auf die anderen…')}` : t('Zeit um! Warte auf die anderen…')} />;

  const p = clamp(total / degrees, 0, 1);
  const R = 118;
  const C = 2 * Math.PI * R;
  return (
    <div className="stack center">
      <div className="kicker">{t('Dreh dich im Uhrzeigersinn!')} ↻</div>
      <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto' }}>
        <svg width="260" height="260" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="130" cy="130" r={R} fill="none" stroke="var(--line)" strokeWidth="10" />
          <circle cx="130" cy="130" r={R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} />
        </svg>
        <div style={{ position: 'absolute', inset: 22, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #6b7280, #1f2937)',
          boxShadow: 'inset 0 -6px 14px rgba(0,0,0,0.4), 0 6px 18px rgba(0,0,0,0.25)', transform: `rotate(${-total}deg)` }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: '50%', top: 6, height: 'calc(50% - 6px)', transformOrigin: 'bottom center', transform: `translateX(-50%) rotate(${i * 30}deg)` }}>
              <div style={{ width: 3, height: i % 3 ? 10 : 18, background: '#e5e7eb', borderRadius: 2 }} />
              {i % 3 === 0 && <div style={{ color: '#e5e7eb', fontWeight: 900, fontSize: 14, transform: 'translateX(-40%)' }}>{i * 5}</div>}
            </div>
          ))}
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 56, height: 56, borderRadius: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle at 35% 30%, #9ca3af, #374151)' }} />
        </div>
        <div style={{ position: 'absolute', left: '50%', top: -4, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '16px solid var(--accent)' }} />
      </div>
      <div className="big-number" style={{ fontSize: 44 }}>{Math.round(clamp(total, 0, degrees))}° <span className="faint" style={{ fontSize: 22 }}>/ {degrees}°</span></div>
      <p className="small muted" style={{ margin: 0 }}>{t('Noch {n} s', { n: Math.ceil(left / 1000) })} · {t('Gegen den Uhrzeigersinn zählt rückwärts.')}</p>
      {noSensor && <NoSensor onGiveUp={() => finish(null)} text={t('Kein Kompass erkannt. Läuft die Seite auf einem Handy und ist der Sensor freigegeben?')} />}
    </div>
  );
}

// ------------------------------------------------------------------ 3. Höhen-Strecker
function HeightStretch({ duel, submit }) {
  const { holdMs } = duel.game;
  const [step, setStep] = useState('perm'); // perm | ready | count | go | hold | done
  const [view, setView] = useState({ heightCm: 0, wobble: 0, left: holdMs });
  const [result, setResult] = useState(null);
  const st = useRef(null);
  const got = useRef(false);
  const n = useGo(step === 'count', () => { st.current.goAt = performance.now(); setStep('go'); });
  const noSensor = useNoSensor(step === 'go', got);

  const finish = (r) => {
    if (st.current.done) return;
    st.current.done = true;
    const res = { ...r, score: stretchScore(r) };
    submit(res);
    setResult(res);
    sfx.tusch(); vibrate(300);
    setStep('done');
  };

  useEffect(() => {
    if (step !== 'count') return;
    st.current = { lift: makeLiftTracker(), goAt: null, holdAt: null, last: null, sum: 0, n: 0, done: false };
  }, [step]);

  useEffect(() => {
    if (!['count', 'go', 'hold'].includes(step)) return undefined;
    const s = st.current;
    const on = (e) => {
      got.current = true;
      const now = performance.now();
      if (step === 'go' && s.goAt != null) {
        s.lift.push(verticalAccel(e.acceleration, e.accelerationIncludingGravity), now);
        if (s.lift.done) { s.holdAt = now; setView((v) => ({ ...v, heightCm: s.lift.heightCm })); setStep('hold'); }
      }
      if (step === 'hold') {
        const a = e.accelerationIncludingGravity;
        if (a?.x != null) {
          if (s.last) { s.sum += Math.hypot(a.x - s.last.x, a.y - s.last.y, a.z - s.last.z); s.n += 1; }
          s.last = { x: a.x, y: a.y, z: a.z };
        }
      }
    };
    window.addEventListener('devicemotion', on);
    return () => window.removeEventListener('devicemotion', on);
  }, [step]);

  useEffect(() => {
    const s = st.current;
    if (step === 'go') {
      // Wer nach 3 s nicht losgelegt hat, geht ohne Höhe in die Ruhephase
      const tm = setTimeout(() => { if (!s.lift.started) { s.holdAt = performance.now(); setStep('hold'); } }, 3000);
      return () => clearTimeout(tm);
    }
    if (step === 'hold') {
      const iv = setInterval(() => {
        const left = Math.max(0, holdMs - (performance.now() - s.holdAt));
        setView((v) => ({ ...v, left, wobble: s.n ? s.sum / s.n : 0 }));
        if (left <= 0) {
          finish({
            heightCm: s.lift.heightCm,
            reactionMs: s.lift.started ? Math.round(s.lift.startedAt - s.goAt) : null,
            wobble: Number((s.n ? s.sum / s.n : 9).toFixed(3)),
          });
        }
      }, 100);
      return () => clearInterval(iv);
    }
    return undefined;
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'perm') return <PermStep onGo={() => setStep('ready')} text={t('Halte dein Handy mit beiden Händen auf Brusthöhe, Bildschirm zu dir.')} />;
  if (step === 'ready') {
    return (
      <div className="stack">
        <Waiting text={t('Ganz ruhig auf Brusthöhe halten. Bei „HOCH!“ so schnell wie möglich senkrecht nach oben strecken – und oben ruhig halten!')} />
        <button className="btn primary lg" onClick={() => setStep('count')}>{t('Bereit')}</button>
      </div>
    );
  }
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') {
    return (
      <div className="stack">
        <div className="card center stack pop" style={{ gap: 4 }}>
          <div className="kicker">{t('Deine Punkte')}</div>
          <div className="big-number">{result.score}</div>
          <div className="small muted">{t('ca. {n} cm Hub', { n: result.heightCm })} · {result.reactionMs == null ? '–' : `${result.reactionMs} ms`} · {t('Wackel-Wert')} {result.wobble.toFixed(2)}</div>
        </div>
        <Waiting text={t('Gemessen! Warte auf die anderen…')} />
      </div>
    );
  }
  if (step === 'go') {
    return (
      <div className="stack center">
        <div className="countdown-big pop">⬆️</div>
        <div className="big-number">{t('HOCH!')}</div>
        {noSensor && <NoSensor onGiveUp={() => finish({ heightCm: 0, reactionMs: null, wobble: 9 })} />}
      </div>
    );
  }
  return (
    <div className="stack center">
      <div className="kicker">{t('Oben ruhig halten!')}</div>
      <div className="big-number">{num(view.left / 1000, 1)} s</div>
      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        <span className="pill accent">{t('ca. {n} cm Hub', { n: view.heightCm })}</span>
        <span className="pill">{t('Wackel-Wert')} {view.wobble.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 4. Lichtsensor-Blitz

/** Helligkeit messen: echter Umgebungslicht-Sensor, wenn der Browser ihn anbietet, sonst Frontkamera. */
async function openLightMeter(onValue) {
  if ('AmbientLightSensor' in window) {
    try {
      const sensor = new window.AmbientLightSensor({ frequency: 30 });
      await new Promise((ok, fail) => {
        sensor.onreading = () => { onValue(sensor.illuminance); ok(); };
        sensor.onerror = (e) => fail(e.error);
        sensor.start();
        setTimeout(() => fail(new Error('timeout')), 1500);
      });
      return { kind: 'sensor', stop: () => sensor.stop() };
    } catch { /* weiter mit der Kamera */ }
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 160, height: 120 }, audio: false });
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.srcObject = stream;
  await video.play();
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 24;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let raf = 0;
  const loop = () => {
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, 32, 24);
      onValue(lumaOf(ctx.getImageData(0, 0, 32, 24).data));
    }
    raf = requestAnimationFrame(loop);
  };
  loop();
  return { kind: 'camera', stop: () => { cancelAnimationFrame(raf); stream.getTracks().forEach((tr) => tr.stop()); } };
}

function LightFlash({ duel, submit }) {
  const { delayMs, timeoutMs } = duel.game;
  const [step, setStep] = useState('ready'); // ready | loading | calib | wait | signal | done
  const [level, setLevel] = useState(0);
  const [manual, setManual] = useState(false);
  const [res, setRes] = useState(null);
  const st = useRef({ value: 0, baseline: null, samples: [], signalAt: 0, meter: null, done: false });

  const finish = (r) => {
    const s = st.current;
    if (s.done) return;
    s.done = true;
    submit(r);
    setRes(r);
    if (r.ms != null) { sfx.tusch(); vibrate(200); } else sfx.fail();
    setStep('done');
  };

  useEffect(() => () => st.current.meter?.stop(), []);
  useEffect(() => { if (step === 'done') st.current.meter?.stop(); }, [step]);

  const start = async () => {
    setStep('loading');
    try {
      st.current.meter = await openLightMeter((v) => { st.current.value = v; });
    } catch {
      setManual(true); // ohne Sensor: auf den Bildschirm tippen
    }
    setStep('calib');
  };

  // Messschleife: Kalibrieren → Warten (Frühstart?) → Signal → abgedeckt?
  useEffect(() => {
    if (!['calib', 'wait', 'signal'].includes(step)) return undefined;
    const s = st.current;
    const t0 = performance.now();
    if (step === 'signal') { s.signalAt = t0; sfx.go(); vibrate(60); }
    const iv = setInterval(() => {
      const now = performance.now();
      const v = s.value;
      if (step === 'calib') {
        s.samples.push(v);
        if (now - t0 > 1300) { s.baseline = s.samples.slice(5).reduce((a, b) => a + b, 0) / Math.max(1, s.samples.length - 5); setStep('wait'); }
      } else if (!manual && step === 'wait' && isCovered(v, s.baseline)) {
        finish({ jumpStart: true, ms: null, sensor: s.meter?.kind });
      } else if (step === 'wait' && now - t0 > delayMs) {
        setStep('signal');
      } else if (!manual && step === 'signal' && isCovered(v, s.baseline)) {
        finish({ ms: Math.round(now - s.signalAt), sensor: s.meter?.kind });
      } else if (step === 'signal' && now - t0 > timeoutMs) {
        finish({ ms: null, sensor: s.meter?.kind ?? 'tap' });
      }
      if (s.baseline) setLevel(clamp(v / s.baseline, 0, 1.2));
      else setLevel(v ? 1 : 0);
    }, 16);
    return () => clearInterval(iv);
  }, [step, manual]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = () => {
    if (!manual) return;
    if (step === 'wait') finish({ jumpStart: true, ms: null, sensor: 'tap' });
    else if (step === 'signal') finish({ ms: Math.round(performance.now() - st.current.signalAt), sensor: 'tap' });
  };

  if (step === 'ready') {
    return (
      <div className="stack">
        <Waiting text={t('Leg das Handy vor dich ins Licht, Hand weg von der Oberseite. Sobald das Signal kommt: Sensor oben am Handy blitzschnell mit dem Handteller abdecken!')} />
        <button className="btn primary lg" onClick={start}>{t('Sensor freigeben & starten')}</button>
      </div>
    );
  }
  if (step === 'loading') return <Waiting text={t('Sensor wird gestartet…')} />;
  if (step === 'done') {
    return (
      <div className="stack">
        <div className="card center pop">
          <div className="big-number">{res.jumpStart ? `🚫 ${t('Frühstart')}` : res.ms == null ? t('zu spät') : `${res.ms} ms`}</div>
        </div>
        <Waiting text={t('Warte auf die anderen…')} />
      </div>
    );
  }
  const signal = step === 'signal';
  return (
    <div className="stack center" onPointerDown={tap}
      style={{ minHeight: 360, borderRadius: 28, padding: 24, justifyContent: 'center', transition: 'background 0.05s',
        background: signal ? 'var(--accent)' : 'var(--bg-soft)', color: signal ? '#fff' : 'var(--ink)', userSelect: 'none' }}>
      {signal ? (
        <>
          <div style={{ fontSize: 96, lineHeight: 1 }}>✋</div>
          <div className="big-number" style={{ fontSize: 52 }}>{manual ? t('TIPPEN!') : t('ABDECKEN!')}</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 64, lineHeight: 1 }}>💡</div>
          <b style={{ fontSize: 22 }}>{step === 'calib' ? t('Messe das Licht…') : t('Warte auf das Signal… Hand weg!')}</b>
        </>
      )}
      {!manual && (
        <div style={{ width: '80%', margin: '12px auto 0' }}>
          <div className="small" style={{ opacity: 0.8 }}>{t('Helligkeit')}</div>
          <div className="bar" style={{ background: 'rgba(0,0,0,0.12)' }}><div style={{ width: `${(level / 1.2) * 100}%`, background: signal ? '#fff' : 'var(--accent)' }} /></div>
        </div>
      )}
      {manual && <p className="small" style={{ margin: 0, opacity: 0.8 }}>{t('Kein Licht-Sensor verfügbar – tippe stattdessen auf die Fläche.')}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ 5. Kugel-Labyrinth
function MarbleMaze({ duel, submit }) {
  const { seed, timeoutMs } = duel.game;
  const maze = useMemo(() => makeMaze(seed), [seed]);
  const [step, setStep] = useState('perm');
  const [left, setLeft] = useState(timeoutMs);
  const [noSensor, setNoSensor] = useState(false);
  const canvasRef = useRef(null);
  const st = useRef({ tilt: { x: 0, y: 0 }, neutral: null, keys: {}, ball: null, done: false, got: false });
  const n = useGo(step === 'count', () => setStep('run'));

  const size = Math.min(340, (typeof window !== 'undefined' ? window.innerWidth : 360) - 56);
  const cell = size / maze.cols;
  const height = cell * maze.rows;

  const finish = (ms) => {
    const s = st.current;
    if (s.done) return;
    s.done = true;
    submit({ ms });
    if (ms != null) { sfx.tusch(); vibrate([80, 40, 250]); } else sfx.fail();
    setStep('done');
  };

  // Neigung (relativ zur Haltung beim Start) + Pfeiltasten als Ersatz am Computer
  useEffect(() => {
    if (step !== 'count' && step !== 'run') return undefined;
    const s = st.current;
    const on = (e) => {
      if (e.beta == null) return;
      s.got = true;
      if (step === 'count' || s.neutral == null) s.neutral = e.beta; // aktuelle Haltung = "flach"
      const rad = Math.PI / 180;
      s.tilt = { x: Math.sin(clamp(e.gamma, -60, 60) * rad), y: Math.sin(clamp(e.beta - s.neutral, -60, 60) * rad) };
    };
    const key = (down) => (e) => {
      if (!e.key.startsWith('Arrow')) return;
      e.preventDefault();
      s.keys[e.key] = down;
      s.got = true;
      s.tilt = { x: (s.keys.ArrowRight ? 0.5 : 0) - (s.keys.ArrowLeft ? 0.5 : 0), y: (s.keys.ArrowDown ? 0.5 : 0) - (s.keys.ArrowUp ? 0.5 : 0) };
    };
    const kd = key(true);
    const ku = key(false);
    window.addEventListener('deviceorientation', on);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('deviceorientation', on); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [step]);

  // Physik + Zeichnen
  useEffect(() => {
    if (step !== 'run') return undefined;
    const s = st.current;
    s.ball = { x: maze.start.c + 0.5, y: maze.start.r + 0.5, vx: 0, vy: 0 };
    const ctx = canvasRef.current.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = size * dpr;
    canvasRef.current.height = height * dpr;
    ctx.scale(dpr, dpr);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7C3AED';
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const noSensorTimer = setTimeout(() => { if (!s.got) setNoSensor(true); }, 2500);

    const draw = () => {
      ctx.clearRect(0, 0, size, height);
      ctx.fillStyle = '#F3E9DC';
      ctx.fillRect(0, 0, size, height);
      // Ziel
      const gx = (maze.goal.c + 0.5) * cell;
      const gy = (maze.goal.r + 0.5) * cell;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(maze.goal.c * cell + 3, maze.goal.r * cell + 3, cell - 6, cell - 6);
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(gx, gy, cell * 0.3, 0, Math.PI * 2); ctx.fillStyle = '#2D3047'; ctx.fill();
      ctx.beginPath(); ctx.arc(gx, gy, cell * 0.18, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
      // Wände
      ctx.strokeStyle = '#8B5E34';
      ctx.lineWidth = Math.max(4, cell * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      maze.walls.forEach((row, r) => row.forEach((w, c) => {
        const x = c * cell;
        const y = r * cell;
        if (w.n) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y); }
        if (w.w) { ctx.moveTo(x, y); ctx.lineTo(x, y + cell); }
        if (w.s && r === maze.rows - 1) { ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell); }
        if (w.e && c === maze.cols - 1) { ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); }
      }));
      maze.walls.forEach((row, r) => row.forEach((w, c) => {
        if (w.s && r < maze.rows - 1) { ctx.moveTo(c * cell, (r + 1) * cell); ctx.lineTo((c + 1) * cell, (r + 1) * cell); }
        if (w.e && c < maze.cols - 1) { ctx.moveTo((c + 1) * cell, r * cell); ctx.lineTo((c + 1) * cell, (r + 1) * cell); }
      }));
      ctx.stroke();
      // Kugel
      const bx = s.ball.x * cell;
      const by = s.ball.y * cell;
      const br = BALL_R * cell;
      ctx.beginPath(); ctx.arc(bx + 2, by + 3, br, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
      const grad = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.35, '#cbd5e1'); grad.addColorStop(1, '#475569');
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
    };

    const loop = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      // in kleinen Schritten rechnen, damit die Kugel nicht durch Wände tunnelt
      for (let i = 0; i < 4; i++) s.ball = stepBall(s.ball, s.tilt, dt / 4, maze);
      draw();
      const elapsed = now - t0;
      if (inGoal(s.ball, maze)) return finish(Math.round(elapsed));
      if (elapsed > timeoutMs) return finish(null);
      setLeft(timeoutMs - elapsed);
      raf = requestAnimationFrame(loop);
      return undefined;
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); clearTimeout(noSensorTimer); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'perm') return <PermStep kind="orientation" onGo={() => setStep('count')} text={t('Halte dein Handy bequem vor dich – diese Haltung gilt als „flach“. Dann durch Neigen die Kugel ins Ziel rollen!')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('Fertig! Warte auf die anderen…')} />;
  return (
    <div className="stack center">
      <div className="row between" style={{ width: size, margin: '0 auto' }}>
        <span className="kicker">{t('Kugel ins Ziel kippen!')}</span>
        <span className="pill">{Math.ceil(left / 1000)} s</span>
      </div>
      <canvas ref={canvasRef} style={{ width: size, height, borderRadius: 16, margin: '0 auto', display: 'block', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', border: '6px solid #A47148' }} />
      {noSensor && <NoSensor onGiveUp={() => finish(null)} text={t('Kein Neigungssensor erkannt – am Computer gehen auch die Pfeiltasten.')} />}
    </div>
  );
}

// ------------------------------------------------------------------ Exporte
const auto = (Comp) => ({
  Play: ({ duel, submit }) => <Comp duel={duel} submit={(d) => submit(null, d)} />,
  Stage: ResultList,
  Review: ResultList,
});

export const SensorGames = {
  spiritLevel: auto(SpiritLevel),
  safeCracker: auto(SafeCracker),
  heightStretch: auto(HeightStretch),
  lightFlash: auto(LightFlash),
  marbleMaze: auto(MarbleMaze),
};
