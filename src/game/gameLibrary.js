import { makeRng } from '../lib/random.js';

/**
 * Spielebibliothek. Reine Daten + Logik (keine React-Komponenten), damit
 * Host-Gerät und Tests die gleiche Auswertung nutzen.
 *
 * kind:    real (in echt gespielt) | digital (am Handy) | multi (mehrere Handys)
 * devices: none | shared (1 Gerät für beide) | own (jeder sein Handy)
 * judge:   host (Host tippt Gewinner) | auto (App wertet aus)
 */

export const COLORS = [
  { id: 'red', label: 'ROT', hex: '#EF4444' },
  { id: 'blue', label: 'BLAU', hex: '#3B82F6' },
  { id: 'green', label: 'GRÜN', hex: '#22C55E' },
  { id: 'yellow', label: 'GELB', hex: '#EAB308' },
  { id: 'black', label: 'SCHWARZ', hex: '#111827' },
  { id: 'white', label: 'WEISS', hex: '#F3F4F6' },
  { id: 'pink', label: 'PINK', hex: '#EC4899' },
  { id: 'orange', label: 'ORANGE', hex: '#F97316' },
  { id: 'purple', label: 'LILA', hex: '#8B5CF6' },
];

export const ESTIMATE_QUESTIONS = [
  { q: 'Wie viele Kilometer Spaghetti isst ein Italiener im Leben (ca.)?', a: 25, unit: 'km' },
  { q: 'Wie viele Haare hat ein Mensch durchschnittlich auf dem Kopf?', a: 100000, unit: 'Haare' },
  { q: 'Wie viele Liter Bier trinkt man in Deutschland pro Kopf und Jahr (2023)?', a: 88, unit: 'Liter' },
  { q: 'Wie viele Stunden schläft ein Koala am Tag?', a: 20, unit: 'Std.' },
  { q: 'Wie viele Tasten hat ein Klavier?', a: 88, unit: 'Tasten' },
  { q: 'Wie schwer ist ein Blauwal-Herz?', a: 180, unit: 'kg' },
  { q: 'Wie viele Kniebeugen schafft der Weltrekord in einer Stunde (ca.)?', a: 4700, unit: 'Stück' },
  { q: 'Wie viele Gummibärchen produziert Haribo täglich (in Millionen)?', a: 100, unit: 'Mio.' },
  { q: 'In welchem Jahr wurde die erste SMS verschickt?', a: 1992, unit: '' },
  { q: 'Wie viele Knochen hat ein erwachsener Mensch?', a: 206, unit: 'Knochen' },
  { q: 'Wie lang ist die Chinesische Mauer (inkl. aller Abschnitte)?', a: 21196, unit: 'km' },
  { q: 'Wie viele Herzschläge hat ein Mensch pro Tag (ca.)?', a: 100000, unit: 'Schläge' },
];

