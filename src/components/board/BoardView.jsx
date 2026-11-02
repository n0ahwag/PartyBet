import { useEffect, useRef, useState } from 'react';
import { FIELD_TYPES } from '../../game/board.js';
import { sfx } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

const STEP_MS = 320; // passt zur Übergangszeit der 3D-Figuren

const BANNER_MS = 2600; // so lange steht die große Sonderfeld-Einblendung

/** Weg einer Figur bis zum Landefeld (ohne den Sprung durch ein Sonderfeld). */
function walkOf(m) {
  const path = [];
  for (let i = m.from; i <= (m.landed ?? m.from); i++) path.push(i);
  return path.length ? path : [m.from];
}

const EFFECT_SOUND = { rocket: 'rocket', portal: 'portal', chaos: 'alarm', stumble: 'fail' };

/**
 * Animiert jeden Zug, sobald er gezogen wurde (Würfeln der Reihe nach → ein Zug nach dem anderen):
 *  1. die Figur läuft Feld für Feld bis zu ihrem Landefeld,
 *  2. für jedes Hindernis / Sonderfeld erscheint eine große Einblendung (banner),
 *     danach springt die Figur (Rakete vor, Portal-Tausch, Stolperstein zurück, Absturz).
 * Züge, die beim Öffnen der Seite schon gelaufen sind, werden nicht nachgespielt.
 * @returns { positions, banner, finished, animated }
 *   finished = Runde gezogen und alle Züge fertig animiert · animated = Set der fertig animierten Spieler
 */
