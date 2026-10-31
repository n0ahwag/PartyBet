import { useEffect, useMemo, useRef, useState } from 'react';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { ResultList } from './Anywhere.jsx';
import {
  RUN, makeCourse, stepRunner, runMeters, STACK, dropBlock, stackSpeed,
  JUMP, chargeAt, angleAt, jumpDistance, SKY, makePlatforms,
} from '../game/arcade.js';
import { requestOrientationPermission } from '../lib/device.js';
import { num } from './format.js';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

/*
 * Arcade-Minispiele (Canvas): Pixel-Sprint, Block-Stacker, Weitsprung-Challenge, Vertikal-Jumper.
 * Alle Level kommen aus duel.game.seed → jeder spielt denselben Parcours. Läuft im Duell und in der Gruppe.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Canvas in Gerätepixeln; liefert den 2D-Kontext in CSS-Pixeln. */
function setupCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

const canvasWidth = () => Math.min(360, (typeof window !== 'undefined' ? window.innerWidth : 360) - 40);

/** Gemeinsamer Ablauf: Bereit → 3-2-1 → Spiel → Ergebnis. */
function useArcade(onReady) {
  const [step, setStep] = useState('ready');
  const n = useGo(step === 'count', () => setStep('run'));
  return { step, setStep, n, start: async () => { await onReady?.(); setStep('count'); } };
}

function ReadyView({ text, start, label }) {
  return (
    <div className="stack">
      <Waiting text={text} />
      <button className="btn primary lg" onClick={start}>{label ?? t('Bereit')}</button>
    </div>
  );
}

// ------------------------------------------------------------------ Pixel-Sprint
function PixelSprint({ duel, submit }) {
  const course = useMemo(() => makeCourse(duel.game.seed), [duel.game.seed]);
  const { step, setStep, n, start } = useArcade();
  const [score, setScore] = useState(null);
  const canvasRef = useRef(null);
  const jump = useRef(false);
  const W = canvasWidth();
  const H = 210;

  useEffect(() => {
    if (step !== 'run') return undefined;
    const ctx = setupCanvas(canvasRef.current, W, H);
    let st = { dist: 0, y: 0, vy: 0, speed: RUN.startSpeed, alive: true };
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const ground = H - 34;
    const onKey = (e) => { if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); jump.current = true; } };
    window.addEventListener('keydown', onKey);

    const draw = (elapsed) => {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#BFE3FF'); sky.addColorStop(1, '#FDF2E9');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // Parallax-Hügel
      ctx.fillStyle = '#C7E9B4';
      for (let i = -1; i < 4; i++) {
        const x = i * 160 - ((st.dist * 0.3) % 160);
        ctx.beginPath(); ctx.arc(x + 80, ground + 20, 70, Math.PI, 0); ctx.fill();
      }
      ctx.fillStyle = '#8B6B4A'; ctx.fillRect(0, ground, W, H - ground);
      ctx.fillStyle = '#6FA352'; ctx.fillRect(0, ground, W, 6);
      // Hindernisse
      for (const o of course) {
        const sx = o.x - st.dist + RUN.runnerX;
        if (sx > W) break;
        if (sx + o.w < 0) continue;
        ctx.fillStyle = o.h > 30 ? '#DC2626' : '#F97316';
        ctx.fillRect(sx, ground - o.h, o.w, o.h);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(sx + 3, ground - o.h + 3, 5, o.h - 6);
      }
      // Läufer (Pixel-Figur)
      const rx = RUN.runnerX;
      const ry = ground - RUN.runnerH - st.y;
      const legs = st.y > 0 ? 0 : Math.floor(elapsed / 90) % 2;
      ctx.fillStyle = '#2D3047';
      ctx.fillRect(rx + 6, ry, 16, 14); // Kopf
      ctx.fillStyle = '#fff'; ctx.fillRect(rx + 16, ry + 4, 4, 4);
      ctx.fillStyle = '#7C3AED'; ctx.fillRect(rx + 4, ry + 14, 20, 12); // Körper
      ctx.fillStyle = '#2D3047';
      ctx.fillRect(rx + (legs ? 6 : 10), ry + 26, 5, 8);
      ctx.fillRect(rx + (legs ? 16 : 13), ry + 26, 5, 8);
      // Anzeige
      ctx.fillStyle = '#2D3047'; ctx.font = '900 18px Outfit, system-ui'; ctx.textAlign = 'right';
      ctx.fillText(`${runMeters(st.dist)} m`, W - 10, 26);
    };

    const loop = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (jump.current && st.y <= 0) sfx.tap();
      st = stepRunner(st, dt, jump.current, course);
      jump.current = false;
      const elapsed = now - t0;
      draw(elapsed);
      if (!st.alive || elapsed >= RUN.maxMs) {
        const m = runMeters(st.dist);
        setScore(m);
        submit({ m, ms: Math.round(elapsed) });
        if (st.alive) sfx.tusch(); else { sfx.fail(); vibrate(200); }
        setStep('done');
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'ready') return <ReadyView start={start} text={t('Tippe irgendwo auf das Spielfeld, um über die Hindernisse zu springen. Es wird immer schneller!')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('{n} m geschafft! Warte auf die anderen…', { n: score })} />;
  return (
    <div className="stack center" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => { e.preventDefault(); jump.current = true; }}>
      <canvas ref={canvasRef} className="arcade-canvas" style={{ width: W, height: H }} />
      <p className="small muted" style={{ margin: 0 }}>👆 {t('Tippen = springen')}</p>
    </div>
  );
}

