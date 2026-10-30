import { ColorSprint } from './ColorSprint.jsx';
import { SpeedTap } from './SpeedTap.jsx';
import { Balance } from './Balance.jsx';
import { MemoryCode } from './MemoryCode.jsx';
import { Estimate } from './Estimate.jsx';
import { HostJudged } from './HostJudged.jsx';
import { Shake } from './Shake.jsx';
import { Compass } from './Compass.jsx';
import { EmojiQuiz } from './EmojiQuiz.jsx';
import { StareDown } from './StareDown.jsx';
import { Rhythm } from './Rhythm.jsx';
import { TruthBluff } from './TruthBluff.jsx';
import { AnywhereGames } from './Anywhere.jsx';

/** gameId → { Play (Gerät des Duellanten), Stage (TV/Zuschauer), Review? } */
export const MINIGAMES = {
  colorSprint: ColorSprint,
  speedTap: SpeedTap,
  balance: Balance,
  memoryCode: MemoryCode,
  estimate: Estimate,
  highCard: HostJudged,
  coinOracle: HostJudged,
  diceDuel: HostJudged,
  cupFlip: HostJudged,
  shake: Shake,
  compass: Compass,
  emojiQuiz: EmojiQuiz,
  stareDown: StareDown,
  rhythm: Rhythm,
  bluffCard: HostJudged,
  coinSprint: HostJudged,
  truthBluff: TruthBluff,
  ...AnywhereGames,
};

/** Unter welchem Schlüssel ein Gerät sein Ergebnis in duel.results ablegt. */
export const resultKey = (duel, uid) => (duel.gameId === 'speedTap' ? 'shared' : uid);
