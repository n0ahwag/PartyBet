import { EMOJI_PUZZLES } from '../game/gameLibrary.js';
import { PRICE_ITEMS, HIGHER_LOWER_SETS, SHAPE_LABELS, traceAccuracy } from '../game/extras.js';
import { t, tn, locale } from '../i18n/index.js';

/** Zahl mit fester Nachkommastellenzahl im Format der gewählten Sprache (3,39 bzw. 3.39). */
export const num = (n, digits = 2) => n.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const sec = (ms) => `${num(ms / 1000)} s`;
const int = (n) => n.toLocaleString(locale());

/** Kurztext für das Ergebnis eines Spielers in der Platzierungs-Liste (Gruppen-Runden). */
export const FORMAT_RESULT = {
  speedTap: (r) => `Ø ${r.avgMs} ms${r.fouls ? ` · ${r.fouls}× ${t('zu früh')}` : ''}`,
  balance: (r) => `${t('Wackel-Wert')} ${r.wobble.toFixed(3)}`,
  memoryCode: (r, round) => `${r.input === round.game.code ? '✅' : '❌'} ${r.input} · ${sec(r.ms)}`,
  estimate: (r, round) => `${int(r.guess)} (±${int(Math.abs(r.guess - round.game.a))})`,
  shake: (r) => t('{n} Schüttler', { n: r.shakes }),
  compass: (r) => (r.ms == null ? `❌ ${t('nicht geschafft')}` : sec(r.ms)),
  emojiQuiz: (r) => (r.correct ? `✅ ${sec(r.ms)}` : `🏳️ ${t('aufgegeben')}`),
  stareDown: (r) => t('{n} s durchgehalten', { n: num(r.survivedMs / 1000, 1) }),
  rhythm: (r) => `± ${r.errorMs} ms`,
  stopwatch: (r) => {
    const d = r.ms - r.target;
    return `${sec(r.ms)} (${d >= 0 ? '+' : '−'}${num(Math.abs(d) / 1000)} s)`;
  },
  mathBlitz: (r) => (r.correct ? `✅ ${sec(r.ms)}${r.wrong ? ` · ${r.wrong}× ${t('falsch')}` : ''}` : `🏳️ ${t('aufgegeben')}`),
  f1Start: (r) => (r.jumpStart ? `🚫 ${t('Frühstart')}` : r.ms == null ? t('zu spät') : `${r.ms} ms`),
  secretNumber: (r) => (r.gaveUp ? `🏳️ ${t('aufgegeben')}` : `${tn(r.guesses, 'geknackt in {n} Versuch', 'geknackt in {n} Versuchen')} · ${sec(r.ms)}`)
    + (r.secret != null ? ` (${t('eigene Zahl')}: ${r.secret})` : ''),
  association: (r) => (r.valid ? `„${r.word}“ · ${sec(r.ms)}` : r.word ? `„${r.word}“ ❌` : `⏱ ${t('keine Antwort')}`),
  categorySprint: (r) => (r.valid ? `„${r.word}“ · ${sec(r.ms)}` : r.word ? `„${r.word}“ ❌` : `⏱ ${t('keine Antwort')}`),
  numberMemory: (r) => `${t('{n} Ziffern', { n: r.digits })} · ${sec(r.ms)}`,
  spiritLevel: (r) => t('{n} s stabil', { n: num(r.bestMs / 1000, 1) }),
  safeCracker: (r) => (r.ms == null ? `❌ ${r.degrees ?? 0}° / 360°` : `🔓 ${sec(r.ms)}`),
  heightStretch: (r) => `${t('{n} Punkte', { n: r.score })} · ${t('ca. {n} cm Hub', { n: r.heightCm })}`,
  lightFlash: (r) => (r.jumpStart ? `🚫 ${t('Frühstart')}` : r.ms == null ? t('zu spät') : `${r.ms} ms`),
  marbleMaze: (r) => (r.ms == null ? `❌ ${t('nicht geschafft')}` : `🏁 ${sec(r.ms)}`),
  pixelRun: (r) => `🏃 ${r.m} m`,
  blockStacker: (r) => `🧱 ${t('{n} Stockwerke', { n: r.floors })}${r.perfects ? ` · ${r.perfects}× ${t('perfekt')}` : ''}`,
  longJump: (r) => `🦘 ${num(r.best)} m`,
  skyJumper: (r) => `🪜 ${r.m} m`,
  levelHit: (r) => (r.denied ? `🎤 ${t('kein Mikrofon')}` : `🎚️ ${t('{n} s in der Zone', { n: num(r.inMs / 1000, 1) })}`),
  breathBalloon: (r) => (r.popped ? `💥 ${t('geplatzt')}` : `🎈 ${r.size} %`),
  traceLine: (r) => `✍️ ${t('Genauigkeit {n} %', { n: traceAccuracy(r.score) })}`,
  hotWire: (r) => (r.ms == null ? `❌ ${t('{p} % geschafft', { p: Math.round((r.progress ?? 0) * 100) })}` : `🏁 ${sec(r.ms + (r.touches ?? 0) * 2000)} (${t('{n} Berührungen', { n: r.touches ?? 0 })})`),
  higherLower: (r) => `🔥 ${t('{n} richtig', { n: r.streak })} · ${sec(r.ms)}`,
  priceTag: (r) => `🏷️ Ø ${num(r.error, 1)} % ${t('daneben')}`,
  truthBluff: (r, round, uid) => {
    const claim = round.results?.[round.playerA];
    if (uid === round.playerA) return `${t('Erzähler')} (${claim?.truth ? t('stimmt') : t('gelogen')})`;
    return `${t('tippt')} ${r.guess ? t('wahr') : t('Lüge')} ${claim && r.guess === claim.truth ? '✅' : '❌'}`;
  },
};

