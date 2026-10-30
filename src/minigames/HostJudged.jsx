import { GAMES } from '../game/gameLibrary.js';
import { Rules } from './shared.jsx';

/** Generische Ansicht für Utensilien-Spiele, die real gespielt und vom Host entschieden werden. */
function View({ duel, big }) {
  const game = GAMES[duel.gameId];
  const shown = duel.participants ? { ...game, rules: game.groupRules ?? game.rules } : game;
  return (
    <div className="stack">
      <div className="center" style={{ fontSize: big ? 140 : 72 }}>{game.icon}</div>
      <Rules game={shown} />
      <p className="center muted" style={{ margin: 0, fontWeight: 700 }}>{duel.participants ? 'Der Host trägt die Platzierung ein.' : 'Der Host trägt den Gewinner ein.'}</p>
    </div>
  );
}

export const HostJudged = { Play: View, Stage: View, GroupStage: View };