// ------------------------------------------------------------------ Block-Stacker
function BlockStacker({ duel, submit }) {
  const seed = duel.game.seed;
  const { step, setStep, n, start } = useArcade();
  const [res, setRes] = useState(null);
  const canvasRef = useRef(null);
  const tap = useRef(false);
  const W = canvasWidth();
  const H = 380;
  const scale = W / STACK.width;

  useEffect(() => {
    if (step !== 'run') return undefined;
    const ctx = setupCanvas(canvasRef.current, W, H);
    const base = { x: (STACK.width - STACK.startW) / 2, w: STACK.startW };
    const blocks = [base];
    let cur = { x: 0, w: STACK.startW, dir: 1 };
    let speed = stackSpeed(seed, 1);
    let perfects = 0;
    let falling = null; // abgeschnittenes Stück
    let cam = 0;
    let last = performance.now();
    let raf = 0;
    let over = false;
    const onKey = (e) => { if (e.code === 'Space') { e.preventDefault(); tap.current = true; } };
    window.addEventListener('keydown', onKey);
    const B = STACK.blockH;

    const finish = () => {
      over = true;
      const floors = blocks.length - 1;
      setRes({ floors, perfects });
      submit({ floors, perfects });
      sfx.tusch();
      setTimeout(() => setStep('done'), 900);
    };

    const draw = () => {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1E1B4B'); bg.addColorStop(1, '#4C1D95');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const yOf = (i) => H - 30 - (i + 1) * B + cam;
      const color = (i) => `hsl(${(i * 23) % 360} 80% 62%)`;
      blocks.forEach((b, i) => {
        const y = yOf(i);
        if (y > H || y < -B) return;
        ctx.fillStyle = color(i); ctx.fillRect(b.x * scale, y, b.w * scale, B - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(b.x * scale, y, b.w * scale, 4);
      });
      if (!over) {
        const y = yOf(blocks.length);
        ctx.fillStyle = color(blocks.length); ctx.fillRect(cur.x * scale, y, cur.w * scale, B - 2);
      }
      if (falling) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(falling.x * scale, falling.y, falling.w * scale, B - 2);
      }
      ctx.fillStyle = '#fff'; ctx.font = '900 22px Outfit, system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`${blocks.length - 1}`, W / 2, 34);
    };

    const loop = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (!over) {
        cur.x += cur.dir * speed * dt;
        if (cur.x < -cur.w * 0.6) { cur.x = -cur.w * 0.6; cur.dir = 1; }
        if (cur.x > STACK.width - cur.w * 0.4) { cur.x = STACK.width - cur.w * 0.4; cur.dir = -1; }
        if (tap.current) {
          tap.current = false;
          const top = blocks.at(-1);
          const r = dropBlock(top, cur);
          if (!r.placed) {
            falling = { x: cur.x, w: cur.w, y: H - 30 - (blocks.length + 1) * B + cam };
            sfx.fail(); vibrate(200);
            finish();
          } else {
            const cutW = cur.w - r.placed.w;
            if (cutW > 0) falling = { x: cur.x < top.x ? cur.x : r.placed.x + r.placed.w, w: cutW, y: H - 30 - (blocks.length + 1) * B + cam };
            blocks.push(r.placed);
            if (r.perfect) { perfects += 1; sfx.coins(); vibrate([20, 30, 20]); } else { sfx.tap(); vibrate(15); }
            if (blocks.length - 1 >= STACK.maxFloors) finish();
            const floor = blocks.length;
            speed = stackSpeed(seed, floor);
            cur = { x: floor % 2 ? -r.placed.w * 0.6 : STACK.width - r.placed.w * 0.4, w: r.placed.w, dir: floor % 2 ? 1 : -1 };
          }
        }
        // Kamera folgt dem Turm
        const target = Math.max(0, (blocks.length + 2) * B - (H - 120));
        cam += (target - cam) * Math.min(1, dt * 6);
      }
      if (falling) { falling.y += 380 * dt; if (falling.y > H) falling = null; }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'ready') return <ReadyView start={start} text={t('Ein Block schwebt hin und her. Tippe, um ihn genau auf den Turm fallen zu lassen – was übersteht, wird abgeschnitten. Wie hoch kommst du?')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('{n} Stockwerke ({p}× perfekt) – warte auf die anderen…', { n: res.floors, p: res.perfects })} />;
  return (
    <div className="stack center" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => { e.preventDefault(); tap.current = true; }}>
      <canvas ref={canvasRef} className="arcade-canvas" style={{ width: W, height: H }} />
      <p className="small muted" style={{ margin: 0 }}>👆 {t('Tippen = Block fallen lassen')}</p>
    </div>
  );
}