/** Lösung, die nach der Runde aufgedeckt wird. */
export function revealOf(round) {
  const g = round.game;
  if (round.gameId === 'estimate') return `${t('Richtige Antwort')}: ${int(g.a)} ${t(g.unit)}`;
  if (round.gameId === 'memoryCode') return `Code: ${g.code}`;
  if (round.gameId === 'emojiQuiz') return `${t('Lösung')}: ${t(EMOJI_PUZZLES[g.puzzleIdx].solution)}`;
  if (round.gameId === 'compass') return `${t('Ziel')}: ${t(g.target.label)}`;
  if (round.gameId === 'stopwatch') return `${t('Zielzeit')}: ${sec(g.targetMs)}`;
  if (round.gameId === 'mathBlitz') return `${g.text} = ${g.answer}`;
  if (round.gameId === 'association') return `${t('Begriff')}: ${t(g.prompt)}`;
  if (round.gameId === 'categorySprint') return t('{category} mit „{letter}“', { category: t(g.category), letter: g.letter });
  if (round.gameId === 'numberMemory') return `${t('Folge')}: ${g.digits}`;
  if (round.gameId === 'breathBalloon') return `${t('Geheime Platzgrenze')}: ${Math.round(g.popAt * 100)} %`;
  if (round.gameId === 'levelHit') return `${t('Zielzone')}: ${g.zone.lo}–${g.zone.hi}`;
  if (round.gameId === 'traceLine') return `${t('Form')}: ${t(SHAPE_LABELS[g.shape])}`;
  if (round.gameId === 'higherLower') return `${t('Thema')}: ${t(HIGHER_LOWER_SETS[g.setIdx].topic)}`;
  if (round.gameId === 'priceTag') {
    return g.items.map((idx) => `${t(PRICE_ITEMS[idx].q)}: ${PRICE_ITEMS[idx].a.toLocaleString(locale())} ${t(PRICE_ITEMS[idx].unit)}`).join(' · ');
  }
  return null;
}
