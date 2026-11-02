import { useEffect, useRef, useState } from 'react';
import { GAMES } from '../../game/gameLibrary.js';
import { SHIP, CONTROL, shipPanels } from '../../game/screen/spaceship.js';
import { L } from '../../game/screen/common.js';
import { submitResultField } from '../../game/groupEngine.js';
import { TvFrame, PadFrame, Timer, useNow, Booting, useCanvas, useWidth, usePhaseSound, secsLeft } from './ui.jsx';
import { sfx, vibrate } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

/** Befehlstext, z. B. „Stell die Plasma-Pumpe auf 3!“ */
export function commandText(cmd) {
  const c = CONTROL[cmd.ctl];
  const name = L(c.name);
  if (c.type === 'toggle') return cmd.val ? t('{name} EINSCHALTEN!', { name }) : t('{name} AUSSCHALTEN!', { name });
  if (c.type === 'slider') return t('{name} auf {n} stellen!', { name, n: cmd.val });
  return t('{name} drücken!', { name });
}

function Stage({ round, big = true }) {
  const now = useNow(250);
  const sim = round.sim;
  const [wrap, width] = useWidth(1000);
  const W = width; const H = big ? 380 : 240;
  const canvas = useCanvas(W, H);
  const latest = useRef(sim); latest.current = sim;
  usePhaseSound(sim?.fx ? `${sim.fx.t}:${sim.fx.at}` : null, () => (latest.current?.fx?.t === 'ok' ? sfx.coins() : sfx.alarm()));
  usePhaseSound(sim?.phase, () => { if (latest.current?.phase === 'run') sfx.go(); if (latest.current?.phase === 'done') (latest.current.win ? sfx.jingle : sfx.doom)(); });

  // Weltraum: Sterne, Asteroiden, Schiff – Tempo hängt vom Fortschritt ab
  useEffect(() => {
    const rnd = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
    const stars = Array.from({ length: 140 }, (_, i) => ({ x: rnd(i + 1), y: rnd(i + 500), z: 0.3 + rnd(i + 900) * 0.7 }));
    const rocks = Array.from({ length: 9 }, (_, i) => ({ x: (i * 0.137) % 1, y: 0.12 + ((i * 0.29) % 0.8), r: 10 + (i % 4) * 7, s: 0.5 + (i % 3) * 0.3 }));
    let raf; let last = performance.now(); let off = 0;
    const draw = (tm) => {
      const ctx = canvas.current?.getContext('2d');
      const s = latest.current;
      const dt = (tm - last) / 1000; last = tm;
      if (ctx && s) {
        const speed = s.phase === 'run' ? 0.08 + (s.prog / Math.max(1, s.goal)) * 0.35 : 0.03;
        off += speed * dt;
        const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b1026'); bg.addColorStop(1, '#2a0f4a');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        for (const st of stars) {
          const x = (((st.x - off * st.z * 3) % 1) + 1) % 1;
          ctx.fillStyle = `rgba(255,255,255,${0.35 + st.z * 0.5})`; ctx.fillRect(x * W, st.y * H, 2 + st.z * 2 * speed * 10, 2);
        }
        // Ziel-Planet kommt näher
        const p = Math.min(1, s.prog / Math.max(1, s.goal));
        const pr = 30 + p * 90;
        const pg = ctx.createRadialGradient(W - 70, H * 0.3, 5, W - 70, H * 0.3, pr);
        pg.addColorStop(0, '#86efac'); pg.addColorStop(1, '#0e7490');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(W - 70 + (1 - p) * 60, H * 0.3, pr, 0, 7); ctx.fill();
        for (const r of rocks) {
          const x = (((r.x - off * r.s * 2) % 1) + 1) % 1;
          ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.arc(x * W, r.y * H, r.r, 0, 7); ctx.fill();
          ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.arc(x * W - r.r / 3, r.y * H - r.r / 4, r.r / 3, 0, 7); ctx.fill();
        }
        // Schiff
        const bob = Math.sin(tm / 300) * 6;
        const sx = W * 0.22; const sy = H * 0.55 + bob;
        const hit = s.fx?.t === 'hit' && Date.now() - s.fx.at < 700;
        ctx.save(); ctx.translate(sx, sy); if (hit) ctx.rotate(Math.sin(tm / 30) * 0.08);
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-70, -10); ctx.lineTo(-100 - Math.random() * 30, 0); ctx.lineTo(-70, 10); ctx.fill();
        ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(-70, -22); ctx.lineTo(40, -14); ctx.quadraticCurveTo(80, 0, 40, 14); ctx.lineTo(-70, 22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(15, -4, 18, 9, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-60, -22); ctx.lineTo(-40, -44); ctx.lineTo(-25, -20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-60, 22); ctx.lineTo(-40, 44); ctx.lineTo(-25, 20); ctx.fill();
        ctx.restore();
        if (hit) { ctx.fillStyle = 'rgba(239,68,68,.25)'; ctx.fillRect(0, 0, W, H); }
        if (s.fx?.t === 'ok' && Date.now() - s.fx.at < 400) { ctx.fillStyle = 'rgba(74,222,128,.15)'; ctx.fillRect(0, 0, W, H); }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [W, H]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sim) return <Booting big={big} />;
  const danger = sim.hull <= 2;
  return (
    <TvFrame game={GAMES.spaceship} className={danger && sim.phase === 'run' ? 'tv-alarm' : ''}
      subtitle={t('Ruft euch die Befehle laut zu!')}
      right={sim.phase === 'run' && <Timer until={sim.endsAt} total={SHIP.timeMs} now={now} size={big ? 74 : 54} />}>
      <div ref={wrap} style={{ width: '100%', position: 'relative' }}>
        <canvas ref={canvas} style={{ display: 'block', borderRadius: 16 }} />
        {sim.phase === 'count' && <div className="tv-overlay-num">{secsLeft(sim.startAt, now)}</div>}
        {sim.phase === 'done' && <div className="tv-overlay-text">{sim.win ? `🪐 ${t('Gelandet! Mission geschafft!')}` : sim.hull <= 0 ? `💥 ${t('Das Schiff ist zerbrochen!')}` : `⏱ ${t('Zeit um!')}`}</div>}
      </div>
      <div className="ship-hud">
        <div className="grow">
          <div className="tv-sub">🪐 {t('Kurs zum Ziel-Planeten')} · {sim.prog}/{sim.goal}</div>
          <div className="tv-bar"><div style={{ width: `${Math.min(100, (sim.prog / sim.goal) * 100)}%` }} /></div>
        </div>
        <div className="ship-hull">{Array.from({ length: SHIP.hull }, (_, i) => <span key={i} className={i < sim.hull ? 'on' : ''}>🛡️</span>)}</div>
        <div className="ship-lights">{[0, 1, 2, 3].map((i) => <span key={i} className={`lamp ${danger ? 'red' : sim.fx?.t === 'ok' && Date.now() - sim.fx.at < 500 ? 'green' : ''}`} style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 24, fontWeight: 900 }}>
        <span>✅ {t('{n} erledigt', { n: sim.ok })}</span><span>💢 {t('{n} verpasst', { n: sim.fail })}</span>
      </div>
    </TvFrame>
  );
}

function Control({ ctl, value, onChange }) {
  const c = CONTROL[ctl];
  const name = L(c.name);
  if (c.type === 'toggle') {
    return (
      <button className={`ctl ctl-toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
        <span className="ctl-name">{name}</span>
        <span className="switch"><span /></span>
        <b>{value ? t('AN') : t('AUS')}</b>
      </button>
    );
  }
  if (c.type === 'slider') {
    return (
      <div className="ctl ctl-slider">
        <span className="ctl-name">{name}</span>
        <div className="row" style={{ gap: 6 }}>
          {[0, 1, 2, 3].map((v) => <button key={v} className={`lvl ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>{v}</button>)}
        </div>
      </div>
    );
  }
  return (
    <button className="ctl ctl-button" onClick={() => onChange((value ?? 0) + 1)}>
      <span className="ctl-name">{name}</span>
      <span className="big-btn">●</span>
    </button>
  );
}

function Play({ code, round, me }) {
  const now = useNow(250);
  const sim = round.sim;
  const panel = shipPanels(round)[me.id] || [];
  const saved = round.results?.[me.id]?.c || {};
  const [local, setLocal] = useState({});
  const values = { ...saved, ...local };
  const cmd = sim?.cmds?.[me.id];
  usePhaseSound(cmd ? cmd.n : null, () => { vibrate([40, 30, 40]); sfx.tap(); });
  if (!sim) return <Booting />;
  if (sim.phase === 'count') return <PadFrame><div className="pad-wait">🚀 {t('Start in {n} s', { n: secsLeft(sim.startAt, now) })}</div></PadFrame>;
  if (sim.phase === 'done') return <PadFrame><div className="pad-wait">{sim.win ? `🪐 ${t('Gelandet! Mission geschafft!')}` : `💥 ${t('Mission vorbei!')}`}</div></PadFrame>;
  const change = (ctl, v) => {
    vibrate(15);
    setLocal((l) => ({ ...l, [ctl]: v }));
    submitResultField(code, round.id, me.id, `c.${ctl}`, v).catch(() => {});
  };
  const left = cmd ? Math.max(0, cmd.until - now) : 0;
  return (
    <PadFrame top={<div className="row between"><b>🚀 {t('Dein Schaltpult')}</b><span className="balance">🛡️ {sim.hull}</span></div>}>
      {cmd && (
        <div className={`ship-cmd ${left < 4000 ? 'urgent' : ''}`}>
          <div className="small" style={{ fontWeight: 800, opacity: 0.8 }}>📢 {t('Befehl – laut vorlesen!')}</div>
          <div className="ship-cmd-text">{commandText(cmd)}</div>
          <div className="tv-bar light"><div style={{ width: `${(left / cmd.ms) * 100}%` }} /></div>
        </div>
      )}
      <div className="ctl-grid">
        {panel.map((ctl) => <Control key={ctl} ctl={ctl} value={values[ctl] ?? (CONTROL[ctl].type === 'toggle' ? false : 0)} onChange={(v) => change(ctl, v)} />)}
      </div>
    </PadFrame>
  );
}

export const Spaceship = { Play, Stage };
