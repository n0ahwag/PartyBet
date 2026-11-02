import { useEffect, useRef, useState } from 'react';
import { GAMES } from '../../game/gameLibrary.js';
import { GOLF, HOLES, simulateShot, golfState, golfTotal } from '../../game/screen/minigolf.js';
import { submitResultField } from '../../game/groupEngine.js';
import { TvFrame, PadFrame, Timer, useNow, Booting, useCanvas, useWidth } from './ui.jsx';
import { sfx, vibrate } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

/** Zeichnet eine Bahn im 2,5D-Look (Kunstrasen, erhöhte Holzbanden mit Schatten). */
function drawHole(ctx, h, sc, ox, oy) {
  const H = HOLES[h];
  const X = (x) => ox + x * sc; const Y = (y) => oy + y * sc;
  // Bande außen
  ctx.fillStyle = '#7c4a1e';
  ctx.beginPath(); ctx.roundRect(X(-3), Y(-3), (GOLF.w + 6) * sc, (GOLF.h + 6) * sc, 8 * sc / 3); ctx.fill();
  const g = ctx.createLinearGradient(0, Y(0), 0, Y(GOLF.h));
  g.addColorStop(0, '#4ade80'); g.addColorStop(1, '#16a34a');
  ctx.fillStyle = g; ctx.fillRect(X(0), Y(0), GOLF.w * sc, GOLF.h * sc);
  // Rasen-Streifen
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  for (let y = 0; y < GOLF.h; y += 20) ctx.fillRect(X(0), Y(y), GOLF.w * sc, 10 * sc);
  for (const s of H.sand) {
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.roundRect(X(s.x), Y(s.y), s.w * sc, s.h * sc, 6 * sc); ctx.fill();
    ctx.fillStyle = 'rgba(180,140,60,.35)';
    for (let i = 0; i < 12; i++) ctx.fillRect(X(s.x + ((i * 37) % s.w)), Y(s.y + ((i * 23) % s.h)), sc * 0.8, sc * 0.8);
  }
  for (const w of H.walls) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X(w.x) + 2 * sc / 3, Y(w.y) + 3 * sc / 3, w.w * sc, w.h * sc);
    ctx.fillStyle = '#a16207'; ctx.fillRect(X(w.x), Y(w.y), w.w * sc, w.h * sc);
    ctx.fillStyle = '#ca8a04'; ctx.fillRect(X(w.x), Y(w.y), w.w * sc, Math.max(2, w.h * sc * 0.35));
  }
  for (const b of H.bumpers) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(X(b.x) + 2, Y(b.y) + 3, b.r * sc, 0, 7); ctx.fill();
    const rg = ctx.createRadialGradient(X(b.x - b.r / 3), Y(b.y - b.r / 3), 1, X(b.x), Y(b.y), b.r * sc);
    rg.addColorStop(0, '#fca5a5'); rg.addColorStop(1, '#dc2626');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), b.r * sc, 0, 7); ctx.fill();
  }
  // Abschlag & Loch mit Fahne
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(X(H.start.x - 6), Y(H.start.y - 1), 12 * sc, 2 * sc);
  ctx.fillStyle = '#052e16'; ctx.beginPath(); ctx.arc(X(H.cup.x), Y(H.cup.y), GOLF.cupR * sc, 0, 7); ctx.fill();
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = Math.max(1.5, sc * 0.6);
  ctx.beginPath(); ctx.moveTo(X(H.cup.x), Y(H.cup.y)); ctx.lineTo(X(H.cup.x), Y(H.cup.y - 14)); ctx.stroke();
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(X(H.cup.x), Y(H.cup.y - 14)); ctx.lineTo(X(H.cup.x + 8), Y(H.cup.y - 11)); ctx.lineTo(X(H.cup.x), Y(H.cup.y - 8)); ctx.fill();
}

