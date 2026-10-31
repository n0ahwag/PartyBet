import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase.js';

/*
 * Universelle Spiel-Statistik über alle Partys: Wie oft wurde jedes Spiel in den letzten
 * 7 Tagen gespielt? Ein Dokument pro Tag: gameStats/{YYYY-MM-DD} = { counts: { gameId: n } }.
 * Die Auswahl bevorzugt die am wenigsten gespielten Spiele. Alles "best effort":
 * Fehlt die Firestore-Regel oder das Netz, läuft das Spiel normal weiter.
 */

export const WINDOW_DAYS = 7;

/** UTC-Tagesschlüssel, z. B. "2026-10-31". */
export const dayKey = (d) => d.toISOString().slice(0, 10);

/** Die letzten n Tage (heute zuerst). */
export function lastDays(n = WINDOW_DAYS, now = new Date()) {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now.getTime() - i * 86400000)));
}

/** Summiert die Tageszähler. */
export function sumCounts(days) {
  const total = {};
  for (const d of days) for (const [id, n] of Object.entries(d?.counts || {})) total[id] = (total[id] ?? 0) + n;
  return total;
}

/** Wöchentliche Zähler { gameId: n } – bei Fehlern ein leeres Objekt. */
export async function weeklyCounts() {
  try {
    const snaps = await Promise.all(lastDays().map((k) => getDoc(doc(db, 'gameStats', k)).catch(() => null)));
    return sumCounts(snaps.map((s) => (s?.exists() ? s.data() : null)));
  } catch {
    return {};
  }
}

/** Ein gespieltes Spiel zählen (nicht blockierend). */
export function recordPlay(gameId) {
  if (!gameId) return;
  const day = dayKey(new Date());
  setDoc(doc(db, 'gameStats', day), { counts: { [gameId]: increment(1) }, last: gameId, day }, { merge: true }).catch(() => {});
}
