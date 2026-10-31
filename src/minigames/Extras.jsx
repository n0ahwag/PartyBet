import { useEffect, useMemo, useRef, useState } from 'react';
import { CountdownView, Waiting } from './shared.jsx';
import { setupCanvas, canvasWidth, useArcade, ReadyView, auto } from './Arcade.jsx';
import {
  levelFromRms, LEVEL, BALLOON, balloonGrowth, shapePoints, traceScore, traceAccuracy, SHAPE_LABELS,
  WIRE, makeWire, wireProgress, HIGHER_LOWER_SETS, higherLowerCorrect, PRICE_ITEMS, parsePrice,
} from '../game/extras.js';
import { priceTagError } from '../game/gameLibrary.js';
import { requestOrientationPermission } from '../lib/device.js';
import { num } from './format.js';
import { sfx, vibrate } from '../lib/sound.js';
import { t, locale } from '../i18n/index.js';

/*
 * Erweiterungs-Spiele: Pegel-Treffer, Atem-Ballon (Mikrofon), Linie halten, Heißer Draht,
 * Höher oder Tiefer, Preisschild. Alle laufen im Duell und in der Gruppe.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ Mikrofon
/** Öffnet das Mikrofon (ohne Rauschunterdrückung) und liefert den geglätteten Pegel 0…100. */
async function openMic() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  await ctx.resume();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 1024;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  let smooth = 0;
  return {
    level() {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const l = levelFromRms(Math.sqrt(sum / buf.length));
      smooth = smooth * 0.7 + l * 0.3;
      return smooth;
    },
    close() {
      stream.getTracks().forEach((tr) => tr.stop());
      ctx.close().catch(() => {});
    },
  };
}

/** Mikrofon für die Dauer des Spiels; Fehler (verweigert) → error. */
function useMic() {
  const mic = useRef(null);
  const [error, setError] = useState(false);
  useEffect(() => () => mic.current?.close(), []);
  const open = async () => {
    try { mic.current = await openMic(); return true; } catch { setError(true); return false; }
  };
  return { mic, error, open };
}

function MicDenied({ onGiveUp }) {
  return (
    <div className="stack">
      <Waiting text={`🎤 ${t('Kein Zugriff aufs Mikrofon. Erlaube den Zugriff in den Browser-Einstellungen und lade neu – oder gib diese Runde auf.')}`} />
      <button className="btn soft" onClick={onGiveUp}>🏳️ {t('Aufgeben')}</button>
    </div>
  );
}

