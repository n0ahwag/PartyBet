import { EMOJI_PUZZLES } from '../game/gameLibrary.js';

const sec = (ms) => `${(ms / 1000).toFixed(2)}s`;

/** Kurztext für das Ergebnis eines Spielers in der Platzierungs-Liste (Gruppen-Runden). */
export const FORMAT_RESULT = {
  speedTap: (r) => `Ø ${r.avgMs} ms${r.fouls ? ` · ${r.fouls}× zu früh` : ''}`,
  balance: (r) => `Wackel-Wert ${r.wobble.toFixed(3)}`,
  memoryCode: (r, round) => `${r.input === round.game.code ? '✅' : '❌'} ${r.input} · ${sec(r.ms)}`,
  estimate: (r, round) => `${r.guess.toLocaleString('de-DE')} (±${Math.abs(r.guess - round.game.a).toLocaleString('de-DE')})`,
  shake: (r) => `${r.shakes} Schüttler`,
  compass: (r) => (r.ms == null ? '❌ nicht geschafft' : sec(r.ms)),
  emojiQuiz: (r) => (r.correct ? `✅ ${sec(r.ms)}` : '🏳️ aufgegeben'),
  stareDown: (r) => `${(r.survivedMs / 1000).toFixed(1)}s durchgehalten`,
  rhythm: (r) => `± ${r.errorMs} ms`,
  truthBluff: (r, round, uid) => {
    const claim = round.results?.[round.playerA];
    if (uid === round.playerA) return `Erzähler (${claim?.truth ? 'stimmt' : 'gelogen'})`;
    return `tippt ${r.guess ? 'wahr' : 'Lüge'} ${claim && r.guess === claim.truth ? '✅' : '❌'}`;
  },
};

/** Lösung, die nach der Runde aufgedeckt wird. */
export function revealOf(round) {
  if (round.gameId === 'estimate') return `Richtige Antwort: ${round.game.a.toLocaleString('de-DE')} ${round.game.unit}`;
  if (round.gameId === 'memoryCode') return `Code: ${round.game.code}`;
  if (round.gameId === 'emojiQuiz') return `Lösung: ${EMOJI_PUZZLES[round.game.puzzleIdx].solution}`;
  if (round.gameId === 'compass') return `Ziel: ${round.game.target.label}`;
  return null;
}
