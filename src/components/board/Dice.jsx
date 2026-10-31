import { useEffect, useRef, useState } from 'react';
import { sfx, vibrate } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

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

/**
 * Animierter 2D-Würfel: dreht sich mit wechselnden Augen und landet mit Federn auf `value`.
 * rolled = false → ruhender Würfel (optional antippbar), true → Animation (einmal), dann Ergebnis.
 * `result` erscheint erst nach der Landung (damit die Zahl nicht vorher verraten wird).
 */
export function Dice({ value, rolled, onRoll, size = 120, color, label, result }) {
  const [face, setFace] = useState(rolled ? value : 6);
  const [phase, setPhase] = useState(rolled ? 'done' : 'idle'); // idle | rolling | done
  const started = useRef(false);

  useEffect(() => {
    if (!rolled || started.current) return undefined;
    started.current = true;
    setPhase('rolling');
    sfx.dice();
    const iv = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 75);
    const tm = setTimeout(() => {
      clearInterval(iv);
      setFace(value);
      setPhase('done');
      sfx.tusch();
      vibrate([40, 30, 90]);
    }, ROLL_MS);
    return () => { clearInterval(iv); clearTimeout(tm); };
  }, [rolled, value]);

  const tappable = !rolled && onRoll;
  return (
    <div className="stack center" style={{ gap: 6 }}>
      <button type="button" className={`dice ${phase} ${tappable ? 'tappable' : ''}`} disabled={!tappable}
        onClick={tappable ? () => { vibrate(20); onRoll(); } : undefined} aria-label={t('Würfeln')}
        style={{ width: size, height: size }}>
        <Face n={face} size={size} color={color} />
      </button>
      {label}
      {phase === 'done' && result}
    </div>
  );
}