export function useAnimatedPositions(players, round) {
  const actual = Object.fromEntries(players.map((p) => [p.id, p.position ?? 0]));
  const [anim, setAnim] = useState(null); // { uid: Feld } – Anzeige-Overrides während einer Animation
  const [banner, setBanner] = useState(null);
  const [animated, setAnimated] = useState(() => new Set());
  const [activeId, setActiveId] = useState(null); // wessen Figur gerade läuft
  const st = useRef({ roundId: null, seen: new Set(), queue: [], busy: false, timers: [] });

  // Runde gewechselt: Züge, die schon da sind, gelten als gesehen (kein Nachspielen nach Neuladen)
  if (round?.id !== st.current.roundId) {
    st.current.timers.forEach(clearTimeout);
    st.current = { roundId: round?.id ?? null, seen: new Set(Object.keys(round?.moves || {})), queue: [], busy: false, timers: [], initial: true };
  }
  const moves = round?.moves || {};
  st.current.moves = moves; // play() liest immer den neuesten Stand
  const fresh = Object.keys(moves).filter((id) => !st.current.seen.has(id));

  useEffect(() => {
    if (st.current.initial) { st.current.initial = false; setAnimated(new Set(st.current.seen)); setAnim(null); setBanner(null); }
  }, [round?.id]);

  const play = () => {
    const s = st.current;
    if (s.busy || !s.queue.length) return;
    s.busy = true;
    const id = s.queue.shift();
    const m = s.moves?.[id];
    const later = (fn, ms) => s.timers.push(setTimeout(fn, ms));
    const done = () => {
      setAnim(null); setBanner(null); setActiveId(null);
      setAnimated((a) => new Set([...a, id]));
      s.busy = false;
      later(play, 150);
    };
    if (!m || m.skipped || (!m.steps && !m.effect && !(m.obstacles || []).length)) { done(); return; }
    const path = walkOf(m);
    setActiveId(id);
    let pos = { [id]: path[0], ...(m.effect?.type === 'portal' && m.effect.with ? { [m.effect.with]: m.to } : {}) };
    setAnim(pos);
    sfx.dice();
    const effects = [...(m.obstacles || []).map((o) => ({ obstacle: o })), ...(m.effect ? [{}] : [])];
    const runEffects = (i) => {
      if (i >= effects.length) { done(); return; }
      const { obstacle } = effects[i];
      setBanner({ playerId: id, move: m, obstacle });
      if (obstacle) { if (obstacle.ok) sfx.tusch(); else sfx.fail(); } else { const snd = EFFECT_SOUND[m.effect.type]; if (snd) sfx[snd]?.(); }
      later(() => {
        if (obstacle) {
          if (!obstacle.ok && obstacle.type === 'jump') pos = { ...pos, [id]: m.to };
        } else {
          pos = { ...pos, [id]: m.to };
          if (m.effect.type === 'portal' && m.effect.with) pos[m.effect.with] = m.landed;
        }
        setAnim(pos);
        setBanner(null);
        later(() => runEffects(i + 1), 700);
      }, BANNER_MS);
    };
    let step = 0;
    const walk = () => {
      step += 1;
      if (step >= path.length) { later(() => runEffects(0), 300); return; }
      sfx.step();
      pos = { ...pos, [id]: path[step] };
      setAnim(pos);
      later(walk, STEP_MS);
    };
    later(walk, STEP_MS);
  };

  useEffect(() => {
    if (!fresh.length) return;
    fresh.forEach((id) => { st.current.seen.add(id); st.current.queue.push(id); });
    play();
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => st.current.timers.forEach(clearTimeout), []);

  // Noch nicht gestartete Züge: Figur bleibt sichtbar auf dem Startfeld (kein kurzes Aufblitzen am Ziel)
  const hold = {};
  for (const id of [...st.current.queue, ...fresh]) {
    const m = moves[id];
    if (!m) continue;
    hold[id] = m.from;
    if (m.effect?.type === 'portal' && m.effect.with) hold[m.effect.with] = m.to;
  }
  const allDone = Object.keys(moves).every((id) => animated.has(id)) && !st.current.busy && !st.current.queue.length && !fresh.length;
  return {
    positions: { ...actual, ...hold, ...(anim || {}) },
    banner,
    animated,
    activeId,
    finished: round?.stage === 'resolved' && allDone,
  };
}

/** Große Vollbild-Einblendung, wenn jemand auf einem Sonderfeld landet oder an ein Hindernis kommt (auf allen Geräten). */
export function FieldBanner({ banner, byId }) {
  if (!banner) return null;
  const { move: m, playerId, obstacle: o } = banner;
  const p = byId[playerId];
  const name = p?.name ?? '?';
  let type; let title; let text;
  if (o) {
    type = FIELD_TYPES[o.type];
    if (o.type === 'boulder') {
      title = o.ok ? 'FELS ZERTRÜMMERT!' : 'FELSBROCKEN!';
      text = o.ok ? t('{name} würfelt eine {n} und bricht durch – der Fels ist weg!', { name, n: o.roll }) : t('{name} würfelt eine {n} – zu wenig! Bleibt vor dem Felsen stehen.', { name, n: o.roll });
    } else if (o.type === 'duck') {
      title = o.ok ? 'GEDUCKT!' : 'AUTSCH!';
      text = o.ok ? t('{name} duckt sich rechtzeitig unter dem Balken durch.', { name }) : t('{name} war zu langsam und bleibt vor dem Balken stehen.', { name });
    } else {
      title = o.ok ? 'GESPRUNGEN!' : 'ABGESTÜRZT!';
      text = o.ok ? t('{name} springt über die Lücke in der Brücke!', { name }) : t('{name} fällt durch die Lücke – 3 Felder zurück.', { name });
    }
  } else {
    type = FIELD_TYPES[m.effect.type];
    const e = m.effect;
    text = e.type === 'rocket' ? t('{name} fliegt {n} Felder nach vorne!', { name, n: e.delta })
      : e.type === 'portal' ? (e.with ? t('{name} tauscht den Platz mit {other}!', { name, other: byId[e.with]?.name ?? '?' }) : t('{name} ist schon vorne – das Portal bleibt zu.', { name }))
        : e.type === 'stumble' ? (e.kind === 'back' ? t('{name} stolpert 1 Feld zurück.', { name }) : t('{name} muss nächste Runde aussetzen.', { name }))
          : t('{name} löst eine Challenge für alle aus – der Letzte geht 2 Felder zurück!', { name });
    title = { rocket: 'RAKETE!', portal: 'PORTAL!', stumble: 'STOLPERSTEIN!', chaos: 'CHAOS-FELD!' }[e.type];
  }
  return (
    <div className="overlay field-banner" style={{ '--f': o ? (o.ok ? '#16A34A' : '#DC2626') : type.color }}>
      <div className="stack center pop" style={{ gap: 10 }}>
        <div className="field-banner-icon">{o?.ok === false ? '💢' : type.icon}</div>
        <div className="field-banner-title">{t(title)}</div>
        <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
          <span className="avatar" style={{ width: 54, height: 54, fontSize: 30, background: `color-mix(in srgb, ${p?.color ?? '#999'} 30%, #fff)` }}>{p?.avatar}</span>
        </div>
        <div className="field-banner-text">{text}</div>
      </div>
    </div>
  );
}

export function FieldLegend() {
  return (
    <div className="row wrap small" style={{ gap: 6 }}>
      {['rocket', 'portal', 'chaos', 'stumble', 'boulder', 'duck', 'jump'].map((type) => (
        <span key={type} className="pill" title={t(FIELD_TYPES[type].desc)}>{FIELD_TYPES[type].icon} {t(FIELD_TYPES[type].label)}: {t(FIELD_TYPES[type].desc)}</span>
      ))}
    </div>
  );
}

/** Rangliste nach Position. */
export function Standings({ players, fields, meId }) {
  const goal = fields.length - 1;
  const sorted = [...players].sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {sorted.map((p, i) => (
        <div key={p.id} className={`player-row ${p.id === meId ? 'me' : ''}`}>
          <span className="faint" style={{ width: 22 }}>#{i + 1}</span>
          <div className="avatar" style={{ background: `color-mix(in srgb, ${p.color} 22%, var(--card))` }}>{p.avatar}</div>
          <div className="grow">
            <b>{p.name}</b>
            {p.skipNext && <span className="pill bad" style={{ marginLeft: 6 }}>{t('setzt aus')}</span>}
            <div className="bar" style={{ marginTop: 4 }}><div style={{ width: `${((p.position ?? 0) / goal) * 100}%` }} /></div>
          </div>
          <span className="balance">{p.position ?? 0}/{goal}</span>
        </div>
      ))}
    </div>
  );
}