// ------------------------------------------------------------------ Weitsprung-Challenge
function LongJump({ duel, submit }) {
  const { chargeMs, angleMs } = duel.game;
  const { step, setStep, n, start } = useArcade();
  const [phase, setPhase] = useState('idle'); // idle | charging | angle | flying
  const [jumps, setJumps] = useState([]);
  const [, force] = useState(0);
  const st = useRef({ t: 0, v: 0, deg: 0, fly: 0, landed: false });
  const canvasRef = useRef(null);
  const W = canvasWidth();
  const H = 220;

  // Zeichnen + Animation
  useEffect(() => {
    if (step !== 'run') return undefined;
    const ctx = setupCanvas(canvasRef.current, W, H);
    let raf = 0;
    const pitX = 70;
    const mPx = (W - pitX - 20) / 9.5; // Meter → Pixel
    const ground = H - 40;
    const loop = (now) => {
      const s = st.current;
      const el = now - s.t;
      ctx.fillStyle = '#DFF3FF'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#C2410C'; ctx.fillRect(0, ground, pitX, H - ground); // Anlaufbahn
      ctx.fillStyle = '#FDE68A'; ctx.fillRect(pitX, ground, W - pitX, H - ground); // Sand
      ctx.fillStyle = '#fff'; ctx.fillRect(pitX - 3, ground, 3, H - ground);
      ctx.fillStyle = '#92400E'; ctx.font = '700 10px Outfit, system-ui'; ctx.textAlign = 'center';
      for (let m = 2; m <= 9; m++) { ctx.fillRect(pitX + m * mPx, ground, 1, 6); ctx.fillText(`${m}`, pitX + m * mPx, ground + 18); }
      // bisherige Weiten
      jumps.forEach((d, i) => { ctx.fillStyle = ['#7C3AED', '#0EA5E9', '#16A34A'][i]; ctx.fillRect(pitX + d * mPx - 2, ground - 4, 4, 8); });
      let jx = pitX - 12;
      let jy = ground - 18;
      if (phase === 'charging') {
        s.v = chargeAt(el, chargeMs);
        jx = 12 + (pitX - 30) * ((el / 700) % 1);
      }
      if (phase === 'angle') {
        s.deg = angleAt(el, angleMs);
        const a = (s.deg * Math.PI) / 180;
        ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pitX, ground - 10); ctx.lineTo(pitX + Math.cos(a) * 60, ground - 10 - Math.sin(a) * 60); ctx.stroke();
      }
      if (phase === 'flying') {
        const p = Math.min(1, el / 1100);
        const dist = s.fly;
        const a = (s.deg * Math.PI) / 180;
        jx = pitX + dist * mPx * p - 8;
        jy = ground - 18 - Math.sin(Math.PI * p) * Math.max(20, dist * mPx * Math.tan(a) / 4);
        if (p >= 1 && !s.landed) {
          s.landed = true; // nur einmal werten, auch wenn bis zum Neuzeichnen noch Frames laufen
          const next = [...jumps, dist];
          setJumps(next);
          sfx.tusch();
          if (next.length >= JUMP.attempts) {
            submit({ best: Math.max(...next), jumps: next });
            setTimeout(() => setStep('done'), 700);
          }
          setPhase('idle');
        }
      }
      // Springer
      ctx.fillStyle = '#2D3047'; ctx.fillRect(jx, jy, 14, 18);
      ctx.fillStyle = '#F2B48C'; ctx.beginPath(); ctx.arc(jx + 7, jy - 6, 6, 0, Math.PI * 2); ctx.fill();
      // Tempo-Balken
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(12, 14, W - 24, 12);
      ctx.fillStyle = s.v > 0.9 ? '#16A34A' : s.v > 0.6 ? '#F59E0B' : '#DC2626';
      ctx.fillRect(12, 14, (W - 24) * (phase === 'idle' ? 0 : s.v), 12);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, phase, jumps]); // eslint-disable-line react-hooks/exhaustive-deps

  const down = (e) => {
    e.preventDefault();
    const s = st.current;
    if (phase === 'idle' && jumps.length < JUMP.attempts) { s.t = performance.now(); s.v = 0; setPhase('charging'); sfx.tick(); }
    else if (phase === 'angle') {
      s.deg = angleAt(performance.now() - s.t, angleMs);
      s.fly = jumpDistance(s.v, s.deg);
      s.t = performance.now();
      s.landed = false;
      vibrate(30);
      setPhase('flying');
    }
  };
  const up = (e) => {
    e.preventDefault();
    const s = st.current;
    if (phase === 'charging') { s.v = chargeAt(performance.now() - s.t, chargeMs); s.t = performance.now(); setPhase('angle'); force((x) => x + 1); sfx.tick(); }
  };

  if (step === 'ready') return <ReadyView start={start} text={t('3 Versuche: Finger gedrückt halten, um Tempo aufzuladen – loslassen, wenn der Balken voll ist. Dann tippen, wenn der Winkel bei ca. 45° steht. Der weiteste Sprung zählt.')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('Bester Sprung: {n} m – warte auf die anderen…', { n: num(Math.max(...jumps)) })} />;
  const hint = phase === 'idle' ? t('Gedrückt halten = Anlauf') : phase === 'charging' ? t('Loslassen = Absprung!') : phase === 'angle' ? t('Tippen = Winkel festlegen') : '…';
  return (
    <div className="stack center" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={down} onPointerUp={up}>
      <canvas ref={canvasRef} className="arcade-canvas" style={{ width: W, height: H }} />
      <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
        {Array.from({ length: JUMP.attempts }, (_, i) => (
          <span key={i} className={`pill ${jumps[i] != null ? 'good' : ''}`}>{jumps[i] != null ? `${num(jumps[i])} m` : `${t('Versuch')} ${i + 1}`}</span>
        ))}
      </div>
      <b>👆 {hint}</b>
    </div>
  );
}

