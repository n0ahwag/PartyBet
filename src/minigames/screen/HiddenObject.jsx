import { useEffect, useMemo, useRef, useState } from 'react';
import { GAMES } from '../../game/gameLibrary.js';
import { HIDDEN, makeScene, objectAt, ACCESSORY } from '../../game/screen/hiddenObject.js';
import { submitStamp } from '../../game/groupEngine.js';
import { TvFrame, PadFrame, ScoreStrip, Timer, useNow, Booting, useCanvas, useWidth, usePhaseSound } from './ui.jsx';
import { getLang, t } from '../../i18n/index.js';
import { sfx, vibrate } from '../../lib/sound.js';

/** Das ganze Wimmelbild einmal in ein Offscreen-Canvas malen (danach nur noch skalieren/verschieben). */
function renderScene(scene, res) {
  const c = document.createElement('canvas');
  c.width = HIDDEN.w * res; c.height = HIDDEN.h * res;
  const ctx = c.getContext('2d');
  ctx.scale(res, res);
  const g = ctx.createLinearGradient(0, 0, 0, HIDDEN.h);
  g.addColorStop(0, '#bef264'); g.addColorStop(1, '#65a30d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, HIDDEN.w, HIDDEN.h);
  for (const z of scene.zones) {
    ctx.fillStyle = { pond: '#38bdf8', sand: '#fde68a', flowers: '#f9a8d4' }[z.kind];
    ctx.globalAlpha = z.kind === 'flowers' ? 0.45 : 0.85;
    ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const o of scene.objects) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate((o.rot * Math.PI) / 180);
    ctx.font = `${o.size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.fillText(o.e, 0, 0);
    if (o.acc) { ctx.font = `${Math.round(o.size * 0.5)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.fillText(o.acc, o.size * 0.08, -o.size * 0.48); }
    ctx.restore();
  }
  return c;
}

function useSceneImage(seed, res) {
  const scene = makeScene(seed);
  const img = useMemo(() => (typeof document === 'undefined' ? null : renderScene(scene, res)), [seed, res]); // eslint-disable-line react-hooks/exhaustive-deps
  return { scene, img };
}

/** Gesuchte Figur als Text, z. B. „🐧 mit Krone 👑“. */
export function targetLabel(scene, k) {
  const o = scene.objects[scene.targets[k]];
  if (!o) return '';
  const acc = ACCESSORY[o.acc];
  return `${o.e} ${acc ? acc[getLang()] ?? acc.de : ''} ${o.acc ?? ''}`;
}

function Target({ scene, k, big }) {
  const o = scene.objects[scene.targets[k]];
  return (
    <div className="hidden-target">
      <span className="hidden-target-art" style={{ fontSize: big ? 64 : 40 }}>{o?.e}<i style={{ fontSize: big ? 32 : 20 }}>{o?.acc}</i></span>
      <div>
        <div className="tv-sub">🔍 {t('Gesucht')} · {k + 1}/{scene.targets.length}</div>
        <b style={{ fontSize: big ? 30 : 18 }}>{targetLabel(scene, k)}</b>
      </div>
    </div>
  );
}

function Stage({ round, byId, big = true }) {
  const now = useNow(250);
  const sim = round.sim;
  const [wrap, width] = useWidth(1000);
  const sc = Math.min(width / HIDDEN.w, (big ? 600 : 340) / HIDDEN.h);
  const W = Math.round(HIDDEN.w * sc); const H = Math.round(HIDDEN.h * sc);
  const canvas = useCanvas(W, H);
  const { scene, img } = useSceneImage(round.game.seed, 1);
  usePhaseSound(sim ? `${sim.phase}:${sim.k}` : null, () => { if (sim?.phase === 'reveal') (sim.found.at(-1) ? sfx.tusch : sfx.fail)(); if (sim?.phase === 'find') sfx.whoosh(); });

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !img) return;
    ctx.drawImage(img, 0, 0, W, H);
    if (sim?.phase === 'reveal') {
      const o = scene.objects[scene.targets[sim.k]];
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.arc(o.x * sc, o.y * sc, o.size * sc * 1.1, 0, 7); ctx.clip(); ctx.drawImage(img, 0, 0, W, H); ctx.restore();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(o.x * sc, o.y * sc, o.size * sc * 1.1, 0, 7); ctx.stroke();
    }
  }, [img, W, H, sim?.phase, sim?.k, canvas.node]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sim) return <Booting big={big} />;
  const finder = sim.phase === 'reveal' ? sim.found.at(-1) : null;
  const lower = (scene.objects[scene.targets[sim.k]]?.y ?? 0) > HIDDEN.h / 2; // Text nicht über die Figur legen
  return (
    <TvFrame game={GAMES.hiddenObject} subtitle={t('Such auf deinem Handy – wer zuerst tippt, holt den Punkt!')}
      right={sim.phase === 'find' && <Timer until={sim.endsAt} total={HIDDEN.findMs} now={now} size={big ? 74 : 54} />}>
      {sim.phase !== 'done' && <Target scene={scene} k={sim.k} big={big} />}
      <div ref={wrap} style={{ width: '100%', position: 'relative' }}>
        <canvas ref={canvas} style={{ display: 'block', margin: '0 auto', borderRadius: 16 }} />
        {sim.phase === 'reveal' && <div className={`tv-overlay-text ${lower ? 'top' : 'bottom'}`}>{finder ? `🎉 ${t('{name} hat es gefunden!', { name: byId[finder]?.name })}` : `🙈 ${t('Niemand hat es gefunden.')}`}</div>}
      </div>
      <ScoreStrip ids={round.participants} byId={byId} value={(id) => sim.scores?.[id] ?? 0} highlight={finder} big={big} />
    </TvFrame>
  );
}

