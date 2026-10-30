import { useState } from 'react';
import { COLORS } from '../game/gameLibrary.js';
import { useGo, CountdownView } from './shared.jsx';
import { sfx } from '../lib/sound.js';

/** Spiel 1 – Farb-Sprint (Real-Life, Host entscheidet). Läuft auf allen Bildschirmen gleich. */
function ColorReveal({ duel, big }) {
  const [shown, setShown] = useState(false);
  const n = useGo(duel.stage === 'playing', () => { setShown(true); sfx.gong(); });
  const color = COLORS.find((c) => c.id === duel.game.color);
  if (duel.stage === 'playing' && !shown && n > 0) return <CountdownView n={n} />;
  return (
    <div className="color-flash pop" style={{ background: color.hex, color: color.id === 'white' ? '#1f1b16' : '#fff', minHeight: big ? 420 : 260 }}>
      {color.label}
    </div>
  );
}

export const ColorSprint = {
  Stage: ({ duel, big }) => <ColorReveal duel={duel} big={big} />,
  Play: ({ duel }) => (
    <div className="stack">
      <ColorReveal duel={duel} />
      <p className="center muted" style={{ margin: 0, fontWeight: 700 }}>Schnapp dir etwas in dieser Farbe und halt es hoch!</p>
    </div>
  ),
};
