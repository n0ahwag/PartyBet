import { ColorSprint } from './ColorSprint.jsx';
import { SpeedTap } from './SpeedTap.jsx';
import { Balance } from './Balance.jsx';
import { MemoryCode } from './MemoryCode.jsx';
import { Estimate } from './Estimate.jsx';
import { HostJudged } from './HostJudged.jsx';

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
};

/** Unter welchem Schlüssel ein Gerät sein Ergebnis in duel.results ablegt. */
export const resultKey = (duel, uid) => (duel.gameId === 'speedTap' ? 'shared' : uid);
