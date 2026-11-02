import { useEffect, useRef } from 'react';
import { GAMES } from '../../game/gameLibrary.js';
import { RACE, track, trackAt, carXY, raceItems, raceOrder } from '../../game/screen/racer.js';
import { submitResultField } from '../../game/groupEngine.js';
import { TvFrame, PadFrame, useNow, Booting, useCanvas, useWidth, usePhaseSound, secsLeft } from './ui.jsx';
import { sfx, vibrate } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

function drawTrack(ctx, sc, items) {
  const { pts } = track();
  const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * sc, y * sc) : ctx.moveTo(x * sc, y * sc))); ctx.closePath(); };
  // Wiese mit Muster
  ctx.fillStyle = '#4d7c0f'; ctx.fillRect(0, 0, RACE.world.w * sc, RACE.world.h * sc);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let x = 0; x < RACE.world.w; x += 40) ctx.fillRect(x * sc, 0, 20 * sc, RACE.world.h * sc);
  // Randsteine (rot/weiß), Asphalt, Mittellinie
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  path(); ctx.strokeStyle = '#fff'; ctx.lineWidth = (RACE.half * 2 + 14) * sc; ctx.stroke();
  path(); ctx.strokeStyle = '#dc2626'; ctx.setLineDash([14 * sc, 14 * sc]); ctx.stroke(); ctx.setLineDash([]);
  path(); ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = RACE.half * 2 * sc; ctx.stroke();
  path(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2 * sc; ctx.setLineDash([16 * sc, 18 * sc]); ctx.stroke(); ctx.setLineDash([]);
  // Start/Ziel (Schachbrett)
  const s0 = trackAt(0);
  for (let i = -4; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff';
      const px = s0.x + s0.nx * (i + 0.5) * (RACE.half / 4) + s0.tx * (j * 6 - 6);
      const py = s0.y + s0.ny * (i + 0.5) * (RACE.half / 4) + s0.ty * (j * 6 - 6);
      ctx.fillRect((px - 3) * sc, (py - 3) * sc, 6 * sc, 6 * sc);
    }
  }
  for (const it of items) {
    const p = carXY(it.s, it.d);
    if (it.type === 'oil') { ctx.fillStyle = 'rgba(17,17,17,.85)'; ctx.beginPath(); ctx.ellipse(p.x * sc, p.y * sc, 13 * sc, 9 * sc, p.angle, 0, 7); ctx.fill(); }
    if (it.type === 'cone') { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(p.x * sc, (p.y - 9) * sc); ctx.lineTo((p.x + 7) * sc, (p.y + 6) * sc); ctx.lineTo((p.x - 7) * sc, (p.y + 6) * sc); ctx.fill(); }
    if (it.type === 'boost') { ctx.fillStyle = '#facc15'; ctx.font = `${Math.round(20 * sc)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚡', p.x * sc, p.y * sc); }
  }
}

function drawCar(ctx, sc, x, y, angle, color, label, spin) {
  ctx.save(); ctx.translate(x * sc, y * sc); ctx.rotate(angle + (spin ? performance.now() / 80 : 0));
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-13 * sc + 2, -8 * sc + 3, 26 * sc, 16 * sc);
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-13 * sc, -8 * sc, 26 * sc, 16 * sc, 5 * sc); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(2 * sc, -6 * sc, 6 * sc, 12 * sc);
  ctx.fillStyle = '#111'; [[-9, -9], [6, -9], [-9, 7], [6, 7]].forEach(([a, b]) => ctx.fillRect(a * sc, b * sc, 5 * sc, 2.5 * sc));
  ctx.restore();
  ctx.font = `${Math.round(16 * sc)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(label, x * sc, (y - 12) * sc);
}

function Stage({ round, byId, big = true }) {
  const now = useNow(250);
  const sim = round.sim;
  const [wrap, width] = useWidth(1000);
  const sc = Math.min(width / RACE.world.w, (big ? 560 : 330) / RACE.world.h);
  const W = Math.round(RACE.world.w * sc); const H = Math.round(RACE.world.h * sc);
  const canvas = useCanvas(W, H);
  const latest = useRef({ sim, at: performance.now() });
  if (latest.current.sim !== sim) latest.current = { sim, at: performance.now() };
  const shown = useRef({});
  const items = raceItems(round.game.seed);
  usePhaseSound(sim?.phase, () => { if (sim?.phase === 'run') sfx.go(); if (sim?.phase === 'done') sfx.jingle(); });
  usePhaseSound(sim?.phase === 'count' ? secsLeft(sim.startAt, now) : null, () => sfx.tick());

  useEffect(() => {
    let raf; let last = performance.now();
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    drawTrack(bg.getContext('2d'), sc, items);
    const draw = (tm) => {
      const ctx = canvas.current?.getContext('2d');
      const { sim: s, at } = latest.current;
      const dt = Math.min(0.1, (tm - last) / 1000); last = tm;
      if (ctx && s?.cars) {
        ctx.drawImage(bg, 0, 0, W, H);
        const ahead = Math.min(0.3, (tm - at) / 1000);
        for (const c of s.cars) {
          // Vorhersage zwischen den Updates (5×/s) + weiches Nachziehen
          const target = { s: c.fin != null || s.phase !== 'run' ? c.s : c.s + c.v * ahead, d: c.d };
          const cur = shown.current[c.id] ?? target;
          const k = Math.min(1, dt * 10);
          const nx = { s: cur.s + (target.s - cur.s) * k, d: cur.d + (target.d - cur.d) * k };
          shown.current[c.id] = nx;
          const p = carXY(nx.s, nx.d);
          drawCar(ctx, sc, p.x, p.y, p.angle, byId[c.id]?.color ?? '#888', byId[c.id]?.avatar ?? '🚗', c.spinUntil != null && s.t < c.spinUntil);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [W, H, sc, round.game.seed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sim) return <Booting big={big} />;
  const { L: lapLen } = track();
  const order = raceOrder(sim.cars);
  return (
    <TvFrame game={GAMES.partyRacer} subtitle={t('{n} Runden', { n: RACE.laps })}
      right={sim.phase === 'run' && <span className="tv-clock">⏱ {Math.max(0, Math.ceil(RACE.timeMs / 1000 - sim.t))} s</span>}>
      <div className="race-wrap">
        <div ref={wrap} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <canvas ref={canvas} style={{ display: 'block', borderRadius: 16, margin: '0 auto' }} />
          {sim.phase === 'count' && <div className="tv-overlay-num">{secsLeft(sim.startAt, now) || 'GO!'}</div>}
          {sim.phase === 'done' && <div className="tv-overlay-text">🏁 {t('{name} gewinnt das Rennen!', { name: byId[order[0]?.id]?.name })}</div>}
        </div>
        <div className="race-board">
          {order.map((c, i) => (
            <div key={c.id} className="race-row" style={{ '--c': byId[c.id]?.color }}>
              <b className="tv-rank">{i + 1}</b>
              <span style={{ fontSize: 22 }}>{byId[c.id]?.avatar}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="ellipsis" style={{ fontWeight: 800 }}>{byId[c.id]?.name}</div>
                <div className="small">{c.fin != null ? `🏁 ${c.fin.toFixed(1)} s` : t('Runde {a}/{b}', { a: Math.min(RACE.laps, Math.max(1, Math.floor(c.s / lapLen) + 1)), b: RACE.laps })}</div>
              </div>
              <div className="boost-mini"><div style={{ width: `${(c.boost ?? 0) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </TvFrame>
  );
}

function Play({ code, round, me }) {
  const sim = round.sim;
  const now = useNow(300);
  const keys = useRef({ l: false, r: false, b: false });
  const send = (patch) => {
    const next = { ...keys.current, ...patch };
    if (next.l === keys.current.l && next.r === keys.current.r && next.b === keys.current.b) return;
    keys.current = next;
    submitResultField(code, round.id, me.id, 'in', next).catch(() => {});
  };
  // Tastatur am Computer: Pfeiltasten + Leertaste
  useEffect(() => {
    const map = { ArrowLeft: 'l', ArrowRight: 'r', ' ': 'b', ArrowUp: 'b' };
    const kd = (e) => { const k = map[e.key]; if (k) { e.preventDefault(); send({ [k]: true }); } };
    const ku = (e) => { const k = map[e.key]; if (k) { e.preventDefault(); send({ [k]: false }); } };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [round.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!sim) return <Booting />;
  const car = sim.cars?.find((c) => c.id === me.id);
  const pos = raceOrder(sim.cars || []).findIndex((c) => c.id === me.id) + 1;
  const hold = (k) => ({
    onPointerDown: (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); vibrate(12); send({ [k]: true }); },
    onPointerUp: () => send({ [k]: false }),
    onPointerCancel: () => send({ [k]: false }),
    onPointerLeave: () => send({ [k]: false }),
    onContextMenu: (e) => e.preventDefault(),
  });
  const lapLen = track().L;
  return (
    <PadFrame top={<div className="row between"><b>🏎️ {t('Platz {n}', { n: pos || '–' })}</b><span className="balance">{car?.fin != null ? '🏁' : t('Runde {a}/{b}', { a: Math.min(RACE.laps, Math.max(1, Math.floor((car?.s ?? 0) / lapLen) + 1)), b: RACE.laps })}</span></div>}>
      {sim.phase === 'count' && <div className="pad-wait">🚦 {secsLeft(sim.startAt, now)}</div>}
      {car?.fin != null ? <div className="pad-wait">🏁 {t('Im Ziel! Platz {n}', { n: pos })}</div> : (
        <div className="race-pad" style={{ touchAction: 'none', userSelect: 'none' }}>
          <div className="row" style={{ gap: 10 }}>
            <button className="race-btn" {...hold('l')}>◀</button>
            <button className="race-btn" {...hold('r')}>▶</button>
          </div>
          <button className="race-boost" {...hold('b')}>
            ⚡ BOOST
            <span className="race-boost-bar"><span style={{ width: `${(car?.boost ?? 0) * 100}%` }} /></span>
          </button>
        </div>
      )}
    </PadFrame>
  );
}

export const PartyRacer = { Play, Stage };
