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
 * Animiert nach jeder gezogenen Runde (einmal pro Runde und Gerät):
 *  1. alle Figuren laufen Feld für Feld bis zu ihrem Landefeld,
 *  2. für jedes Sonderfeld erscheint nacheinander eine große Einblendung (banner),
 *     danach springt die Figur (Rakete vor, Portal-Tausch, Stolperstein zurück).
 * @returns { positions, banner } – banner = { playerId, move } oder null
 */
export function useAnimatedPositions(players, round) {
  const actual = Object.fromEntries(players.map((p) => [p.id, p.position ?? 0]));
  const [anim, setAnim] = useState(null);
  const [banner, setBanner] = useState(null);
  const done = useRef(null);

  useEffect(() => {
    if (round?.stage !== 'resolved' || !round.moves || done.current === round.id) return undefined;
    done.current = round.id;
    const moves = round.moves;
    const paths = Object.fromEntries(Object.entries(moves).map(([id, m]) => [id, walkOf(m)]));
    const len = Math.max(...Object.values(paths).map((p) => p.length));
    // Sonderfelder in Zug-Reihenfolge (bester Platz zuerst, wie in applyRound)
    const effects = Object.entries(moves)
      .filter(([, m]) => m.effect && !m.skipped)
      .sort(([, a], [, b]) => (a.rank ?? 99) - (b.rank ?? 99));
    const timers = [];
    let pos = Object.fromEntries(Object.entries(paths).map(([id, p]) => [id, p[0]]));
    let step = 0;
    sfx.dice();
    setAnim(pos);

    const runEffects = (i) => {
      if (i >= effects.length) { setBanner(null); setAnim(null); return; }
      const [id, m] = effects[i];
      setBanner({ playerId: id, move: m });
      const snd = EFFECT_SOUND[m.effect.type];
      if (snd) sfx[snd]?.();
      timers.push(setTimeout(() => {
        pos = { ...pos, [id]: m.to };
        if (m.effect.type === 'portal' && m.effect.with) pos[m.effect.with] = m.landed;
        setAnim(pos);
        setBanner(null);
        timers.push(setTimeout(() => runEffects(i + 1), 650));
      }, BANNER_MS));
    };

    const walk = setInterval(() => {
      step += 1;
      if (step >= len) {
        clearInterval(walk);
        timers.push(setTimeout(() => runEffects(0), 250));
        return;
      }
      sfx.step();
      pos = Object.fromEntries(Object.entries(paths).map(([id, p]) => [id, p[Math.min(step, p.length - 1)]]));
      setAnim(pos);
    }, STEP_MS);
    return () => { clearInterval(walk); timers.forEach(clearTimeout); setBanner(null); };
  }, [round?.id, round?.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  return { positions: anim ? { ...actual, ...anim } : actual, banner };
}

/** Große Vollbild-Einblendung, wenn jemand auf einem Sonderfeld landet (auf allen Geräten). */
export function FieldBanner({ banner, byId }) {
  if (!banner) return null;
  const { move: m, playerId } = banner;
  const p = byId[playerId];
  const type = FIELD_TYPES[m.effect.type];
  const name = p?.name ?? '?';
  const e = m.effect;
  const text = e.type === 'rocket' ? t('{name} fliegt {n} Felder nach vorne!', { name, n: e.delta })
    : e.type === 'portal' ? (e.with ? t('{name} tauscht den Platz mit {other}!', { name, other: byId[e.with]?.name ?? '?' }) : t('{name} ist schon vorne – das Portal bleibt zu.', { name }))
      : e.type === 'stumble' ? (e.kind === 'back' ? t('{name} stolpert 1 Feld zurück.', { name }) : t('{name} muss nächste Runde aussetzen.', { name }))
        : t('{name} löst eine Challenge für alle aus – der Letzte geht 2 Felder zurück!', { name });
  const title = { rocket: 'RAKETE!', portal: 'PORTAL!', stumble: 'STOLPERSTEIN!', chaos: 'CHAOS-FELD!' }[e.type];
  return (
    <div className="overlay field-banner" style={{ '--f': type.color }}>
      <div className="stack center pop" style={{ gap: 10 }}>
        <div className="field-banner-icon">{type.icon}</div>
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
      {['rocket', 'portal', 'chaos', 'stumble'].map((type) => (
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
