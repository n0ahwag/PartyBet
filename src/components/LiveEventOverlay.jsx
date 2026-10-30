import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { COLORS } from '../game/gameLibrary.js';
import { LIVE_EVENTS, LIVE_EVENT_SIPS, REACTION_MS, STATUE_MS, statueLoser } from '../game/liveEvents.js';
import { reactLiveEvent, resolveLiveEvent, closeLiveEvent } from '../game/engine.js';
import { sfx, vibrate } from '../lib/sound.js';

const MOVE_THRESHOLD = 2.5; // m/s² Sprung zwischen zwei Messungen
const SETTLE_MS = 400;

/** Statue: eigenes Handy misst, ob es bewegt wird, und meldet den Zeitpunkt einmalig. */
function useStatueSensor(active, onMove) {
  useEffect(() => {
    if (!active) return undefined;
    const started = performance.now();
    let last = null;
    let done = false;
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity;
      if (done || !a || a.x == null) return;
      const t = performance.now() - started;
      if (last && t > SETTLE_MS && Math.hypot(a.x - last.x, a.y - last.y, a.z - last.z) > MOVE_THRESHOLD) {
        done = true;
        onMove(Math.round(t));
      }
      last = { x: a.x, y: a.y, z: a.z };
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/**
 * Vollbild-Alarm für spontane Live-Events. Jedes Gerät startet den Timer ab
 * Empfang, damit auch ein langsames Gerät die vollen 3 Sekunden bekommt.
 */
export function LiveEventOverlay({ code, room, players, byId, me, isHost, run }) {
  const ev = room?.liveEvent;
  const def = ev && LIVE_EVENTS[ev.type];
  const [phase, setPhase] = useState(null); // go | freeze | judge
  const [left, setLeft] = useState(0);
  const [moved, setMoved] = useState(false);
  const [reactions, setReactions] = useState({});
  const autoJudged = useRef(null);

  // Neues Event empfangen → Alarm + lokaler Timer
  useEffect(() => {
    if (!ev?.id || ev.status !== 'active') { setPhase(null); return undefined; }
    setPhase('go');
    setMoved(false);
    sfx.alarm();
    vibrate([300, 100, 300, 100, 300]);
    const t0 = performance.now();
    const total = REACTION_MS + (def?.sensor ? STATUE_MS : 0);
    const tick = setInterval(() => {
      const el = performance.now() - t0;
      if (el < REACTION_MS) {
        setLeft(REACTION_MS - el);
      } else if (def?.sensor && el < total) {
        setPhase((p) => (p === 'go' ? 'freeze' : p));
        setLeft(total - el);
      } else {
        setPhase('judge');
        setLeft(0);
        sfx.gong();
        clearInterval(tick);
      }
    }, 50);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev?.id]);

  // Statue: eigenes Handy misst Bewegungen
  useStatueSensor(!!me && def?.sensor && phase === 'freeze' && !moved, (ms) => {
    setMoved(true);
    sfx.fail();
    vibrate(400);
    run(() => reactLiveEvent(code, ev.id, me.id, { movedAfterMs: ms }));
  });

  // Host: Reaktionen live mitlesen und bei Statue automatisch auswerten
  useEffect(() => {
    if (!isHost || !ev?.id || !def?.sensor) return undefined;
    return onSnapshot(doc(db, 'rooms', code, 'liveEvents', ev.id), (s) => setReactions(s.data()?.reactions || {}));
  }, [isHost, ev?.id, def?.sensor, code]);

  useEffect(() => {
    if (!isHost || !def?.sensor || ev?.status !== 'active' || autoJudged.current === ev.id) return undefined;
    const loser = statueLoser(reactions);
    if (!loser) return undefined;
    // kurz warten, falls fast gleichzeitig noch jemand gemeldet hat
    const t = setTimeout(() => {
      autoJudged.current = ev.id;
      run(() => resolveLiveEvent(code, ev.id, statueLoser(reactions)));
    }, 800);
    return () => clearTimeout(t);
  }, [isHost, def?.sensor, ev?.id, ev?.status, reactions, code, run]);

  useEffect(() => {
    if (ev?.status === 'done') {
      if (ev.loserId === me?.id) { sfx.fail(); vibrate([500, 150, 500]); } else sfx.tusch();
    }
  }, [ev?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ev || !def) return null;
  const color = ev.color && COLORS.find((c) => c.id === ev.color);
  const done = ev.status === 'done';
  const loser = byId[ev.loserId];
  const board = room.gameMode === 'board';
  const penaltyText = board
    ? `${ev.penalty ?? 1} ${(ev.penalty ?? 1) === 1 ? 'Feld' : 'Felder'} zurück! ⬅️`
    : `${LIVE_EVENT_SIPS} Schlücke! 🍺`;
  const bg = color && !done ? color.hex : `linear-gradient(160deg, ${def.colors[0]}, ${def.colors[1]})`;
  const ink = color?.id === 'yellow' ? '#1f1b16' : '#fff';

  return (
    <div className={`overlay live-event ${phase === 'go' && !done ? 'live-flash' : ''}`} style={{ background: bg, color: ink, zIndex: 55 }}>
      <div className="stack center" style={{ maxWidth: 720, width: '100%', gap: 14 }}>
        <div className="kicker" style={{ color: ink, opacity: 0.85 }}>{ev.source === 'chaos' ? '💥 Chaos-Feld' : '⚡ Live-Event'}</div>
        <div className="pop" style={{ fontSize: 'clamp(64px, 18vw, 140px)', lineHeight: 1 }}>{def.icon}</div>
        <div className="live-title">{def.title}</div>

        {!done && phase === 'go' && (
          <>
            {color && <div className="live-color">{color.label}</div>}
            <div className="live-text">{def.text}</div>
            <div className="live-bar"><div style={{ width: `${(left / REACTION_MS) * 100}%` }} /></div>
          </>
        )}

        {!done && phase === 'freeze' && (
          <>
            <div className="live-text">{moved ? '😬 Du hast dich bewegt!' : 'NICHT BEWEGEN!'}</div>
            <div className="live-text" style={{ fontSize: 40 }}>{Math.ceil(left / 1000)}s</div>
            {isHost && Object.keys(reactions).length === 0 && <div className="small" style={{ opacity: 0.8 }}>Die Handys messen mit…</div>}
          </>
        )}

        {!done && phase === 'judge' && (
          isHost ? (
            <div className="stack" style={{ width: '100%', gap: 8 }}>
              <div className="live-text">Wer war am langsamsten?</div>
              <div className="live-grid">
                {players.map((p) => (
                  <button key={p.id} className="btn" style={{ background: 'rgba(255,255,255,0.92)', color: '#1f1b16' }}
                    onClick={() => run(() => resolveLiveEvent(code, ev.id, p.id))}>{p.avatar} {p.name}</button>
                ))}
              </div>
              <button className="btn ghost sm" style={{ color: ink, borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => run(() => resolveLiveEvent(code, ev.id, null))}>Alle gleich schnell – {board ? 'keiner muss zurück' : 'keiner trinkt'}</button>
            </div>
          ) : <div className="live-text">⏱ Zeit um! Der Host bestimmt den Langsamsten…</div>
        )}

        {done && (
          <>
            {loser ? (
              <div className="live-result pop">
                <div style={{ fontSize: 56 }}>{loser.avatar}</div>
                <div>
                  {board
                    ? `${ev.loserId === me?.id ? 'Du gehst' : `${loser.name} geht`} ${penaltyText}`
                    : `${ev.loserId === me?.id ? 'Du trinkst' : `${loser.name} trinkt`} ${penaltyText}`}
                </div>
              </div>
            ) : <div className="live-result pop">Glück gehabt – {board ? 'niemand muss zurück' : 'niemand trinkt'}! 🍀</div>}
            {isHost
              ? <button className="btn lg" style={{ background: '#fff', color: '#1f1b16' }} onClick={() => run(() => closeLiveEvent(code))}>
                  {ev.thenDraw ? (board ? '▶️ Weiter zur Challenge' : '⚔️ Weiter zum Duell') : 'Weiter'}
                </button>
              : <div className="small" style={{ opacity: 0.8 }}>Gleich geht's weiter…</div>}
          </>
        )}
      </div>
    </div>
  );
}
