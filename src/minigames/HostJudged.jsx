import { GAMES } from '../game/gameLibrary.js';
import { Rules } from './shared.jsx';

/** Generische Ansicht für Utensilien-Spiele, die real gespielt und vom Host entschieden werden. */
function View({ duel, big }) {
  const game = GAMES[duel.gameId];
  return (
    <div className="stack">
      <div className="center" style={{ fontSize: big ? 140 : 72 }}>{game.icon}</div>
      <Rules game={game} />
      <p className="center muted" style={{ margin: 0, fontWeight: 700 }}>Der Host trägt den Gewinner ein.</p>
    </div>
  );
}

export const HostJudged = { Play: View, Stage: View };
