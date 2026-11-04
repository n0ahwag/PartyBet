import { GAMES } from './gameLibrary.js';
import { makeRng } from '../lib/random.js';

/*
 * Woche für Woche anders: „Spiel der Woche“ und eine Wochen-Regel. Beides ergibt sich
 * deterministisch aus der Kalenderwoche – alle Geräte sehen ohne Server dasselbe.
 * Eine Party übernimmt Regel & Spiel beim Erstellen (room.week), damit sie sich mittendrin nicht ändern.
 */

/** ISO-Kalenderwoche, z. B. "2026-W45". */
export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Wochen-Regeln (Spielfeld- & Gruppen-Modus, inkl. Bibliotheks-Lobby).
 * mods werden pro Runde ins Runden-Dokument geschrieben (round.mods), damit alle Geräte gleich rechnen.
 */
export const WEEK_RULES = {
  chaos: { id: 'chaos', icon: '💥', name: 'Chaos-Woche', desc: 'Doppelt so viele Sonderfelder auf dem Spielfeld.' },
  rocket: { id: 'rocket', icon: '🚀', name: 'Raketen-Woche', desc: 'Raketen schießen 5 statt 3 Felder nach vorn.' },
  speed: { id: 'speed', icon: '⚡', name: 'Speed-Woche', desc: 'Kürzere Wartezeiten: Regeln nur 5 s lesen, 12 s Zeit zum Würfeln.' },
  underdog: { id: 'underdog', icon: '🐢', name: 'Underdog-Woche', desc: 'Der Letzte jeder Runde bekommt einen Bronze-Würfel bzw. 1 Trostpunkt.' },
  jackpot: { id: 'jackpot', icon: '💰', name: 'Jackpot-Woche', desc: 'Jede 3. Runde ist eine Jackpot-Runde: Gold-Würfel für Platz 1 bzw. doppelte Punkte.' },
};
const RULE_IDS = Object.keys(WEEK_RULES);

/** Spiele, die als „Spiel der Woche“ taugen: überall spielbar (ohne Sensoren/Utensilien), automatisch gewertet. */
function featurable() {
  return Object.values(GAMES).filter((g) => g.judge === 'auto' && !g.groupOnly && g.group !== false && !g.equipment?.length
    && !g.needsMotion && !g.needsCompass && !g.needsCamera && !g.needsMic && !g.needsScreen && g.groupScore)
    .map((g) => g.id).sort();
}

export function weekInfo(key = weekKey()) {
  const rng = makeRng(`week:${key}`);
  const rule = rng.pick(RULE_IDS);
  const games = featurable();
  return { key, rule, game: games.length ? rng.pick(games) : null };
}

/**
 * Regeln einer Runde aus der Wochen-Regel der Party.
 * @param week   room.week = { key, rule, game }
 * @param round  Rundennummer, gameId des gewählten Spiels
 * @returns { featured, jackpot, gold1, bronzeLast, rocket, double, consolation }
 */
export function roundMods(week, round, gameId) {
  if (!week) return {};
  const featured = !!week.game && gameId === week.game;
  const jackpot = week.rule === 'jackpot' && round % 3 === 0;
  return {
    featured,
    jackpot,
    gold1: featured || jackpot, // Spielfeld: Platz 1 bekommt immer den Gold-Würfel
    double: featured || jackpot, // Gruppe: doppelte Punkte
    bronzeLast: week.rule === 'underdog',
    consolation: week.rule === 'underdog',
    rocket: week.rule === 'rocket' ? 5 : 3,
    turnMs: week.rule === 'speed' ? 12000 : 20000, // Zeit zum Würfeln
  };
}

/** Wartezeiten je Wochen-Regel. */
export const introMs = (week, normal) => (week?.rule === 'speed' ? Math.min(normal, 5000) : normal);
export const rollTurnMs = (week, normal) => (week?.rule === 'speed' ? Math.min(normal, 12000) : normal);
/** Anzahl-Faktor der Sonderfelder beim Erzeugen des Spielfelds. */
export const specialFactor = (week) => (week?.rule === 'chaos' ? 2 : 1);
