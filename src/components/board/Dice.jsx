import { useEffect, useRef, useState } from 'react';
import { sfx, vibrate } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';
import { DICE_KINDS } from '../../game/board.js';

const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
export const ROLL_MS = 1300;

function Face({ n, size, color }) {
  return (
    <div className="dice-face" style={{ width: size, height: size, borderRadius: size * 0.22, background: color ?? '#fff' }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} style={{ opacity: PIPS[n]?.includes(i) ? 1 : 0, width: size * 0.17, height: size * 0.17 }} />
      ))}
    </div>
  );
}

/** Ein einzelner Würfel: dreht sich mit wechselnden Augen (nur aus `faces`) und landet auf `value`. */
function Die({ value, faces, phase, size, color, onTap }) {
  const [face, setFace] = useState(phase === 'idle' ? faces.at(-1) : value);
  useEffect(() => {
    if (phase !== 'rolling') { if (phase === 'done') setFace(value); return undefined; }
    const iv = setInterval(() => setFace(faces[Math.floor(Math.random() * faces.length)]), 75);
    return () => clearInterval(iv);
  }, [phase, value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button type="button" className={`dice ${phase} ${onTap ? 'tappable' : ''}`} disabled={!onTap}
      onClick={onTap ? () => { vibrate(20); onTap(); } : undefined} aria-label={t('Würfeln')}
      style={{ width: size, height: size }}>
      <Face n={face} size={size} color={color} />
    </button>
  );
}

/**
 * Animierte 2D-Würfel (einer oder mehrere nebeneinander, z. B. Gold- + normaler Würfel):
 * drehen sich mit wechselnden Augen und landen mit Federn auf ihren Werten.
 * rolled = false → ruhend (optional antippbar), true → Animation (einmal), dann Ergebnis.
 * `result` erscheint erst nach der Landung (damit die Zahl nicht vorher verraten wird).
 *
 * @param dice [{ kind: 'gold'|'silver'|'bronze'|'normal', value }]
 */
export function Dice({ dice, rolled, onRoll, size = 120, tint, label, result }) {
  const [phase, setPhase] = useState(rolled ? 'done' : 'idle'); // idle | rolling | done
  const started = useRef(false);

  useEffect(() => {
    if (!rolled || started.current) return undefined;
    started.current = true;
    setPhase('rolling');
    sfx.dice();
    const tm = setTimeout(() => {
      setPhase('done');
      sfx.tusch();
      vibrate([40, 30, 90]);
    }, ROLL_MS);
    return () => clearTimeout(tm);
  }, [rolled]);

  const tappable = !rolled && onRoll;
  return (
    <div className="stack center" style={{ gap: 6 }}>
      <div className="row" style={{ gap: size * 0.18, justifyContent: 'center' }}>
        {dice.map((d, i) => {
          const kind = DICE_KINDS[d.kind] ?? DICE_KINDS.normal;
          return (
            <Die key={i} value={d.value} faces={kind.faces} phase={phase} size={size}
              color={d.kind === 'normal' ? tint : kind.color} onTap={tappable ? onRoll : null} />
          );
        })}
      </div>
      {label}
      {phase === 'done' && result}
    </div>
  );
}
