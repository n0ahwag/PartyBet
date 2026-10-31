import { useEffect, useRef, useState } from 'react';
import { FIELD_TYPES } from '../../game/board.js';
import { sfx } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

const STEP_MS = 320; // passt zur Übergangszeit der 3D-Figuren

/** Pfad einer Figur in einer Runde: Feld für Feld bis zur Landung, dann Sprung (Rakete/Portal/Stolperstein). */
function pathOf(m) {
  const path = [];
  for (let i = m.from; i <= (m.landed ?? m.from); i++) path.push(i);
  if (!path.length) path.push(m.from);
  if (m.to !== path.at(-1)) path.push(m.to);
  return path;
}

/**
 * Zeigt Positionen an und animiert nach jeder gezogenen Runde die Bewegung
 * Schritt für Schritt (einmal pro Runde und Gerät).
 */
export function useAnimatedPositions(players, round) {
  const actual = Object.fromEntries(players.map((p) => [p.id, p.position ?? 0]));
  const [anim, setAnim] = useState(null);
  const done = useRef(null);

  useEffect(() => {
    if (round?.stage !== 'resolved' || !round.moves || done.current === round.id) return undefined;
    done.current = round.id;
    const paths = Object.fromEntries(Object.entries(round.moves).map(([id, m]) => [id, pathOf(m)]));
    const len = Math.max(...Object.values(paths).map((p) => p.length));
    let t = 0;
    sfx.dice();
    setAnim(Object.fromEntries(Object.entries(paths).map(([id, p]) => [id, p[0]])));
    const timer = setInterval(() => {
      t += 1;
      if (t >= len) {
        clearInterval(timer);
        setAnim(null);
        const effects = Object.values(round.moves).map((m) => m.effect?.type);
        if (effects.includes('rocket')) sfx.rocket();
        if (effects.includes('portal')) sfx.portal();
        return;
      }
      sfx.step();
      setAnim(Object.fromEntries(Object.entries(paths).map(([id, p]) => [id, p[Math.min(t, p.length - 1)]])));
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [round?.id, round?.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  return anim ? { ...actual, ...anim } : actual;
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