/** Zoom- & Verschiebe-Ansicht fürs Handy (1 Finger verschieben, 2 Finger zoomen, Tippen = Auswahl). */
function PanZoom({ img, width, height, onTap }) {
  const canvas = useCanvas(width, height);
  const minZ = width / HIDDEN.w;
  const view = useRef({ x: 0, y: 0, z: minZ * 2.2 });
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const [, redraw] = useState(0);

  const clampView = () => {
    const v = view.current;
    v.z = Math.max(minZ, Math.min(3, v.z));
    v.x = Math.max(0, Math.min(HIDDEN.w - width / v.z, v.x));
    v.y = Math.max(0, Math.min(Math.max(0, HIDDEN.h - height / v.z), v.y));
  };
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !img) return;
    clampView();
    const v = view.current;
    const res = img.width / HIDDEN.w;
    ctx.fillStyle = '#365314'; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, v.x * res, v.y * res, (width / v.z) * res, (height / v.z) * res, 0, 0, width, height);
  });
  const local = (e) => { const r = canvas.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const zoomAt = (f, px, py) => {
    const v = view.current;
    const wx = v.x + px / v.z; const wy = v.y + py / v.z;
    v.z *= f; clampView();
    v.x = wx - px / v.z; v.y = wy - py / v.z; clampView();
    redraw((n) => n + 1);
  };
  const down = (e) => {
    canvas.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    gesture.current = pts.length === 1
      ? { type: 'pan', start: pts[0], view: { ...view.current }, t: performance.now(), moved: 0 }
      : { type: 'pinch', d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), z: view.current.z };
  };
  const move = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (g?.type === 'pan' && pts.length === 1) {
      const dx = pts[0].x - g.start.x; const dy = pts[0].y - g.start.y;
      g.moved = Math.max(g.moved, Math.hypot(dx, dy));
      view.current.x = g.view.x - dx / view.current.z; view.current.y = g.view.y - dy / view.current.z;
      clampView(); redraw((n) => n + 1);
    } else if (g?.type === 'pinch' && pts.length >= 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2; const cy = (pts[0].y + pts[1].y) / 2;
      zoomAt((g.z * (d / g.d)) / view.current.z, cx, cy);
    }
  };
  const up = (e) => {
    const g = gesture.current;
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (g?.type === 'pan' && g.moved < 8 && performance.now() - g.t < 400 && p) {
      const v = view.current;
      onTap(v.x + p.x / v.z, v.y + p.y / v.z);
    }
    if (!pointers.current.size) gesture.current = null;
  };
  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvas} style={{ display: 'block', borderRadius: 14, touchAction: 'none' }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onWheel={(e) => { const p = local(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); }} />
      <div className="zoom-btns">
        <button className="btn soft sm" onClick={() => zoomAt(1.4, width / 2, height / 2)}>＋</button>
        <button className="btn soft sm" onClick={() => zoomAt(1 / 1.4, width / 2, height / 2)}>－</button>
      </div>
    </div>
  );
}

function Play({ code, round, me, byId, run }) {
  const now = useNow(250);
  const sim = round.sim;
  const [wrap, width] = useWidth(340);
  const { scene, img } = useSceneImage(round.game.seed, 1.5);
  const [blockedUntil, setBlocked] = useState(0);
  const [found, setFound] = useState(null); // k, das ich gefunden habe
  if (!sim) return <Booting />;
  const blocked = now < blockedUntil;
  const mine = found === sim.k;
  const tap = (x, y) => {
    if (sim.phase !== 'find' || blocked || mine) return;
    const i = objectAt(scene, x, y);
    if (i === scene.targets[sim.k]) {
      setFound(sim.k); vibrate([40, 30, 120]); sfx.coins();
      run(() => submitStamp(code, round.id, me.id, 'hit', { k: sim.k }));
    } else {
      setBlocked(Date.now() + HIDDEN.penaltyMs); vibrate(200); sfx.fail();
    }
  };
  const top = <div className="row between"><b>🔍 {t('Wimmelbild')}</b><span className="balance">⭐ {sim.scores?.[me.id] ?? 0}</span></div>;
  if (sim.phase === 'done') return <PadFrame top={top}><div className="pad-wait">🏁 {t('Alle Figuren gesucht!')}</div></PadFrame>;
  const finder = sim.phase === 'reveal' ? sim.found.at(-1) : null;
  return (
    <PadFrame top={top}>
      <Target scene={scene} k={sim.k} big={false} />
      <div ref={wrap} style={{ width: '100%', position: 'relative' }}>
        <PanZoom img={img} width={width} height={Math.round(Math.min(460, width * 1.15))} onTap={tap} />
        {blocked && <div className="hidden-block">❌ {t('Falsch! Kurz warten …')}</div>}
        {(mine || sim.phase === 'reveal') && (
          <div className="hidden-block ok">{sim.phase === 'reveal' ? (finder === me.id ? `🎉 ${t('Punkt für dich!')}` : finder ? t('{name} war schneller!', { name: byId[finder]?.name }) : `🙈 ${t('Niemand hat es gefunden.')}`) : `✅ ${t('Gefunden! Wer war schneller?')}`}</div>
        )}
      </div>
      <div className="small muted center">{t('1 Finger verschieben · 2 Finger zoomen · Tippen = Auswahl')}</div>
    </PadFrame>
  );
}

export const HiddenObject = { Play, Stage };