function drawBall(ctx, x, y, sc, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(x + sc * 0.6, y + sc * 0.9, GOLF.ballR * sc, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, GOLF.ballR * sc, 0, 7); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, sc * 0.9); ctx.stroke();
  if (label) { ctx.font = `${Math.round(sc * 5)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(label, x, y - GOLF.ballR * sc - 3); }
}

/** Animiert neue Schläge: liefert pro Spieler die aktuelle Anzeigeposition je Bahn. */
function useShotAnimations(round) {
  const anim = useRef({}); // uid → { count, path, i, h }
  for (const id of round.participants) {
    const shots = round.results?.[id]?.shots || [];
    const a = anim.current[id];
    if (!a) { anim.current[id] = { count: shots.length, path: null }; continue; }
    if (shots.length > a.count) {
      const s = shots[shots.length - 1];
      const prev = golfState(shots.slice(0, -1)).pos[s.h];
      const sim = simulateShot(s.h, prev, s.a, s.p);
      anim.current[id] = { count: shots.length, path: sim.path, i: 0, h: s.h, end: [s.x, s.y], started: performance.now() };
      sfx.putt();
      if (s.in) setTimeout(() => sfx.tusch(), Math.min(4000, sim.path.length * 25));
    }
  }
  return anim;
}

function Stage({ round, byId, big = true }) {
  const now = useNow(500);
  const sim = round.sim;
  const [wrap, width] = useWidth(1000);
  const gap = 18;
  const sc = Math.min((width - gap * 4) / (GOLF.w * 3), (big ? 470 : 300) / GOLF.h);
  const W = Math.round(GOLF.w * 3 * sc + gap * 4); const Hh = Math.round(GOLF.h * sc + 40);
  const canvas = useCanvas(W, Hh);
  const anim = useShotAnimations(round);
  const latest = useRef(round); latest.current = round;

  useEffect(() => {
    let raf;
    const draw = () => {
      const ctx = canvas.current?.getContext('2d');
      if (ctx) {
        const r = latest.current;
        ctx.clearRect(0, 0, W, Hh);
        for (let h = 0; h < 3; h++) {
          const ox = gap + h * (GOLF.w * sc + gap);
          drawHole(ctx, h, sc, ox, 30);
          ctx.fillStyle = '#fff'; ctx.font = `900 ${big ? 20 : 14}px Outfit, system-ui`; ctx.textAlign = 'left';
          ctx.fillText(`${t('Bahn {n}', { n: h + 1 })} · Par ${HOLES[h].par}`, ox, 20);
        }
        for (const id of r.participants) {
          const shots = r.results?.[id]?.shots || [];
          const st = golfState(shots);
          const a = anim.current[id];
          let h; let x; let y;
          if (a?.path && a.i < a.path.length) {
            h = a.h;
            const el = (performance.now() - a.started) / 25; // ein Pfadpunkt ≈ 25 ms
            a.i = Math.floor(el);
            const pt = a.path[Math.min(a.path.length - 1, a.i)];
            [x, y] = pt;
          } else {
            h = st.hole === -1 ? HOLES.length - 1 : st.hole;
            if (st.hole === -1) continue; // fertig: Ball liegt im letzten Loch
            ({ x, y } = st.pos[h]);
          }
          const ox = gap + h * (GOLF.w * sc + gap);
          drawBall(ctx, ox + x * sc, 30 + y * sc, sc, byId[id]?.color ?? '#333', byId[id]?.avatar);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [W, Hh, sc]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sim) return <Booting big={big} />;
  const rows = [...round.participants].map((id) => ({ id, st: golfState(round.results?.[id]?.shots), total: golfTotal(round.results?.[id]?.shots) }))
    .sort((a, b) => a.total - b.total);
  return (
    <TvFrame game={GAMES.minigolf} subtitle={t('Alle spielen gleichzeitig – wenige Schläge gewinnen')}
      right={<Timer until={sim.endsAt} total={GOLF.timeMs} now={now} size={big ? 74 : 54} />}>
      <div ref={wrap} style={{ width: '100%' }}><canvas ref={canvas} style={{ display: 'block', margin: '0 auto' }} /></div>
      <table className="tv-table">
        <thead><tr><th /><th>{t('Bahn {n}', { n: 1 })}</th><th>{t('Bahn {n}', { n: 2 })}</th><th>{t('Bahn {n}', { n: 3 })}</th><th>Σ</th></tr></thead>
        <tbody>
          {rows.map(({ id, st }) => (
            <tr key={id}>
              <td>{byId[id]?.avatar} {byId[id]?.name}</td>
              {HOLES.map((_, h) => <td key={h}>{st.strokes[h] ? `${st.strokes[h]}${st.holed[h] ? ' ⛳' : ''}` : '–'}</td>)}
              <td><b>{st.strokes.reduce((a, b) => a + b, 0)}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TvFrame>
  );
}

const PULL_PX = 150; // so weit ziehen = volle Kraft

function Play({ code, round, me, run }) {
  const shots = round.results?.[me.id]?.shots || [];
  const st = golfState(shots);
  const [wrap, width] = useWidth(340);
  const sc = Math.min(width / GOLF.w, 380 / GOLF.h);
  const W = Math.round(GOLF.w * sc); const Hh = Math.round(GOLF.h * sc);
  const canvas = useCanvas(W, Hh);
  const drag = useRef(null);
  const [aim, setAim] = useState(null); // { a, p }
  const [flying, setFlying] = useState(null); // { path, i, h, res }
  const pending = useRef(false);

  // Zeichnen: Bahn, Ball (ggf. fliegend), Zielpfeil
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || st.hole === -1) return;
    ctx.clearRect(0, 0, W, Hh);
    const h = flying ? flying.h : st.hole;
    drawHole(ctx, h, sc, 0, 0);
    const pos = flying ? { x: flying.path[Math.min(flying.i, flying.path.length - 1)][0], y: flying.path[Math.min(flying.i, flying.path.length - 1)][1] } : st.pos[h];
    if (aim && !flying) {
      const len = 12 + aim.p * 46;
      ctx.strokeStyle = `hsl(${120 - aim.p * 120} 90% 45%)`; ctx.lineWidth = 4; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(pos.x * sc, pos.y * sc); ctx.lineTo((pos.x + Math.cos(aim.a) * len) * sc, (pos.y + Math.sin(aim.a) * len) * sc); ctx.stroke();
      ctx.setLineDash([]);
    }
    drawBall(ctx, pos.x * sc, pos.y * sc, sc, me.color ?? '#333');
  }, [W, Hh, sc, aim, flying, shots.length, canvas.node]); // eslint-disable-line react-hooks/exhaustive-deps

  // Schlag-Animation am Handy, danach Ergebnis speichern
  useEffect(() => {
    if (!flying) return undefined;
    if (flying.i >= flying.path.length) {
      const { res, shot } = flying;
      run(() => submitResultField(code, round.id, me.id, 'shots', [...shots, { ...shot, x: res.x, y: res.y, in: res.in }]));
      pending.current = false; // Firestore zeigt den Schlag lokal sofort an
      if (res.in) { sfx.tusch(); vibrate([60, 40, 160]); }
      setFlying(null);
      return undefined;
    }
    const tm = setTimeout(() => setFlying((f) => f && { ...f, i: f.i + 2 }), 25);
    return () => clearTimeout(tm);
  }, [flying]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!round.sim) return <Booting />;
  if (st.done) {
    return <PadFrame><div className="pad-wait">🏁 {t('Fertig! {n} Schläge insgesamt', { n: golfTotal(shots) })}<div className="small muted">{t('Schau auf den Bildschirm, wie die anderen spielen.')}</div></div></PadFrame>;
  }
  const pt = (e) => { const r = canvas.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e) => { if (flying || pending.current) return; canvas.current.setPointerCapture?.(e.pointerId); drag.current = pt(e); setAim(null); };
  const move = (e) => {
    if (!drag.current) return;
    const p = pt(e); const dx = p.x - drag.current.x; const dy = p.y - drag.current.y;
    const len = Math.hypot(dx, dy);
    setAim(len < 6 ? null : { a: Math.atan2(-dy, -dx), p: Math.min(1, len / PULL_PX) });
  };
  const up = () => {
    drag.current = null;
    if (!aim || aim.p < 0.04) { setAim(null); return; }
    const shot = { h: st.hole, a: Math.round(aim.a * 10000) / 10000, p: Math.round(aim.p * 1000) / 1000 };
    const res = simulateShot(shot.h, st.pos[shot.h], shot.a, shot.p);
    pending.current = true;
    sfx.putt(); vibrate(30);
    setAim(null);
    setFlying({ path: res.path, i: 0, h: shot.h, res, shot });
  };
  return (
    <PadFrame top={<div className="row between"><b>⛳ {t('Bahn {n}', { n: st.hole + 1 })} · Par {HOLES[st.hole].par}</b><span className="balance">{t('{n} Schläge', { n: st.strokes[st.hole] })}</span></div>}>
      <div ref={wrap} style={{ width: '100%', touchAction: 'none' }}>
        <canvas ref={canvas} style={{ display: 'block', margin: '0 auto', borderRadius: 12, touchAction: 'none' }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; setAim(null); }} />
      </div>
      <div className="center small" style={{ fontWeight: 800 }}>
        {aim ? `💪 ${Math.round(aim.p * 100)} %` : flying ? '…' : `👆 ${t('Zurückziehen wie eine Schleuder und loslassen!')}`}
      </div>
    </PadFrame>
  );
}

export const Minigolf = { Play, Stage };