// ------------------------------------------------------------------ Pegel-Treffer
function LevelHit({ duel, submit }) {
  const { lo, hi } = duel.game.zone;
  const { mic, error, open } = useMic();
  const { step, setStep, n, start } = useArcade(open);
  const [level, setLevel] = useState(0);
  const [inMs, setInMs] = useState(0);
  const [left, setLeft] = useState(LEVEL.durationMs);

  useEffect(() => {
    if (step !== 'run' || !mic.current) return undefined;
    const t0 = performance.now();
    let last = t0;
    let inside = 0;
    let raf = 0;
    const loop = (now) => {
      const l = mic.current.level();
      const dt = now - last;
      last = now;
      if (l >= lo && l <= hi) inside += dt;
      setLevel(l);
      setInMs(inside);
      const el = now - t0;
      setLeft(Math.max(0, LEVEL.durationMs - el));
      if (el >= LEVEL.durationMs) {
        const ms = Math.round(inside);
        submit({ inMs: ms });
        mic.current?.close();
        sfx.tusch();
        setStep('done');
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <MicDenied onGiveUp={() => { submit({ inMs: 0, denied: true }); setStep('done'); }} />;
  if (step === 'ready') return <ReadyView start={start} label={`🎤 ${t('Mikrofon freigeben & starten')}`} text={t('Bring den Pegel mit deiner Stimme in die grüne Zone und halte ihn dort – summen, singen oder rufen. 8 Sekunden.')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('{n} s in der Zone! Warte auf die anderen…', { n: num(inMs / 1000, 1) })} />;
  const inside = level >= lo && level <= hi;
  return (
    <div className="stack center">
      <div className="level-meter">
        <div className="level-zone" style={{ bottom: `${lo}%`, height: `${hi - lo}%` }} />
        <div className={`level-fill ${inside ? 'in' : ''}`} style={{ height: `${level}%` }} />
      </div>
      <div className="row between" style={{ width: '100%', fontWeight: 800 }}>
        <span>{inside ? `✅ ${t('In der Zone!')}` : level < lo ? `⬆️ ${t('Lauter!')}` : `⬇️ ${t('Leiser!')}`}</span>
        <span>{num(inMs / 1000, 1)} s · ⏱ {Math.ceil(left / 1000)}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Atem-Ballon
function Balloon({ size, popped }) {
  const r = 18 + size * 92;
  return (
    <svg viewBox="0 0 240 260" style={{ width: '100%', maxWidth: 280 }}>
      {popped ? (
        <g fill="#E11D48">
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <path key={i} d={`M${120 + Math.cos(a) * 30} ${120 + Math.sin(a) * 30}l${Math.cos(a) * 30} ${Math.sin(a) * 30}l8 -4z`} />;
          })}
          <text x="120" y="130" textAnchor="middle" fontSize="44" fontWeight="900" fill="#2D3047">PENG!</text>
        </g>
      ) : (
        <>
          <path d={`M120 ${130 + r} q-6 30 4 60 q10 30 -4 60`} stroke="#2D3047" strokeWidth="2" fill="none" />
          <ellipse cx="120" cy="130" rx={r * 0.88} ry={r} fill="#E11D48" />
          <ellipse cx={120 - r * 0.35} cy={130 - r * 0.45} rx={r * 0.16} ry={r * 0.24} fill="#fff" opacity="0.45" />
          <path d={`M114 ${128 + r} h12 l-6 9z`} fill="#BE123C" />
        </>
      )}
    </svg>
  );
}

function BreathBalloon({ duel, submit }) {
  const { mic, error, open } = useMic();
  const { step, setStep, n, start } = useArcade(open);
  const [size, setSize] = useState(0);
  const [popped, setPopped] = useState(false);
  const [left, setLeft] = useState(BALLOON.timeMs);
  const stopRef = useRef(false);
  const sizeRef = useRef(0);

  const finish = (pop) => {
    if (stopRef.current) return;
    stopRef.current = true;
    mic.current?.close();
    const s = Math.round(sizeRef.current * 100);
    submit({ size: pop ? 0 : s, popped: pop });
    if (pop) { sfx.fail(); vibrate([200, 60, 200]); } else sfx.tusch();
    setTimeout(() => setStep('done'), pop ? 1200 : 0);
  };

  useEffect(() => {
    if (step !== 'run' || !mic.current) return undefined;
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const loop = (now) => {
      if (stopRef.current) return;
      const dt = (now - last) / 1000;
      last = now;
      sizeRef.current = Math.min(1, sizeRef.current + balloonGrowth(mic.current.level(), dt));
      setSize(sizeRef.current);
      setLeft(Math.max(0, BALLOON.timeMs - (now - t0)));
      if (sizeRef.current >= duel.game.popAt) { setPopped(true); finish(true); return; }
      if (now - t0 >= BALLOON.timeMs) { finish(false); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <MicDenied onGiveUp={() => { submit({ size: 0, popped: true, denied: true }); setStep('done'); }} />;
  if (step === 'ready') return <ReadyView start={start} label={`🎤 ${t('Mikrofon freigeben & starten')}`} text={t('Puste ins Mikrofon (unten am Handy), um den Ballon aufzublasen. Tippe auf „Stopp“, bevor er platzt – die Grenze ist geheim!')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={popped ? `💥 ${t('Geplatzt! Warte auf die anderen…')}` : t('Ballon-Größe {n} %! Warte auf die anderen…', { n: Math.round(size * 100) })} />;
  return (
    <div className="stack center">
      <Balloon size={size} popped={popped} />
      <div className="row between" style={{ width: '100%', fontWeight: 800 }}>
        <span>🎈 {Math.round(size * 100)} %</span>
        <span>⏱ {Math.ceil(left / 1000)} s</span>
      </div>
      <button className="btn primary lg block" disabled={popped} onClick={() => finish(false)}>✋ {t('Stopp!')}</button>
    </div>
  );
}

// ------------------------------------------------------------------ Linie halten
function TraceLine({ duel, submit }) {
  const path = useMemo(() => shapePoints(duel.game.shape), [duel.game.shape]);
  const { step, setStep, n, start } = useArcade();
  const [trace, setTrace] = useState([]);
  const [left, setLeft] = useState(duel.game.limitMs);
  const [result, setResult] = useState(null);
  const drawing = useRef(false);
  const traceRef = useRef([]);
  const doneRef = useRef(false);
  const svgRef = useRef(null);
  const size = Math.min(340, canvasWidth());

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const r = traceScore(path, traceRef.current);
    setResult(r);
    submit({ ...r });
    sfx.tusch();
    setTimeout(() => setStep('done'), 1400);
  };

  useEffect(() => {
    if (step !== 'run') return undefined;
    const t0 = performance.now();
    const iv = setInterval(() => {
      const l = duel.game.limitMs - (performance.now() - t0);
      setLeft(Math.max(0, l));
      if (l <= 0) { clearInterval(iv); finish(); }
    }, 100);
    return () => clearInterval(iv);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const toLocal = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 300, ((e.clientY - r.top) / r.height) * 300];
  };
  const down = (e) => {
    if (doneRef.current || traceRef.current.length) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    traceRef.current = [toLocal(e)];
    setTrace(traceRef.current);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const p = toLocal(e);
    const lastP = traceRef.current[traceRef.current.length - 1];
    if (Math.hypot(p[0] - lastP[0], p[1] - lastP[1]) < 2) return;
    traceRef.current = [...traceRef.current, p];
    setTrace(traceRef.current);
  };
  const up = () => { if (drawing.current) { drawing.current = false; finish(); } };

  if (step === 'ready') return <ReadyView start={start} text={t('Fahre die Form mit einem Finger in einem Zug nach. Absetzen beendet den Versuch – also erst loslassen, wenn du fertig bist!')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('Genauigkeit {n} %! Warte auf die anderen…', { n: traceAccuracy(result?.score ?? 999) })} />;
  const pts = (arr) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <div className="stack center">
      <div className="row between" style={{ width: size, fontWeight: 800 }}>
        <span>{t(SHAPE_LABELS[duel.game.shape])}</span>
        <span>⏱ {Math.ceil(left / 1000)} s</span>
      </div>
      <svg ref={svgRef} viewBox="0 0 300 300" className="trace-pad" style={{ width: size, height: size, touchAction: 'none' }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <polyline points={pts(path)} fill="none" stroke="var(--line)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pts(path)} fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeDasharray="6 6" />
        <circle cx={path[0][0]} cy={path[0][1]} r="9" fill="#16A34A" />
        {trace.length > 1 && <polyline points={pts(trace)} fill="none" stroke="#0D9488" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {result
        ? <b>{t('Genauigkeit {n} %', { n: traceAccuracy(result.score) })}</b>
        : <p className="small muted" style={{ margin: 0 }}>{t('Am grünen Punkt anfangen, dann in einem Zug nachfahren.')}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ Heißer Draht
function HotWire({ duel, submit }) {
  const path = useMemo(() => makeWire(duel.game.seed), [duel.game.seed]);
  const { step, setStep, n, start } = useArcade(() => requestOrientationPermission());
  const [res, setRes] = useState(null);
  const canvasRef = useRef(null);
  const tilt = useRef({ x: 0, y: 0 });
  const keys = useRef({ x: 0, y: 0 });
  const W = Math.min(330, canvasWidth());
  const sc = W / WIRE.w;
  const H = WIRE.h * sc;

  useEffect(() => {
    if (step !== 'run') return undefined;
    const ctx = setupCanvas(canvasRef.current, W, H);
    const onTilt = (e) => { if (e.gamma != null) tilt.current = { x: clamp(e.gamma / 25, -1, 1), y: clamp((e.beta - 20) / 25, -1, 1) }; };
    const keyMap = { ArrowLeft: ['x', -1], ArrowRight: ['x', 1], ArrowUp: ['y', -1], ArrowDown: ['y', 1] };
    const kd = (e) => { const k = keyMap[e.key]; if (k) { e.preventDefault(); keys.current[k[0]] = k[1]; } };
    const ku = (e) => { const k = keyMap[e.key]; if (k && keys.current[k[0]] === k[1]) keys.current[k[0]] = 0; };
    window.addEventListener('deviceorientation', onTilt);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const ball = { x: path[0][0], y: path[0][1] };
    let touches = 0;
    let safeUntil = 0;
    let best = 0;
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const end = path[path.length - 1];

    const draw = (hit) => {
      ctx.fillStyle = '#FEF3C7'; ctx.fillRect(0, 0, W, H);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const line = (w, c) => {
        ctx.strokeStyle = c; ctx.lineWidth = w * sc; ctx.beginPath();
        path.forEach(([x, y], i) => (i ? ctx.lineTo(x * sc, y * sc) : ctx.moveTo(x * sc, y * sc)));
        ctx.stroke();
      };
      line(WIRE.half * 2 + 6, hit ? '#DC2626' : '#B45309');
      line(WIRE.half * 2, '#FFFBEB');
      ctx.fillStyle = '#16A34A'; ctx.beginPath(); ctx.arc(end[0] * sc, end[1] * sc, 11 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `900 ${12 * sc}px Outfit, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🏁', end[0] * sc, end[1] * sc);
      ctx.fillStyle = '#F59E0B'; ctx.beginPath(); ctx.arc(ball.x * sc, ball.y * sc, WIRE.ball * sc, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2D3047'; ctx.lineWidth = 2; ctx.stroke();
    };

    const loop = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const elapsed = now - t0;
      const cx = keys.current.x || tilt.current.x;
      const cy = keys.current.y || tilt.current.y;
      ball.x += cx * WIRE.speed * 14 * dt;
      ball.y += cy * WIRE.speed * 14 * dt;
      ball.x = clamp(ball.x, 0, WIRE.w);
      ball.y = clamp(ball.y, 0, WIRE.h);
      const pr = wireProgress(path, ball.x, ball.y);
      best = Math.max(best, pr.progress);
      let hit = false;
      if (pr.dist > WIRE.half - WIRE.ball && now > safeUntil) {
        touches += 1;
        hit = true;
        safeUntil = now + 700;
        sfx.fail(); vibrate(120);
        ball.x = pr.point[0]; ball.y = pr.point[1];
      } else if (pr.dist > WIRE.half - WIRE.ball) { ball.x = pr.point[0]; ball.y = pr.point[1]; }
      draw(hit || now < safeUntil);
      ctx.fillStyle = '#2D3047'; ctx.font = '900 15px Outfit, system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`⏱ ${num(elapsed / 1000, 1)} s  ·  ⚡ ${touches}`, 8, 6);
      if (Math.hypot(ball.x - end[0], ball.y - end[1]) < 12) {
        const r = { ms: Math.round(elapsed), touches, progress: 1 };
        setRes(r); submit(r); sfx.tusch(); setStep('done');
        return;
      }
      if (elapsed >= WIRE.timeMs) {
        const r = { ms: null, touches, progress: Math.round(best * 100) / 100 };
        setRes(r); submit(r); sfx.fail(); setStep('done');
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('deviceorientation', onTilt);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'ready') return <ReadyView start={start} label={t('Sensor freigeben & starten')} text={t('Neige dein Handy, um die Kugel durch den Draht ins Ziel 🏁 zu rollen. Jede Wandberührung kostet 2 Sekunden.')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') {
    return <Waiting text={res?.ms != null
      ? t('Im Ziel nach {s} s mit {n} Berührungen! Warte auf die anderen…', { s: num(res.ms / 1000, 1), n: res.touches })
      : t('Zeit um – {p} % geschafft. Warte auf die anderen…', { p: Math.round((res?.progress ?? 0) * 100) })} />;
  }
  return (
    <div className="stack center" style={{ userSelect: 'none' }}>
      <canvas ref={canvasRef} className="arcade-canvas" style={{ width: W, height: H }} />
      <p className="small muted" style={{ margin: 0 }}>{t('Neigen zum Steuern (am PC: Pfeiltasten)')}</p>
    </div>
  );
}

// ------------------------------------------------------------------ Höher oder Tiefer
const fmtValue = (v, unit) => `${v.toLocaleString(locale())}${unit ? ` ${t(unit)}` : ''}`;

function HigherLower({ duel, submit }) {
  const set = HIGHER_LOWER_SETS[duel.game.setIdx];
  const order = duel.game.order;
  const { step, setStep, n, start } = useArcade();
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(null); // { ok }
  const t0 = useRef(0);
  const [final, setFinal] = useState(null);

  useEffect(() => { if (step === 'run') t0.current = performance.now(); }, [step]);

  const item = (k) => set.items[order[k]];
  const done = (streak) => {
    const r = { streak, ms: Math.round(performance.now() - t0.current) };
    setFinal(r); submit(r);
    setTimeout(() => setStep('done'), 1300);
  };
  const guess = (g) => {
    if (reveal) return;
    const ok = higherLowerCorrect(duel.game, i, g);
    setReveal({ ok });
    if (ok) { sfx.tap(); vibrate(30); } else { sfx.fail(); vibrate(200); }
    if (!ok) { done(i); return; }
    if (i + 1 >= order.length - 1) { sfx.tusch(); done(i + 1); return; }
    setTimeout(() => { setI(i + 1); setReveal(null); }, 900);
  };

  if (step === 'ready') return <ReadyView start={start} text={`${t('Thema')}: ${t(set.topic)}. ${t('Ist der nächste Wert höher oder tiefer? Ein Fehler beendet die Serie.')}`} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('Serie: {n} richtig! Warte auf die anderen…', { n: final?.streak ?? 0 })} />;
  const a = item(i);
  const b = item(i + 1);
  return (
    <div className="stack">
      <div className="row between"><span className="kicker">{t(set.topic)}</span><b>🔥 {i}</b></div>
      <div className="card center stack" style={{ gap: 4 }}>
        <h3 style={{ margin: 0 }}>{t(a[0])}</h3>
        <div className="big-number" style={{ fontSize: 34 }}>{fmtValue(a[1], set.unit)}</div>
      </div>
      <div className={`card tinted center stack ${reveal ? (reveal.ok ? 'good' : 'bad') : ''}`} style={{ gap: 4 }}>
        <h3 style={{ margin: 0 }}>{t(b[0])}</h3>
        <div className="big-number" style={{ fontSize: 34 }}>{reveal ? `${reveal.ok ? '✅' : '❌'} ${fmtValue(b[1], set.unit)}` : '?'}</div>
      </div>
      <div className="grid-2">
        <button className="btn primary lg" disabled={!!reveal} onClick={() => guess('higher')}>⬆️ {t('Höher')}</button>
        <button className="btn soft lg" disabled={!!reveal} onClick={() => guess('lower')}>⬇️ {t('Tiefer')}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Preisschild
function PriceTag({ duel, submit }) {
  const items = duel.game.items.map((idx) => PRICE_ITEMS[idx]);
  const [k, setK] = useState(0);
  const [val, setVal] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [sent, setSent] = useState(null);
  if (sent != null) return <Waiting text={t('Abgegeben 🤫 Im Schnitt {n} % daneben – warte auf die anderen…', { n: num(sent, 1) })} />;
  const item = items[k];
  const value = parsePrice(val);
  const next = () => {
    const g = [...guesses, value];
    setVal('');
    if (g.length < items.length) { setGuesses(g); setK(k + 1); sfx.tap(); return; }
    const error = priceTagError(duel.game, g);
    submit({ guesses: g, error });
    sfx.betJingle();
    setSent(error);
  };
  return (
    <div className="stack">
      <div className="kicker center">{t('Preis {a} von {b}', { a: k + 1, b: items.length })}</div>
      <div className="card tinted center stack">
        <div style={{ fontSize: 44 }}>🏷️</div>
        <h2 style={{ fontSize: 22, lineHeight: 1.2 }}>{t(item.q)}</h2>
      </div>
      <input className="input" inputMode="decimal" placeholder={`${t('Dein Tipp')} (${t(item.unit)})`} value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^0-9.,]/g, ''))} />
      <button className="btn primary lg" disabled={!Number.isFinite(value) || value <= 0} onClick={next}>
        {k + 1 < items.length ? t('Weiter') : t('Geheim abgeben')}
      </button>
    </div>
  );
}

export const ExtraGames = {
  levelHit: auto(LevelHit),
  breathBalloon: auto(BreathBalloon),
  traceLine: auto(TraceLine),
  hotWire: auto(HotWire),
  higherLower: auto(HigherLower),
  priceTag: auto(PriceTag),
};
