import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { COLORS } from '../game/gameLibrary.js';
import { LIVE_EVENTS, LIVE_EVENT_SIPS, REACTION_MS, STATUE_MS, statueLoser, freezeLoser, isFlat } from '../game/liveEvents.js';
import { reactLiveEvent, resolveLiveEvent, closeLiveEvent } from '../game/engine.js';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

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

/** Gruppen-Freeze: meldet, sobald das Handy 300 ms flach & ruhig liegt. noSensor → Ersatz-Knopf zeigen. */
function useFlatSensor(active, onFlat) {
  const [noSensor, setNoSensor] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    const started = performance.now();
    let flatSince = null;
    let seen = false;
    let done = false;
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity;
      if (done || !a || a.x == null) return;
      seen = true;
      const now = performance.now();
      if (isFlat(a)) {
        flatSince ??= now;
        if (now - flatSince >= 300) { done = true; onFlat(Math.round(flatSince - started)); }
      } else flatSince = null;
    };
    const check = setTimeout(() => { if (!seen) setNoSensor(true); }, 900);
    window.addEventListener('devicemotion', onMotion);
    return () => { clearTimeout(check); window.removeEventListener('devicemotion', onMotion); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return noSensor;
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
  const [reported, setReported] = useState(false);
  const autoJudged = useRef(null);
  const holding = useRef(false);
  const freezeStart = useRef(0);
  const reactMs = def?.reactionMs ?? REACTION_MS;
  const measured = !!def?.measure;
  const report = (data) => { if (reported || !me) return; setReported(true); run(() => reactLiveEvent(code, ev.id, me.id, data)); };

  // Neues Event empfangen → Alarm + lokaler Timer
  useEffect(() => {
    if (!ev?.id || ev.status !== 'active') { setPhase(null); return undefined; }
    setPhase('go');
    setMoved(false);
    setReported(false);
    holding.current = false;
    sfx.alarm();
    vibrate([300, 100, 300, 100, 300]);
    const t0 = performance.now();
    const rMs = def?.reactionMs ?? REACTION_MS;
    const total = rMs + (def?.sensor ? STATUE_MS : 0);
    const tick = setInterval(() => {
      const el = performance.now() - t0;
      if (el < rMs) {
        setLeft(rMs - el);
      } else if (def?.sensor && el < total) {
        setPhase((p) => {
          if (p === 'go') freezeStart.current = performance.now();
          return p === 'go' ? 'freeze' : p;
        });
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

  // Daumen-Krieg: liegt der Daumen zu Beginn der Haltephase nicht auf, ist man sofort raus
  useEffect(() => {
    if (def?.measure === 'hold' && phase === 'freeze' && !holding.current && me && !reported) {
      setMoved(true); sfx.fail(); vibrate(400); report({ movedAfterMs: 0 });
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const release = () => {
    holding.current = false;
    if (def?.measure === 'hold' && phase === 'freeze' && !moved) {
      setMoved(true); sfx.fail(); vibrate(400);
      report({ movedAfterMs: Math.round(performance.now() - freezeStart.current) });
    }
  };

  // Gruppen-Freeze: Handy flach hinlegen
  const noFlatSensor = useFlatSensor(!!me && def?.measure === 'flat' && phase === 'go' && !reported, (ms) => {
    sfx.tap(); vibrate(60); report({ flatAfterMs: ms });
  });

  // Statue: eigenes Handy misst Bewegungen
  useStatueSensor(!!me && def?.measure === 'motion' && phase === 'freeze' && !moved, (ms) => {
    setMoved(true);
    sfx.fail();
    vibrate(400);
    run(() => reactLiveEvent(code, ev.id, me.id, { movedAfterMs: ms }));
  });

  // Host: Reaktionen live mitlesen und bei Statue automatisch auswerten
  useEffect(() => {
    if (!isHost || !ev?.id || !measured) return undefined;
    return onSnapshot(doc(db, 'rooms', code, 'liveEvents', ev.id), (s) => setReactions(s.data()?.reactions || {}));
  }, [isHost, ev?.id, measured, code]);

  // Gruppen-Freeze: auswerten, sobald alle liegen – oder am Ende, wenn genau einer fehlt
  useEffect(() => {
    if (!isHost || def?.measure !== 'flat' || ev?.status !== 'active' || autoJudged.current === ev.id) return;
    const loser = freezeLoser(reactions, players.map((p) => p.id), phase === 'judge');
    if (loser === undefined) return;
    autoJudged.current = ev.id;
    run(() => resolveLiveEvent(code, ev.id, loser));
  }, [isHost, def?.measure, ev?.id, ev?.status, reactions, phase, players, code, run]);

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
  const group = room.gameMode === 'group';
  const isMe = ev.loserId === me?.id;
  const n = board ? (ev.penalty ?? 1) : LIVE_EVENT_SIPS;
  const vars = { name: byId[ev.loserId]?.name, n };
  const loserText = group
    ? (isMe ? t('Du verlierst 1 Punkt! ➖') : t('{name} verliert 1 Punkt! ➖', vars))
    : board
      ? (isMe ? t(n === 1 ? 'Du gehst 1 Feld zurück! ⬅️' : 'Du gehst {n} Felder zurück! ⬅️', vars) : t(n === 1 ? '{name} geht 1 Feld zurück! ⬅️' : '{name} geht {n} Felder zurück! ⬅️', vars))
      : (isMe ? t('Du trinkst {n} Schlücke! 🍺', vars) : t('{name} trinkt {n} Schlücke! 🍺', vars));
  const bg = color && !done ? color.hex : `linear-gradient(160deg, ${def.colors[0]}, ${def.colors[1]})`;
  const ink = color?.id === 'yellow' ? '#1f1b16' : '#fff';

  return (
    <div className={`overlay live-event ${phase === 'go' && !done ? 'live-flash' : ''}`} style={{ background: bg, color: ink, zIndex: 55 }}>
      <div className="stack center" style={{ maxWidth: 720, width: '100%', gap: 14 }}>
        <div className="kicker" style={{ color: ink, opacity: 0.85 }}>{ev.source === 'chaos' ? `💥 ${t('Chaos-Feld')}` : '⚡ Live-Event'}</div>
        <div className="pop" style={{ fontSize: 'clamp(64px, 18vw, 140px)', lineHeight: 1 }}>{def.icon}</div>
        <div className="live-title">{t(def.title)}</div>

        {!done && phase === 'go' && (
          <>
            {color && <div className="live-color">{t(color.label)}</div>}
            <div className="live-text">{t(def.text)}</div>
            {def.measure === 'flat' && me && (reported
              ? <div className="live-text" style={{ fontSize: 26 }}>✅ {t('Liegt!')}</div>
              : noFlatSensor && <button className="btn lg" style={{ background: '#fff', color: '#1f1b16' }} onClick={() => report({ flatAfterMs: Math.round(reactMs - left) })}>{t('Mein Handy liegt flach')}</button>)}
            <div className="live-bar"><div style={{ width: `${(left / reactMs) * 100}%` }} /></div>
          </>
        )}
        {!done && def.measure === 'hold' && me && (phase === 'go' || phase === 'freeze') && (
          <div className="thumb-pad" style={{ touchAction: 'none', userSelect: 'none' }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); holding.current = true; vibrate(30); }}
            onPointerUp={release} onPointerCancel={release}>
            {moved ? `😬 ${t('Losgelassen!')}` : `👍 ${t('Hier gedrückt halten')}`}
          </div>
        )}

        {!done && phase === 'freeze' && (
          <>
            <div className="live-text">{def.measure === 'hold' ? (moved ? `😬 ${t('Du hast losgelassen!')}` : t('NICHT LOSLASSEN!')) : moved ? `😬 ${t('Du hast dich bewegt!')}` : t('NICHT BEWEGEN!')}</div>
            <div className="live-text" style={{ fontSize: 40 }}>{Math.ceil(left / 1000)}s</div>
            {isHost && Object.keys(reactions).length === 0 && <div className="small" style={{ opacity: 0.8 }}>{t('Die Handys messen mit…')}</div>}
          </>
        )}

        {!done && phase === 'judge' && (
          isHost ? (
            <div className="stack" style={{ width: '100%', gap: 8 }}>
              <div className="live-text">{t('Wer war am langsamsten?')}</div>
              <div className="live-grid">
                {players.map((p) => (
                  <button key={p.id} className="btn" style={{ background: 'rgba(255,255,255,0.92)', color: '#1f1b16' }}
                    onClick={() => run(() => resolveLiveEvent(code, ev.id, p.id))}>{p.avatar} {p.name}</button>
                ))}
              </div>
              <button className="btn ghost sm" style={{ color: ink, borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={() => run(() => resolveLiveEvent(code, ev.id, null))}>{group ? t('Alle gleich schnell – keiner verliert') : board ? t('Alle gleich schnell – keiner muss zurück') : t('Alle gleich schnell – keiner trinkt')}</button>
            </div>
          ) : <div className="live-text">⏱ {t('Zeit um! Der Host bestimmt den Langsamsten…')}</div>
        )}

        {done && (
          <>
            {loser ? (
              <div className="live-result pop">
                <div style={{ fontSize: 56 }}>{loser.avatar}</div>
                <div>{loserText}</div>
              </div>
            ) : <div className="live-result pop">{group ? t('Glück gehabt – niemand verliert Punkte! 🍀') : board ? t('Glück gehabt – niemand muss zurück! 🍀') : t('Glück gehabt – niemand trinkt! 🍀')}</div>}
            {isHost
              ? <button className="btn lg" style={{ background: '#fff', color: '#1f1b16' }} onClick={() => run(() => closeLiveEvent(code))}>
                  {ev.thenDraw ? (board ? `▶️ ${t('Weiter zur Challenge')}` : group ? `▶️ ${t('Weiter zur Runde')}` : `⚔️ ${t('Weiter zum Duell')}`) : t('Weiter')}
                </button>
              : <div className="small" style={{ opacity: 0.8 }}>{t("Gleich geht's weiter…")}</div>}
          </>
        )}
      </div>
    </div>
  );
}
