import { getLang } from '../../i18n/index.js';
import { rankFromScores } from '../gameLibrary.js';
import { pointsForRanks } from '../group.js';

/*
 * Gemeinsame Bausteine der Hauptbildschirm-Spiele.
 *
 * Echtzeit-Modell (wie bei allen Spielen in FaceOff Party, nur konsequenter):
 *   rooms/{code}/rounds/{id}
 *     game      – fester Startzustand aus dem Seed (alle Geräte leiten daraus dasselbe ab)
 *     results   – EINGABEN der Handys: jeder schreibt nur results.{eigeneUid}.* (Firestore-Regeln)
 *     sim       – ZUSTAND, den nur der Hauptbildschirm (Host) schreibt: Phase, Timer, Punkte, Positionen
 *
 * Der Hauptbildschirm ist die „Regie“: director.tick(sim, round, now) liest die Eingaben,
 * rechnet den nächsten Zustand und meldet am Ende das Ergebnis (Punkte/Plätze). Die Regie-
 * Funktionen sind rein (kein Firebase, keine Uhr außer `now`) und dadurch testbar.
 */

/** Text in der aktuellen Sprache aus { de, en }. */
export const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[getLang()] ?? o.de);

/** Millisekunden aus einem Firestore-Timestamp (oder Zahl). */
export const msOf = (at) => (at == null ? null : typeof at === 'number' ? at : at.toMillis?.() ?? null);

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Auswertung nach Punktwert: score(id) – höher ist besser (higher=true) oder niedriger.
 * Liefert das Format, das finishGroupRound erwartet.
 */
export function finishByScore(round, score, { higher = true, extra = {} } = {}) {
  const ids = round.participants;
  const ranks = rankFromScores(ids, (id) => {
    const s = score(id);
    return s == null || !Number.isFinite(s) ? Infinity : higher ? -s : s;
  });
  const points = pointsForRanks(ranks, ids.length);
  const stats = Object.fromEntries(ids.filter((id) => ranks[id] === 1).map((id) => [id, { screenWins: 1 }]));
  return { ranks, points, stats, extra };
}

/** Alle bekommen gleich viele Punkte (Koop-Spiele). */
export function finishCoop(round, pts, extra = {}) {
  const points = pts ? Object.fromEntries(round.participants.map((id) => [id, pts])) : {};
  return { points, stats: {}, extra };
}

/** Aus mehreren gleichzeitigen Meldungen (Buzzer, Treffer) die früheste nach Server-Zeit. */
export function earliest(round, ids, pick) {
  let best = null;
  for (const id of ids) {
    const at = msOf(pick(round.results?.[id]));
    if (at != null && (best == null || at < best.at)) best = { id, at };
  }
  return best;
}
