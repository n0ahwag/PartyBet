import { useEffect, useRef, useState } from 'react';
import { PHASES } from '../game/constants.js';
import { GAMES } from '../game/gameLibrary.js';
import { sfx, vibrate } from '../lib/sound.js';

/**
 * Setzt Akzentfarbe (Spiel > Phase) und Body-Klasse und löst beim
 * Phasenwechsel den Alarm-Screen aus. Gibt die aktive Overlay-Phase zurück.
 */
export function usePhaseFx(room, duel) {
  const [overlay, setOverlay] = useState(null);
  const lastSeen = useRef(null);

  const phase = room?.status === 'playing' ? room.phase : null;
  const accent = (duel && GAMES[duel.gameId]?.accent) || (phase && PHASES[phase].accent) || '#3B82F6';

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  useEffect(() => {
    document.body.classList.remove('phase-warmup', 'phase-chaos', 'phase-suddenDeath');
    if (phase) document.body.classList.add(`phase-${phase}`);
  }, [phase]);

  useEffect(() => {
    const changedAt = room?.phaseChangedAt;
    if (!changedAt || changedAt === lastSeen.current) return undefined;
    lastSeen.current = changedAt;
    if (Date.now() - changedAt > 15000 || phase === 'warmup' || !phase) return undefined;
    setOverlay(phase);
    if (phase === 'chaos') {
      sfx.alarm();
      vibrate([200, 100, 200, 100, 400]);
    } else {
      sfx.doom();
      vibrate([800, 200, 800]);
    }
    const t = setTimeout(() => setOverlay(null), 4200);
    return () => clearTimeout(t);
  }, [room?.phaseChangedAt, phase]);

  return overlay;
}