// ------------------------------------------------------------------ Vertikal-Jumper
function SkyJumper({ duel, submit }) {
  const platforms = useMemo(() => makePlatforms(duel.game.seed), [duel.game.seed]);
  const { step, setStep, n, start } = useArcade(() => requestOrientationPermission());
  const [score, setScore] = useState(null);
  const canvasRef = useRef(null);
  const ctl = useRef({ tilt: null, touch: 0, keys: 0 });
  const W = canvasWidth();
  const H = 430;
  const sc = W / SKY.width;

  useEffect(() => {
    if (step !== 'run') return undefined;
    const ctx = setupCanvas(canvasRef.current, W, H);
    const c = ctl.current;
    const onTilt = (e) => { if (e.gamma != null) c.tilt = clamp(e.gamma / 25, -1, 1); };
    const onKey = (down) => (e) => {
      if (e.key === 'ArrowLeft') c.keys = down ? -1 : (c.keys === -1 ? 0 : c.keys);
      if (e.key === 'ArrowRight') c.keys = down ? 1 : (c.keys === 1 ? 0 : c.keys);
    };
    const kd = onKey(true);
    const ku = onKey(false);
    window.addEventListener('deviceorientation', onTilt);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const p = { x: SKY.width / 2 - 12, y: 40, vx: 0, vy: SKY.bounceV };
    let best = 0;
    let cam = 0;
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const platX = (pl, time) => (pl.moving ? clamp(pl.x + Math.sin(time / 700 + pl.y) * pl.moving, 0, SKY.width - pl.w) : pl.x);

    const loop = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const elapsed = now - t0;
      const control = c.touch || c.keys || (c.tilt ?? 0);
      p.vx = control * 330;
      p.x += p.vx * dt;
      if (p.x < -24) p.x = SKY.width;
      if (p.x > SKY.width) p.x = -24;
      const prevY = p.y;
      p.vy -= SKY.gravity * dt;
      p.y += p.vy * dt;
      if (p.vy < 0) {
        for (const pl of platforms) {
          if (pl.y > prevY + 2) break;
          if (pl.y < p.y - 2) continue;
          const px = platX(pl, elapsed);
          if (prevY >= pl.y && p.y <= pl.y && p.x + 20 > px && p.x + 4 < px + pl.w) {
            p.y = pl.y; p.vy = SKY.bounceV; sfx.tap();
            break;
          }
        }
      }
      best = Math.max(best, p.y);
      cam = Math.max(cam, p.y - H / sc * 0.45);
      // Zeichnen (Welt-y nach oben → Bildschirm-y nach unten)
      const sy = (y) => H - (y - cam) * sc;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      const k = Math.min(1, best / 6000);
      bg.addColorStop(0, `hsl(${210 + k * 50} 70% ${82 - k * 55}%)`); bg.addColorStop(1, '#E0F2FE');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (const pl of platforms) {
        const y = sy(pl.y);
        if (y < -20) break;
        if (y > H + 20) continue;
        const px = platX(pl, elapsed) * sc;
        ctx.fillStyle = pl.moving ? '#F97316' : '#16A34A';
        ctx.beginPath(); ctx.roundRect(px, y, pl.w * sc, 10, 5); ctx.fill();
      }
      const py = sy(p.y);
      ctx.fillStyle = '#7C3AED'; ctx.beginPath(); ctx.roundRect(p.x * sc, py - 26, 24 * sc, 26, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(p.x * sc + 6 * sc, py - 20, 4, 5); ctx.fillRect(p.x * sc + 14 * sc, py - 20, 4, 5);
      ctx.fillStyle = '#2D3047'; ctx.font = '900 18px Outfit, system-ui'; ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(best / 10)} m`, W - 10, 26);
      if (p.y < cam - 40 || elapsed >= SKY.maxMs) {
        const m = Math.floor(best / 10);
        setScore(m);
        submit({ m, ms: Math.round(elapsed) });
        if (elapsed >= SKY.maxMs) sfx.tusch(); else { sfx.fail(); vibrate(200); }
        setStep('done');
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

  const touch = (e) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    ctl.current.touch = e.clientX < r.left + r.width / 2 ? -1 : 1;
  };
  if (step === 'ready') return <ReadyView start={start} label={t('Sensor freigeben & starten')} text={t('Hüpf von Plattform zu Plattform immer höher! Steuern: Handy neigen – oder links/rechts auf den Bildschirm drücken. Nicht runterfallen!')} />;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={t('{n} m hoch geklettert! Warte auf die anderen…', { n: score })} />;
  return (
    <div className="stack center" style={{ userSelect: 'none', touchAction: 'none' }}
      onPointerDown={touch} onPointerMove={(e) => e.buttons && touch(e)} onPointerUp={() => { ctl.current.touch = 0; }} onPointerLeave={() => { ctl.current.touch = 0; }}>
      <canvas ref={canvasRef} className="arcade-canvas" style={{ width: W, height: H }} />
      <p className="small muted" style={{ margin: 0 }}>{t('Neigen oder links/rechts drücken')}</p>
    </div>
  );
}

// ------------------------------------------------------------------ Exporte
const auto = (Comp) => ({
  Play: ({ duel, submit }) => <Comp duel={duel} submit={(d) => submit(null, d)} />,
  Stage: ResultList,
  Review: ResultList,
});

export const ArcadeGames = {
  pixelRun: auto(PixelSprint),
  blockStacker: auto(BlockStacker),
  longJump: auto(LongJump),
  skyJumper: auto(SkyJumper),
};
