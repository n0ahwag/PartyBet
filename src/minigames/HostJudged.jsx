import { GAMES } from '../game/gameLibrary.js';
import { GameArt } from '../components/GameArt.jsx';
import { Rules } from './shared.jsx';
import { t } from '../i18n/index.js';

/** Generische Ansicht für Utensilien-Spiele, die real gespielt und vom Host entschieden werden. */
function View({ duel, big }) {
  const game = GAMES[duel.gameId];
  const shown = duel.participants ? { ...game, rules: game.groupRules ?? game.rules } : game;
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'center' }}><GameArt game={game} size={big ? 180 : 110} /></div>
      <Rules game={shown} />
      <p className="center muted" style={{ margin: 0, fontWeight: 700 }}>{duel.participants ? t('Der Host trägt die Platzierung ein.') : t('Der Host trägt den Gewinner ein.')}</p>
    </div>
  );
}

export const HostJudged = { Play: View, Stage: View, GroupStage: View };
