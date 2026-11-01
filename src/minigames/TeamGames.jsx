import { useEffect, useRef, useState } from 'react';
import {
  teamsOfRound, teamOf, SHAKE_MS, WHEEL_MS, WHEEL_PER_PERSON, wheelProgress, SEESAW_MS, SEESAW_TOL, seesawWave, flashMs,
  RELAY_TASKS, RELAY_MS, relayTask, relayRunner, relayState, hivemindTeam, RIVER, raftRoles, makeRiver, SHAFT, makeShaft,
} from '../game/teams.js';
import { TEAM_NAMES, TEAM_COLORS } from '../game/extras.js';
import { headingOf, makeRotationTracker } from '../game/sensors.js';
import { submitGroupResult, submitRelay } from '../game/groupEngine.js';
import { requestMotionPermission, requestOrientationPermission } from '../lib/device.js';
import { TeamBadge, TeamLists } from './GroupExtras.jsx';
import { SensorGames } from './Sensors.jsx';
import { setupCanvas } from './Arcade.jsx';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

/*
 * Team-Spiele: Wildwasser-Rafting, Schüttel-Marathon, Team-Wippe, Kompass-Riesenrad, Team-Lichtblitz,
 * Mathe-Staffel, Touch-Parcours, Team-Mehrheits-Duell. Schnittstelle wie in Group.jsx: Play · Stage · Result.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const num1 = (v) => (Math.round(v * 10) / 10).toLocaleString();

function MyTeam({ round, me }) {
  return <div className="center">{t('Du spielst für')} <TeamBadge team={teamOf(round, me.id)} /></div>;
}

/** Zwei Team-Balken (0…1) mit Beschriftung. */
function TeamBars({ values, labels, big }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      {[0, 1].map((i) => (
        <div key={i} className="stack" style={{ gap: 3 }}>
          <div className="row between" style={{ fontWeight: 900, fontSize: big ? 22 : 15 }}>
            <span style={{ color: TEAM_COLORS[i] }}>{t(TEAM_NAMES[i])}</span><span>{labels[i]}</span>
          </div>
          <div style={{ height: big ? 26 : 16, borderRadius: 99, background: 'var(--bg-soft)', overflow: 'hidden' }}>
            <div style={{ width: `${clamp(values[i], 0, 1) * 100}%`, height: '100%', background: TEAM_COLORS[i], transition: 'width .3s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Seil zwischen zwei Teams (Wert a vs. b). */
function Rope({ a, b, big }) {
  const total = a + b;
  const x = 50 + (total ? (b - a) / total : 0) * 42;
  return (
    <div className="tug-rope" style={{ height: big ? 96 : 70 }}>
      <div className="tug-half" style={{ width: '50%', background: TEAM_COLORS[0], opacity: 0.25 }} />
      <div className="tug-half" style={{ width: '50%', background: TEAM_COLORS[1], opacity: 0.25 }} />
      <div className="tug-line" /><div className="tug-mid" />
      <div className="tug-knot" style={{ left: `${x}%` }} />
    </div>
  );
}

function Winner({ round }) {
  const w = round.winnerTeam;
  return (
    <div className="card accent center pop">
      <h2>{w == null ? t('Unentschieden!') : t('{team} gewinnt!', { team: t(TEAM_NAMES[w]) })}</h2>
    </div>
  );
}

/** Ablauf für Sensor-Spiele: Freigabe → 3-2-1 → laufen. */
function useSensorFlow(kind) {
  const [step, setStep] = useState('perm');
  const n = useGo(step === 'count', () => setStep('run'));
  const start = async () => { if (kind === 'orientation') await requestOrientationPermission(); else await requestMotionPermission(); setStep('count'); };
  return { step, setStep, n, start };
}

// ------------------------------------------------------------------ 1 Wildwasser-Rafting
const ROLE_INFO = {
  left: { icon: '⬅️', label: 'Links rudern', hint: 'Halten = das Boot zieht nach links' },
  right: { icon: '➡️', label: 'Rechts rudern', hint: 'Halten = das Boot zieht nach rechts' },
  speed: { icon: '⏩', label: 'Tempo machen', hint: 'Halten = schneller – aber Vorsicht vor den Felsen!' },
};

function RiverView({ round, big }) {
  const ref = useRef(null);
  const sim = useRef(round.sim);
  sim.current = round.sim;
  const rocks = useRef(makeRiver(round.game.seed));
  const W = big ? 520 : Math.min(340, (typeof window !== 'undefined' ? window.innerWidth : 360) - 40);
  const H = big ? 560 : 360;
  useEffect(() => {
    const ctx = setupCanvas(ref.current, W, H);
    const view = { x: 0, y: 0 };
    let raf = 0; const t0 = performance.now();
    const sc = W / (RIVER.width + 2.4);
    const loop = (now) => {
      const s = sim.current?.raft ?? { x: 0, y: 0, hits: 0, hit: [] };
      view.x += (s.x - view.x) * 0.2; view.y += (s.y - view.y) * 0.2;
      const t = (now - t0) / 1000;
      const sy = (y) => H - 70 - (y - view.y) * sc; // Boot unten, Fluss kommt von oben
      const sx = (x) => W / 2 + x * sc;
      ctx.fillStyle = '#4D7C0F'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#A16207'; ctx.fillRect(sx(-RIVER.width / 2) - 8, 0, RIVER.width * sc + 16, H);
      const g = ctx.createLinearGradient(sx(-RIVER.width / 2), 0, sx(RIVER.width / 2), 0);
      g.addColorStop(0, '#0E7490'); g.addColorStop(0.5, '#22A6C8'); g.addColorStop(1, '#0E7490');
      ctx.fillStyle = g; ctx.fillRect(sx(-RIVER.width / 2), 0, RIVER.width * sc, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const yy = ((i * 37 + (view.y * sc + t * 60)) % (H + 40)) - 20;
        const xx = sx(((i * 53) % 90) / 10 - 4.5);
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 8, yy + 6, xx + 16, yy); ctx.stroke();
      }
      // Ziel
      const fy = sy(RIVER.length);
      if (fy > -20) { for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#111'; ctx.fillRect(sx(-RIVER.width / 2) + i * (RIVER.width * sc / 12), fy - 8, RIVER.width * sc / 12, 8); } }
      rocks.current.forEach((rk, i) => {
        const y = sy(rk.y); if (y < -40 || y > H + 40) return;
        const hit = s.hit?.includes(i);
        ctx.fillStyle = hit ? 'rgba(120,113,108,0.45)' : '#78716C';
        ctx.beginPath(); ctx.arc(sx(rk.x), y, rk.r * sc, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(sx(rk.x) - rk.r * sc * 0.3, y - rk.r * sc * 0.3, rk.r * sc * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(sx(rk.x), y + 3, rk.r * sc + 4, 0.2, Math.PI - 0.2); ctx.stroke();
      });
      // Boot
      const bx = sx(view.x); const by = sy(view.y);
      ctx.fillStyle = '#F97316'; ctx.beginPath(); ctx.arc(bx, by, RIVER.raftR * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FDBA74'; ctx.beginPath(); ctx.arc(bx, by, RIVER.raftR * sc * 0.62, 0, Math.PI * 2); ctx.fill();
      [0, 1, 2, 3].forEach((k) => { const a = k * Math.PI / 2 + 0.6 + Math.sin(t * 6 + k) * 0.15; ctx.fillStyle = '#1E3A8A'; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * RIVER.raftR * sc * 0.62, by + Math.sin(a) * RIVER.raftR * sc * 0.62, 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#fff'; ctx.font = '900 16px Outfit, system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${'❤️'.repeat(Math.max(0, RIVER.lives - (s.hits ?? 0)))}${'🖤'.repeat(Math.min(RIVER.lives, s.hits ?? 0))}`, 10, 8);
      ctx.textAlign = 'right'; ctx.fillText(`${Math.round(clamp(view.y / RIVER.length, 0, 1) * 100)} %`, W - 10, 8);
      if (sim.current?.phase === 'count') { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 64px Outfit, system-ui'; ctx.fillText(String(Math.ceil((sim.current.left ?? 0) / 1000)), W / 2, H / 2 - 32); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [W, H]);
  return <canvas ref={ref} className="arcade-canvas" style={{ width: W, height: H, display: 'block', margin: '0 auto' }} />;
}

const Rafting = {
  Play({ code, round, me }) {
    const role = raftRoles(round)[me.id];
    const info = ROLE_INFO[role];
    const holding = useRef(false);
    const set = (v) => { if (holding.current === v) return; holding.current = v; if (v) vibrate(15); submitGroupResult(code, round.id, me.id, { hold: v }).catch(() => {}); };
    const hits = round.sim?.raft?.hits ?? 0;
    const prevHits = useRef(hits);
    useEffect(() => { if (hits > prevHits.current) { sfx.fail(); vibrate([150, 60, 150]); } prevHits.current = hits; }, [hits]);
    return (
      <div className="stack">
        <RiverView round={round} />
        <button className="btn lg block" style={{ display: 'block', textAlign: 'center', lineHeight: 1.25, minHeight: 120, fontSize: 26, background: role === 'left' ? '#2563EB' : role === 'right' ? '#DC2626' : '#16A34A', color: '#fff', touchAction: 'none', userSelect: 'none' }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); set(true); }} onPointerUp={() => set(false)} onPointerCancel={() => set(false)} onPointerLeave={() => set(false)}>
          {info.icon} {t(info.label)}<br /><span style={{ fontSize: 14, fontWeight: 600 }}>{t(info.hint)}</span>
        </button>
      </div>
    );
  },
  Stage({ round, byId, big }) {
    const roles = raftRoles(round);
    return (
      <div className="stack">
        <RiverView round={round} big={big} />
        <div className="row wrap center" style={{ gap: 6 }}>
          {round.participants.map((id) => <span key={id} className={`pill ${round.results?.[id]?.hold ? 'good' : ''}`}>{ROLE_INFO[roles[id]].icon} {byId[id]?.avatar} {byId[id]?.name}</span>)}
        </div>
      </div>
    );
  },
  Result({ round }) {
    return (
      <div className="card accent center pop stack" style={{ gap: 4 }}>
        <div style={{ fontSize: 48 }}>{round.raftOk ? '🏁' : '🌊'}</div>
        <h2>{round.raftOk ? t('Ihr habt es ins Ziel geschafft!') : t('Gekentert – {p} % geschafft.', { p: round.raftProgress ?? 0 })}</h2>
        <div>{t('{n} Felsen gerammt', { n: round.raftHits ?? 0 })}</div>
      </div>
    );
  },
};

// ------------------------------------------------------------------ 2 Schüttel-Marathon
const HIGH = 22; const LOW = 13;
function liveTeamValues(round, key) {
  return teamsOfRound(round).map((ids) => mean(ids.map((id) => round.results?.[id]?.[key] ?? 0)));
}

const ShakeMarathon = {
  Play({ code, round, me }) {
    const { step, setStep, n, start } = useSensorFlow('motion');
    const [count, setCount] = useState(0);
    const [left, setLeft] = useState(SHAKE_MS);
    useEffect(() => {
      if (step !== 'run') return undefined;
      const s = { armed: true, n: 0, last: 0, sent: -1 };
      const onMotion = (e) => {
        const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
        const m = Math.hypot(a.x, a.y, a.z);
        if (s.armed && m > HIGH && performance.now() - s.last > 90) { s.n += 1; s.armed = false; s.last = performance.now(); setCount(s.n); }
        else if (m < LOW) s.armed = true;
      };
      const kd = (e) => { if (e.code === 'Space') { s.n += 1; setCount(s.n); } }; // PC: Leertaste
      window.addEventListener('devicemotion', onMotion); window.addEventListener('keydown', kd);
      const t0 = performance.now();
      const iv = setInterval(() => {
        const l = Math.max(0, SHAKE_MS - (performance.now() - t0)); setLeft(l);
        if (l <= 0) { clearInterval(iv); submitGroupResult(code, round.id, me.id, { shakes: s.n, done: true }); sfx.gong(); vibrate(300); setStep('done'); return; }
        if (s.n !== s.sent) { s.sent = s.n; submitGroupResult(code, round.id, me.id, { shakes: s.n, done: false }).catch(() => {}); }
      }, 300);
      return () => { clearInterval(iv); window.removeEventListener('devicemotion', onMotion); window.removeEventListener('keydown', kd); };
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
    const [a, b] = liveTeamValues(round, 'shakes');
    return (
      <div className="stack center">
        <MyTeam round={round} me={me} />
        <Rope a={a} b={b} />
        {step === 'perm' && <><Waiting text={t('Handy fest in die Hand – gleich 5 Sekunden lang schütteln, was das Zeug hält!')} /><button className="btn primary lg" onClick={start}>{t('Bereit')}</button></>}
        {step === 'count' && <CountdownView n={n} />}
        {step === 'run' && <div className="card center" style={{ background: TEAM_COLORS[teamOf(round, me.id)], color: '#fff' }}><div style={{ fontSize: 64, fontWeight: 900 }}>📳 {count}</div><b>{t('SCHÜTTELN!')} · {Math.ceil(left / 1000)} s</b></div>}
        {step === 'done' && <Waiting text={t('{n} Schüttler! Warte auf die anderen…', { n: count })} />}
      </div>
    );
  },
  Stage({ round, byId, big }) {
    const [a, b] = liveTeamValues(round, 'shakes');
    return <div className="stack"><Rope a={a} b={b} big={big} /><TeamLists teams={teamsOfRound(round)} byId={byId} big={big} extra={(id) => <b>{round.results?.[id]?.shakes ?? 0}{round.results?.[id]?.done ? ' ✓' : ''}</b>} /></div>;
  },
  Result({ round, byId }) {
    return <div className="stack"><Winner round={round} /><TeamBars values={(round.teamValues ?? [0, 0]).map((v) => v / Math.max(1, ...(round.teamValues ?? [1])))} labels={(round.teamValues ?? [0, 0]).map((v) => `Ø ${num1(v)}`)} /><TeamLists teams={teamsOfRound(round)} byId={byId} extra={(id) => <b>{round.results?.[id]?.shakes ?? 0}</b>} /></div>;
  },
};

// ------------------------------------------------------------------ 3 Team-Wippe
function Plank({ angle, color, big, ok }) {
  return (
    <svg viewBox="-160 -90 320 150" style={{ width: '100%', maxWidth: big ? 520 : 340 }}>
      <path d="M-160 50 Q-80 30 0 50 T160 50 V60 H-160Z" fill="#38BDF8" opacity="0.5" />
      <polygon points="-18,50 18,50 0,8" fill="#78716C" />
      <g transform={`rotate(${clamp(angle, -35, 35)})`} style={{ transition: 'transform 120ms linear' }}>
        <rect x="-140" y="-4" width="280" height="14" rx="7" fill={color} stroke={ok ? '#16A34A' : '#DC2626'} strokeWidth="3" />
        <circle cx="-110" cy="-16" r="10" fill="#FDE68A" /><circle cx="110" cy="-16" r="10" fill="#FDE68A" />
      </g>
      <text x="0" y="-60" textAnchor="middle" fontSize="20" fontWeight="900" fill={ok ? '#16A34A' : '#DC2626'}>{Math.round(angle)}°</text>
    </svg>
  );
}

const TeamSeesaw = {
  Play({ code, round, me }) {
    const { step, setStep, n, start } = useSensorFlow('orientation');
    const [own, setOwn] = useState(0);
    const [bal, setBal] = useState(0);
    const [tt, setTt] = useState(0);
    useEffect(() => {
      if (step !== 'run') return undefined;
      let base = null; let g = 0; let key = 0; let acc = 0; let lastSent = 0;
      const on = (e) => { if (e.gamma == null) return; base ??= e.gamma; g = e.gamma - base; };
      const kd = (e) => { if (e.key === 'ArrowLeft') key -= 2; if (e.key === 'ArrowRight') key += 2; }; // PC
      window.addEventListener('deviceorientation', on); window.addEventListener('keydown', kd);
      const t0 = performance.now(); let last = t0;
      const iv = setInterval(() => {
        const now = performance.now(); const el = now - t0; const dt = now - last; last = now;
        const tilt = g + key;
        const angle = seesawWave(round.game.seed, el / 1000) + tilt;
        if (Math.abs(angle) < SEESAW_TOL) acc += dt;
        setOwn(angle); setBal(acc); setTt(el);
        if (el >= SEESAW_MS) { clearInterval(iv); submitGroupResult(code, round.id, me.id, { balancedMs: Math.round(acc), g: tilt, done: true }); sfx.gong(); setStep('done'); return; }
        if (now - lastSent > 300) { lastSent = now; submitGroupResult(code, round.id, me.id, { g: Math.round(tilt * 10) / 10, balancedMs: Math.round(acc), done: false }).catch(() => {}); }
      }, 50);
      return () => { clearInterval(iv); window.removeEventListener('deviceorientation', on); window.removeEventListener('keydown', kd); };
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
    const team = teamOf(round, me.id);
    const ids = teamsOfRound(round)[team];
    const teamAngle = seesawWave(round.game.seed, tt / 1000) + mean(ids.map((id) => (id === me.id ? own - seesawWave(round.game.seed, tt / 1000) : round.results?.[id]?.g ?? 0)));
    return (
      <div className="stack center">
        <MyTeam round={round} me={me} />
        {step === 'perm' && <><Waiting text={t('Halte dein Handy waagerecht vor dich. Die Wellen kippen die Brücke – kippe dein Handy dagegen, bis sie gerade ist. Alle im Team gleichzeitig!')} /><button className="btn primary lg" onClick={start}>{t('Sensor freigeben & starten')}</button></>}
        {step === 'count' && <CountdownView n={n} />}
        {step === 'run' && (
          <>
            <Plank angle={teamAngle} color={TEAM_COLORS[team]} ok={Math.abs(teamAngle) < SEESAW_TOL} />
            <div className="small muted">{t('Dein Winkel')}: <b style={{ color: Math.abs(own) < SEESAW_TOL ? '#16A34A' : '#DC2626' }}>{Math.round(own)}°</b> · {t('im Gleichgewicht')}: <b>{num1(bal / 1000)} s</b> · ⏱ {Math.ceil((SEESAW_MS - tt) / 1000)} s</div>
          </>
        )}
        {step === 'done' && <Waiting text={t('{n} s im Gleichgewicht! Warte auf die anderen…', { n: num1(bal / 1000) })} />}
      </div>
    );
  },
  Stage({ round, byId, big }) {
    const teams = teamsOfRound(round);
    return (
      <div className="stack">
        <div className="grid-2">{teams.map((ids, i) => { const a = mean(ids.map((id) => round.results?.[id]?.g ?? 0)); return <div key={i} className="center"><TeamBadge team={i} big={big} /><Plank angle={a} color={TEAM_COLORS[i]} big={big} ok={Math.abs(a) < SEESAW_TOL} /></div>; })}</div>
        <TeamLists teams={teams} byId={byId} big={big} extra={(id) => <b>{num1((round.results?.[id]?.balancedMs ?? 0) / 1000)} s{round.results?.[id]?.done ? ' ✓' : ''}</b>} />
      </div>
    );
  },
  Result({ round, byId }) {
    return <div className="stack"><Winner round={round} /><TeamBars values={(round.teamValues ?? [0, 0]).map((v) => v / SEESAW_MS)} labels={(round.teamValues ?? [0, 0]).map((v) => `Ø ${num1(v / 1000)} s`)} /><TeamLists teams={teamsOfRound(round)} byId={byId} extra={(id) => <b>{num1((round.results?.[id]?.balancedMs ?? 0) / 1000)} s</b>} /></div>;
  },
};

// ------------------------------------------------------------------ 4 Kompass-Riesenrad
const CompassWheel = {
  Play({ code, round, me }) {
    const { step, setStep, n, start } = useSensorFlow('orientation');
    const [deg, setDeg] = useState(0);
    const [left, setLeft] = useState(WHEEL_MS);
    useEffect(() => {
      if (step !== 'run') return undefined;
      const tr = makeRotationTracker(); let sent = -1; let total = 0;
      const on = (e) => { const h = headingOf(e); if (h == null) return; const before = Math.floor(Math.max(0, total) / 90); total = tr.push(h); if (Math.floor(Math.max(0, total) / 90) > before) { sfx.tick(); vibrate(10); } setDeg(total); };
      const kd = (e) => { if (e.key === 'ArrowRight') { total += 30; setDeg(total); } }; // PC
      window.addEventListener('deviceorientation', on); window.addEventListener('keydown', kd);
      const t0 = performance.now();
      const iv = setInterval(() => {
        const l = Math.max(0, WHEEL_MS - (performance.now() - t0)); setLeft(l);
        const d = Math.round(Math.max(0, total));
        if (l <= 0) { clearInterval(iv); submitGroupResult(code, round.id, me.id, { deg: d, done: true }); sfx.gong(); setStep('done'); return; }
        if (d !== sent) { sent = d; submitGroupResult(code, round.id, me.id, { deg: d, done: false }).catch(() => {}); }
      }, 350);
      return () => { clearInterval(iv); window.removeEventListener('deviceorientation', on); window.removeEventListener('keydown', kd); };
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
    const teams = teamsOfRound(round);
    const prog = teams.map((ids) => wheelProgress(round, ids));
    return (
      <div className="stack center">
        <MyTeam round={round} me={me} />
        <TeamBars values={prog} labels={prog.map((p) => `${Math.round(p * 100)} %`)} />
        {step === 'perm' && <><Waiting text={t('Handy flach vor dich halten und nach dem Countdown im Uhrzeigersinn im Kreis drehen – so schnell und so oft du kannst!')} /><button className="btn primary lg" onClick={start}>{t('Kompass freigeben & starten')}</button></>}
        {step === 'count' && <CountdownView n={n} />}
        {step === 'run' && <div className="card center"><div style={{ fontSize: 56, fontWeight: 900, transform: `rotate(${deg}deg)`, display: 'inline-block' }}>🎡</div><div className="big-number">{Math.round(Math.max(0, deg))}°</div><b>{t('Dreh dich!')} ↻ · {Math.ceil(left / 1000)} s</b></div>}
        {step === 'done' && <Waiting text={t('{n}° gedreht! Warte auf die anderen…', { n: Math.round(Math.max(0, deg)) })} />}
      </div>
    );
  },
  Stage({ round, byId, big }) {
    const teams = teamsOfRound(round); const prog = teams.map((ids) => wheelProgress(round, ids));
    return <div className="stack"><TeamBars values={prog} labels={prog.map((p) => `${Math.round(p * 100)} %`)} big={big} /><TeamLists teams={teams} byId={byId} big={big} extra={(id) => <b>{round.results?.[id]?.deg ?? 0}°{round.results?.[id]?.done ? ' ✓' : ''}</b>} /><p className="small muted center" style={{ margin: 0 }}>{t('Ziel: {n}° pro Person', { n: WHEEL_PER_PERSON })}</p></div>;
  },
  Result({ round, byId }) {
    return <div className="stack"><Winner round={round} /><TeamBars values={round.teamValues ?? [0, 0]} labels={(round.teamValues ?? [0, 0]).map((v) => `${Math.round(v * 100)} %`)} /><TeamLists teams={teamsOfRound(round)} byId={byId} extra={(id) => <b>{round.results?.[id]?.deg ?? 0}°</b>} /></div>;
  },
};

// ------------------------------------------------------------------ 5 Team-Lichtblitz
const TeamFlash = {
  Play({ code, round, me }) {
    const Inner = SensorGames.lightFlash.Play;
    if (round.results?.[me.id]) return <><MyTeam round={round} me={me} /><Waiting text={`✓ ${t('Abgegeben – warte auf die anderen…')}`} /></>;
    return <div className="stack"><MyTeam round={round} me={me} /><Inner duel={round} submit={(k, d) => submitGroupResult(code, round.id, me.id, d)} /></div>;
  },
  Stage({ round, byId, big }) {
    return <TeamLists teams={teamsOfRound(round)} byId={byId} big={big} extra={(id) => (round.results?.[id] ? '✓' : '…')} />;
  },
  Result({ round, byId }) {
    const v = round.teamValues ?? [0, 0];
    return <div className="stack"><Winner round={round} /><TeamBars values={v.map((x) => 1 - x / 1500)} labels={v.map((x) => `Ø ${Math.round(x)} ms`)} /><TeamLists teams={teamsOfRound(round)} byId={byId} extra={(id) => { const r = round.results?.[id]; return <b>{r?.jumpStart ? `🚫 ${t('Frühstart')}` : r?.ms == null ? '–' : `${r.ms} ms`}</b>; }} /><p className="small muted center" style={{ margin: 0 }}>{t('Frühstart oder zu spät zählt wie {n} ms.', { n: flashMs(null) })}</p></div>;
  },
};

// ------------------------------------------------------------------ 6 Mathe-Staffel
function RelayStatus({ round, byId, big }) {
  const teams = teamsOfRound(round);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {teams.map((ids, i) => {
        const st = relayState(round, ids);
        const runner = !st.done && byId[relayRunner(ids, st.solved)];
        return (
          <div key={i} className="stack" style={{ gap: 4 }}>
            <div className="row between"><TeamBadge team={i} big={big} /><b>{st.solved}/{RELAY_TASKS}{st.done ? ' 🏁' : ''}</b></div>
            <div className="row" style={{ gap: 4 }}>{Array.from({ length: RELAY_TASKS }, (_, k) => <div key={k} style={{ flex: 1, height: big ? 18 : 12, borderRadius: 6, background: k < st.solved ? TEAM_COLORS[i] : 'var(--bg-soft)' }} />)}</div>
            {runner && <span className="small muted">🏃 {t('Dran')}: {runner.avatar} {runner.name}</span>}
          </div>
        );
      })}
    </div>
  );
}

const MathRelay = {
  Play({ code, round, me, byId }) {
    const team = teamOf(round, me.id);
    const ids = teamsOfRound(round)[team];
    const st = relayState(round, ids);
    const k = st.solved;
    const mine = !st.done && relayRunner(ids, k) === me.id;
    const [val, setVal] = useState('');
    const [wrong, setWrong] = useState(false);
    const [sending, setSending] = useState(false);
    useEffect(() => { setVal(''); setSending(false); if (mine) { sfx.go(); vibrate([60, 40, 60]); } }, [k, mine]);
    const task = relayTask(round.game.seed, k);
    const check = () => {
      if (Number(val) === task.answer) { setSending(true); sfx.tap(); submitRelay(code, round.id, me.id, k).catch(() => setSending(false)); }
      else { setWrong(true); sfx.fail(); vibrate(150); setTimeout(() => setWrong(false), 500); setVal(''); }
    };
    return (
      <div className="stack">
        <MyTeam round={round} me={me} />
        <RelayStatus round={round} byId={byId} />
        {st.done ? <Waiting text={`🏁 ${t('Euer Team ist durch! Warte auf die anderen…')}`} /> : mine ? (
          <div className={`card center stack ${wrong ? 'shake' : ''}`} style={{ gap: 10, borderColor: TEAM_COLORS[team] }}>
            <div className="kicker">{t('Du bist dran! Aufgabe {a}/{b}', { a: k + 1, b: RELAY_TASKS })}</div>
            <div className="big-number" style={{ fontSize: 40 }}>{task.text} = ?</div>
            <input className="input" inputMode="numeric" autoFocus value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9-]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && val && check()} />
            <button className="btn primary lg" disabled={!val || sending} onClick={check}>✓ {t('Abgeben')}</button>
          </div>
        ) : (() => {
          const next = Array.from({ length: RELAY_TASKS }, (_, j) => j).find((j) => j >= k && relayRunner(ids, j) === me.id);
          const name = byId[relayRunner(ids, k)]?.name ?? '?';
          return <Waiting text={next != null ? t('{name} rechnet gerade – du bist bei Aufgabe {n} dran.', { name, n: next + 1 }) : t('{name} rechnet gerade – deine Aufgaben sind erledigt.', { name })} />;
        })()}
      </div>
    );
  },
  Stage({ round, byId, big }) { return <RelayStatus round={round} byId={byId} big={big} />; },
  Result({ round, byId }) { return <div className="stack"><Winner round={round} /><RelayStatus round={round} byId={byId} /></div>; },
};

// ------------------------------------------------------------------ 7 Touch-Parcours
function ShaftView({ round, team, big }) {
  const ref = useRef(null);
  const sim = useRef(round.sim); sim.current = round.sim;
  const gates = useRef(makeShaft(round.game.seed));
  const W = big ? 260 : 150; const H = big ? 460 : 300;
  useEffect(() => {
    const ctx = setupCanvas(ref.current, W, H);
    const view = { x: 0, y: 0 }; let raf = 0;
    const sc = W / SHAFT.width;
    const loop = () => {
      const b = sim.current?.balls?.[team] ?? { x: 0, y: 0, alive: true };
      view.x += (b.x - view.x) * 0.25; view.y += (b.y - view.y) * 0.2;
      const sy = (y) => 60 + (y - view.y) * sc;
      const sx = (x) => W / 2 + x * sc;
      ctx.fillStyle = '#1F2937'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#374151'; for (let i = 0; i < 20; i++) ctx.fillRect(0, ((i * 40 - view.y * sc) % H + H) % H, W, 2);
      gates.current.forEach((g) => {
        const y = sy(g.y); if (y < -20 || y > H + 20) return;
        ctx.fillStyle = TEAM_COLORS[team];
        ctx.fillRect(0, y - 5, sx(g.c - SHAFT.gap / 2), 10);
        ctx.fillRect(sx(g.c + SHAFT.gap / 2), y - 5, W, 10);
        ctx.fillStyle = '#FDE047'; ctx.fillRect(sx(g.c - SHAFT.gap / 2) - 2, y - 7, 4, 14); ctx.fillRect(sx(g.c + SHAFT.gap / 2) - 2, y - 7, 4, 14);
      });
      const fy = sy(SHAFT.length); if (fy < H) { ctx.fillStyle = '#16A34A'; ctx.fillRect(0, fy, W, 8); }
      ctx.fillStyle = b.alive ? '#F8FAFC' : '#DC2626';
      ctx.beginPath(); ctx.arc(sx(view.x), sy(view.y), SHAFT.ballR * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `900 ${big ? 18 : 13}px Outfit, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`${'❤️'.repeat(Math.max(0, b.lives ?? SHAFT.lives))} ${Math.round(clamp(view.y / SHAFT.length, 0, 1) * 100)} %${b.alive ? '' : ' 💥'}${b.finishedAt != null ? ' 🏁' : ''}`, W / 2, 6);
      if (b.hitAt != null && (sim.current?.t ?? 0) - b.hitAt < 0.6) { ctx.fillStyle = 'rgba(220,38,38,0.35)'; ctx.fillRect(0, 0, W, H); }
      if (sim.current?.phase === 'count') { ctx.font = '900 48px Outfit, system-ui'; ctx.fillText(String(Math.ceil((sim.current.left ?? 0) / 1000)), W / 2, H / 2 - 24); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [W, H, team]);
  return <canvas ref={ref} className="arcade-canvas" style={{ width: W, height: H, display: 'block' }} />;
}

const TouchParcours = {
  Play({ code, round, me }) {
    const team = teamOf(round, me.id);
    const [v, setV] = useState(0.5);
    const lastSent = useRef(0); const pending = useRef(null);
    const send = (val) => {
      setV(val);
      const now = performance.now();
      clearTimeout(pending.current);
      if (now - lastSent.current > 150) { lastSent.current = now; submitGroupResult(code, round.id, me.id, { s: val }).catch(() => {}); }
      else pending.current = setTimeout(() => { lastSent.current = performance.now(); submitGroupResult(code, round.id, me.id, { s: val }).catch(() => {}); }, 160);
    };
    return (
      <div className="stack center">
        <MyTeam round={round} me={me} />
        <div className="row" style={{ gap: 12, justifyContent: 'center' }}>
          <ShaftView round={round} team={team} />
          <ShaftView round={round} team={1 - team} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>{t('Die Kugel steht beim Schnitt aller Regler eures Teams – sprecht euch ab!')}</p>
        <input type="range" min="0" max="1" step="0.01" value={v} onChange={(e) => send(Number(e.target.value))} className="team-slider" style={{ accentColor: TEAM_COLORS[team] }} />
      </div>
    );
  },
  Stage({ round, big }) {
    return <div className="row" style={{ gap: 20, justifyContent: 'center' }}>{[0, 1].map((i) => <div key={i} className="stack center" style={{ gap: 6 }}><TeamBadge team={i} big={big} /><ShaftView round={round} team={i} big={big} /></div>)}</div>;
  },
  Result({ round }) {
    const v = round.teamValues ?? [0, 0];
    return <div className="stack"><Winner round={round} /><TeamBars values={v.map((x) => x / 100)} labels={v.map((x) => `${x} %`)} /></div>;
  },
};

// ------------------------------------------------------------------ 8 Team-Mehrheits-Duell
function Category({ round, big }) {
  return <div className="card tinted center"><h2 style={{ fontSize: big ? 44 : 26 }}>{t(round.game.category)}</h2></div>;
}
const TeamHivemind = {
  Play({ code, round, me }) {
    const [val, setVal] = useState('');
    const mine = round.results?.[me.id]?.word;
    return (
      <div className="stack">
        <MyTeam round={round} me={me} />
        <Category round={round} />
        {mine ? <Waiting text={t('Abgegeben: „{w}“ – warte auf die anderen…', { w: mine })} /> : (
          <>
            <p className="small muted center" style={{ margin: 0 }}>{t('Was tippt dein Team? Nur exakt gleiche Begriffe zählen!')}</p>
            <input className="input" maxLength={30} value={val} onChange={(e) => setVal(e.target.value)} placeholder={t('Dein Begriff')} />
            <button className="btn primary lg" disabled={!val.trim()} onClick={() => { submitGroupResult(code, round.id, me.id, { word: val.trim() }); sfx.betJingle(); }}>{t('Geheim abgeben')}</button>
          </>
        )}
      </div>
    );
  },
  Stage({ round, byId, big }) {
    return <div className="stack"><Category round={round} big={big} /><TeamLists teams={teamsOfRound(round)} byId={byId} big={big} extra={(id) => (round.results?.[id]?.word ? '🔒' : '…')} /></div>;
  },
  Result({ round, byId }) {
    const teams = teamsOfRound(round);
    return (
      <div className="stack">
        <Category round={round} />
        <Winner round={round} />
        <div className="grid-2">
          {teams.map((ids, i) => {
            const h = hivemindTeam(round, ids);
            return (
              <div key={i} className="card stack" style={{ gap: 4, borderColor: TEAM_COLORS[i] }}>
                <TeamBadge team={i} />
                <b>{h.count}/{ids.length} {t('gleich')}</b>
                {ids.map((id) => <div key={id} className="small">{byId[id]?.avatar} {byId[id]?.name}: „{round.results?.[id]?.word ?? '–'}“</div>)}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};

export const TEAM_GAMES = {
  rafting: Rafting, shakeMarathon: ShakeMarathon, teamSeesaw: TeamSeesaw, compassWheel: CompassWheel,
  teamFlash: TeamFlash, mathRelay: MathRelay, touchParcours: TouchParcours, teamHivemind: TeamHivemind,
};
export { RELAY_MS };
