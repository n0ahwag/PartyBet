import { EMOJI_PUZZLES } from '../game/gameLibrary.js';

const de = (n, digits = 2) => n.toFixed(digits).replace('.', ',');
const sec = (ms) => `${de(ms / 1000)} s`;

/** Kurztext für das Ergebnis eines Spielers in der Platzierungs-Liste (Gruppen-Runden). */
export const FORMAT_RESULT = {
  speedTap: (r) => `Ø ${r.avgMs} ms${r.fouls ? ` · ${r.fouls}× zu früh` : ''}`,
  balance: (r) => `Wackel-Wert ${r.wobble.toFixed(3)}`,
  memoryCode: (r, round) => `${r.input === round.game.code ? '✅' : '❌'} ${r.input} · ${sec(r.ms)}`,
  estimate: (r, round) => `${r.guess.toLocaleString('de-DE')} (±${Math.abs(r.guess - round.game.a).toLocaleString('de-DE')})`,
  shake: (r) => `${r.shakes} Schüttler`,
  compass: (r) => (r.ms == null ? '❌ nicht geschafft' : sec(r.ms)),
  emojiQuiz: (r) => (r.correct ? `✅ ${sec(r.ms)}` : '🏳️ aufgegeben'),
  stareDown: (r) => `${de(r.survivedMs / 1000, 1)} s durchgehalten`,
  rhythm: (r) => `± ${r.errorMs} ms`,
  stopwatch: (r) => {
    const d = r.ms - r.target;
    return `${sec(r.ms)} (${d >= 0 ? '+' : '−'}${de(Math.abs(d) / 1000)} s)`;
  },
  mathBlitz: (r) => (r.correct ? `✅ ${sec(r.ms)}${r.wrong ? ` · ${r.wrong}× falsch` : ''}` : '🏳️ aufgegeben'),
  f1Start: (r) => (r.jumpStart ? '🚫 Frühstart' : r.ms == null ? 'zu spät' : `${r.ms} ms`),
  secretNumber: (r) => (r.gaveUp ? '🏳️ aufgegeben' : `geknackt in ${r.guesses} ${r.guesses === 1 ? 'Versuch' : 'Versuchen'} · ${sec(r.ms)}`)
    + (r.secret != null ? ` (eigene Zahl: ${r.secret})` : ''),
  association: (r) => (r.valid ? `„${r.word}“ · ${sec(r.ms)}` : r.word ? `„${r.word}“ ❌` : '⏱ keine Antwort'),
  categorySprint: (r) => (r.valid ? `„${r.word}“ · ${sec(r.ms)}` : r.word ? `„${r.word}“ ❌` : '⏱ keine Antwort'),
  numberMemory: (r) => `${r.digits} Ziffern · ${sec(r.ms)}`,
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
  if (round.gameId === 'stopwatch') return `Zielzeit: ${sec(round.game.targetMs)}`;
  if (round.gameId === 'mathBlitz') return `${round.game.text} = ${round.game.answer}`;
  if (round.gameId === 'association') return `Begriff: ${round.game.prompt}`;
  if (round.gameId === 'categorySprint') return `${round.game.category} mit „${round.game.letter}“`;
  if (round.gameId === 'numberMemory') return `Folge: ${round.game.digits}`;
  return null;
}