export const GAMES = {
  colorSprint: {
    id: 'colorSprint',
    name: 'Farb-Sprint',
    icon: '🎨',
    kind: 'real',
    minPlayers: 3,
    equipment: [],
    devices: 'none',
    judge: 'host',
    accent: '#8B5CF6',
    rules: 'Eine Farbe erscheint. Wer zuerst einen Gegenstand in dieser Farbe zeigt, gewinnt. Der Host entscheidet.',
    createState(rng) {
      return { color: rng.pick(COLORS).id };
    },
  },
  speedTap: {
    id: 'speedTap',
    name: 'Split-Screen Speed-Tap',
    icon: '⚡',
    kind: 'digital',
    minPlayers: 2,
    equipment: [],
    devices: 'shared',
    judge: 'auto',
    accent: '#06B6D4',
    rules: 'Ein Handy, zwei Hälften. Der Button wechselt 5-mal die Farbe – wer nach dem Wechsel zuerst tippt, holt die Runde. Zu früh getippt = Runde verloren.',
    createState(rng) {
      return {
        rounds: Array.from({ length: 5 }, () => ({
          delay: rng.int(1200, 3800),
          color: rng.pick(COLORS.filter((c) => c.id !== 'white' && c.id !== 'black')).hex,
        })),
      };
    },
    /** results.shared = { rounds: [{ winner: 'A'|'B', ms, foul }] } (vom geteilten Gerät geschrieben) */
    decide(duel) {
      const rounds = duel.results?.shared?.rounds;
      if (!rounds || rounds.length < 5) return undefined;
      const a = rounds.filter((r) => r.winner === 'A').length;
      const b = rounds.filter((r) => r.winner === 'B').length;
      if (a === b) return null;
      return a > b ? duel.playerA : duel.playerB;
    },
  },
  balance: {
    id: 'balance',
    name: 'Handy-Balance',
    icon: '🧘',
    kind: 'real',
    minPlayers: 2,
    equipment: [],
    devices: 'own',
    needsMotion: true,
    judge: 'auto',
    accent: '#10B981',
    rules: 'Handy flach auf die Handfläche (oder den Kopf!). 10 Sekunden. Der Sensor misst, wer am ruhigsten ist.',
    createState() {
      return { durationMs: 10000 };
    },
    /** results[uid] = { wobble } – kleiner ist besser. */
    decide(duel) {
      const a = duel.results?.[duel.playerA];
      const b = duel.results?.[duel.playerB];
      if (!a || !b) return undefined;
      const sa = a.wobble * (duel.sabotage?.target === duel.playerA ? 1.15 : 1);
      const sb = b.wobble * (duel.sabotage?.target === duel.playerB ? 1.15 : 1);
      if (sa === sb) return null;
      return sa < sb ? duel.playerA : duel.playerB;
    },
  },
  memoryCode: {
    id: 'memoryCode',
    name: 'Memory-Code',
    icon: '🔢',
    kind: 'digital',
    minPlayers: 2,
    equipment: [],
    devices: 'own',
    judge: 'auto',
    accent: '#6366F1',
    rules: 'Ein Code blitzt kurz auf. Tipp ihn so schnell wie möglich korrekt ein.',
    createState(rng, { phase }) {
      const len = phase === 'suddenDeath' ? 7 : phase === 'chaos' ? 6 : 5;
      return {
        code: Array.from({ length: len }, () => rng.int(0, 9)).join(''),
        showMs: 1600,
      };
    },
    /** results[uid] = { input, ms } */
    decide(duel) {
      const a = duel.results?.[duel.playerA];
      const b = duel.results?.[duel.playerB];
      if (!a || !b) return undefined;
      const code = duel.game.code;
      const okA = a.input === code;
      const okB = b.input === code;
      if (okA && !okB) return duel.playerA;
      if (okB && !okA) return duel.playerB;
      if (!okA && !okB) return null;
      if (a.ms === b.ms) return null;
      return a.ms < b.ms ? duel.playerA : duel.playerB;
    },
  },
  estimate: {
    id: 'estimate',
    name: 'Das Schätz-Duell',
    icon: '🤔',
    kind: 'multi',
    minPlayers: 3,
    equipment: [],
    devices: 'own',
    judge: 'auto',
    accent: '#F59E0B',
    rules: 'Eine skurrile Schätzfrage. Beide tippen geheim. Wer näher dran ist, gewinnt.',
    createState(rng) {
      const idx = rng.int(0, ESTIMATE_QUESTIONS.length - 1);
      return { questionIdx: idx, ...ESTIMATE_QUESTIONS[idx] };
    },
    /** results[uid] = { guess } */
    decide(duel) {
      const a = duel.results?.[duel.playerA];
      const b = duel.results?.[duel.playerB];
      if (!a || !b) return undefined;
      const da = Math.abs(a.guess - duel.game.a);
      const db = Math.abs(b.guess - duel.game.a);
      if (da === db) return null;
      return da < db ? duel.playerA : duel.playerB;
    },
  },

  // ---- Bonus-Bibliothek: zeigt den Utensilien-Filter (Host entscheidet) ----
  highCard: {
    id: 'highCard',
    name: 'Kartenduell',
    icon: '🃏',
    kind: 'real',
    minPlayers: 2,
    equipment: ['cards'],
    devices: 'none',
    judge: 'host',
    accent: '#E11D48',
    rules: 'Best of 3: Beide ziehen verdeckt eine Karte und decken gleichzeitig auf. Höhere Karte holt den Punkt (Ass hoch).',
    createState: () => ({}),
  },
  coinOracle: {
    id: 'coinOracle',
    name: 'Münz-Orakel',
    icon: '🪙',
    kind: 'real',
    minPlayers: 2,
    equipment: ['coins'],
    devices: 'none',
    judge: 'host',
    accent: '#CA8A04',
    rules: 'Abwechselnd Kopf oder Zahl ansagen, 5 Würfe. Wer öfter richtig liegt, gewinnt.',
    createState: () => ({}),
  },
  diceDuel: {
    id: 'diceDuel',
    name: 'Würfel-Showdown',
    icon: '🎲',
    kind: 'real',
    minPlayers: 2,
    equipment: ['dice'],
    devices: 'none',
    judge: 'host',
    accent: '#7C3AED',
    rules: 'Jeder hat 3 Würfe und darf nach jedem Wurf stoppen. Höchste Augensumme gewinnt – über 15 = verloren.',
    createState: () => ({}),
  },
  cupFlip: {
    id: 'cupFlip',
    name: 'Becher-Flip',
    icon: '🥤',
    kind: 'real',
    minPlayers: 2,
    equipment: ['cups'],
    devices: 'none',
    judge: 'host',
    accent: '#0D9488',
    rules: 'Becher an die Tischkante, mit einem Finger hochschnipsen bis er umgedreht landet. Wer zuerst 3-mal schafft, gewinnt.',
    createState: () => ({}),
  },
};

export const CORE_GAME_IDS = ['colorSprint', 'speedTap', 'balance', 'memoryCode', 'estimate'];

/** Filtert die Bibliothek nach Spieleranzahl und vorhandenen Utensilien. */
export function filterLibrary({ playerCount, equipment = [] }) {
  return Object.values(GAMES).filter(
    (g) => playerCount >= g.minPlayers && g.equipment.every((e) => equipment.includes(e)),
  );
}

/** Spiele, die für ein konkretes Duell-Paar spielbar sind (z. B. Gyroskop bei beiden). */
export function playableFor(library, duelists) {
  return library.filter((g) => !g.needsMotion || duelists.every((p) => p?.caps?.motion));
}

/** Wählt ein Spiel; vermeidet direkte Wiederholung, wenn möglich. */
export function pickGame(candidates, lastGameId, seed) {
  if (!candidates.length) return null;
  const rng = makeRng(seed);
  const fresh = candidates.filter((g) => g.id !== lastGameId);
  return rng.pick(fresh.length ? fresh : candidates);
}
