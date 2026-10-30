import { makeRng } from '../lib/random.js';
import { t } from '../i18n/index.js';

/**
 * Spielebibliothek. Reine Daten + Logik (keine React-Komponenten), damit
 * Host-Gerät und Tests die gleiche Auswertung nutzen.
 *
 * kind:    Kategorie, siehe CATEGORIES
 * devices: none | shared (1 Gerät für beide) | own (jeder sein Handy)
 * needs*:  Geräte-Fähigkeiten beider Duellanten (Bewegung, Kompass, Kamera)
 * judge:   host (Host tippt Gewinner) | auto (App wertet aus)
 */

export const CATEGORIES = {
  real: { label: 'Real-Life', icon: '🏃' },
  digital: { label: 'Digital', icon: '📱' },
  multi: { label: 'Multi-Device', icon: '📲' },
  sensor: { label: 'Sensor', icon: '🧭' },
  camera: { label: 'Frontkamera', icon: '📷' },
  audio: { label: 'Audio', icon: '🎵' },
  utensil: { label: 'Utensilien', icon: '🧰' },
  social: { label: 'Social', icon: '🗣️' },
};

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

export const COMPASS_DIRECTIONS = [
  { label: 'Norden', short: 'N', deg: 0 },
  { label: 'Nordosten', short: 'NO', deg: 45 },
  { label: 'Osten', short: 'O', deg: 90 },
  { label: 'Südosten', short: 'SO', deg: 135 },
  { label: 'Süden', short: 'S', deg: 180 },
  { label: 'Südwesten', short: 'SW', deg: 225 },
  { label: 'Westen', short: 'W', deg: 270 },
  { label: 'Nordwesten', short: 'NW', deg: 315 },
];

/** Emoji-Rätsel: answers sind normalisierte Schlüsselwörter (eins davon muss in der Eingabe vorkommen). */
export const EMOJI_PUZZLES = [
  { emojis: '🦁👑', hint: 'Film', answers: ['koenigderloewen', 'lionking'], solution: 'Der König der Löwen' },
  { emojis: '❄️👸', hint: 'Film', answers: ['eiskoenigin', 'frozen'], solution: 'Die Eiskönigin' },
  { emojis: '🐟🔍', hint: 'Film', answers: ['nemo'], solution: 'Findet Nemo' },
  { emojis: '🚢🧊💔', hint: 'Film', answers: ['titanic'], solution: 'Titanic' },
  { emojis: '⚡👓🧙‍♂️', hint: 'Film', answers: ['harrypotter', 'potter'], solution: 'Harry Potter' },
  { emojis: '🦖🏝️', hint: 'Film', answers: ['jurassic'], solution: 'Jurassic Park' },
  { emojis: '🏠👦🎄', hint: 'Film', answers: ['kevin', 'homealone', 'alleinzuhaus'], solution: 'Kevin – Allein zu Haus' },
  { emojis: '🐭👨‍🍳', hint: 'Film', answers: ['ratatouille'], solution: 'Ratatouille' },
  { emojis: '🏴‍☠️🌊💰', hint: 'Film', answers: ['karibik', 'caribbean', 'piratesofthe'], solution: 'Fluch der Karibik' },
  { emojis: '☔💃', hint: 'Song', answers: ['umbrella'], solution: 'Umbrella – Rihanna' },
  { emojis: '🌧️💜', hint: 'Song', answers: ['purplerain'], solution: 'Purple Rain – Prince' },
  { emojis: '🧊🧊👶', hint: 'Song', answers: ['iceicebaby'], solution: 'Ice Ice Baby – Vanilla Ice' },
  { emojis: '👋🎤', hint: 'Song', answers: ['hello'], solution: 'Hello – Adele' },
  { emojis: '💃👑', hint: 'Song', answers: ['dancingqueen'], solution: 'Dancing Queen – ABBA' },
  { emojis: '🌍🏃‍♂️⚡', hint: 'Begriff', answers: ['blitzlauf', 'weltrekord', 'worldrecord', 'bolt'], solution: 'Usain Bolt / Weltrekord' },
  { emojis: '🍺🎪🥨', hint: 'Begriff', answers: ['oktoberfest', 'wiesn'], solution: 'Oktoberfest' },
];

/** Umlaute auflösen, Kleinschreibung, nur Buchstaben/Ziffern. */
export function normalizeAnswer(text) {
  return String(text).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

export function emojiAnswerCorrect(puzzle, input) {
  const n = normalizeAnswer(input);
  return n.length >= 3 && puzzle.answers.some((a) => n.includes(a) || (n.length >= 5 && a.includes(n)));
}

/** Mittlere Abweichung der getippten Abstände vom Muster (ms). Fehlende Taps zählen voll. */
export function rhythmError(pattern, tapTimes) {
  const got = tapTimes.slice(1).map((t, i) => t - tapTimes[i]);
  const errs = pattern.map((p, i) => (got[i] == null ? p : Math.abs(got[i] - p)));
  return Math.round(errs.reduce((sum, e) => sum + e, 0) / pattern.length);
}

/** Kleinere Zahl gewinnt; fehlende/ungültige Werte verlieren; Gleichstand → null. */
function lowerWins(duel, score) {
  const a = duel.results?.[duel.playerA];
  const b = duel.results?.[duel.playerB];
  if (!a || !b) return undefined;
  const sa = score(a, duel.playerA);
  const sb = score(b, duel.playerB);
  if (sa === sb) return null;
  return sa < sb ? duel.playerA : duel.playerB;
}
const sabotaged = (duel, uid) => duel.sabotage?.target === uid;

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
    kind: 'utensil',
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
    kind: 'utensil',
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
    kind: 'utensil',
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
    kind: 'utensil',
    minPlayers: 2,
    equipment: ['cups'],
    devices: 'none',
    judge: 'host',
    accent: '#0D9488',
    rules: 'Becher an die Tischkante, mit einem Finger hochschnipsen bis er umgedreht landet. Wer zuerst 3-mal schafft, gewinnt.',
    createState: () => ({}),
  },

  // ---- Erweiterung: Spiele 6–13 ----
  shake: {
    id: 'shake',
    name: 'Schüttel-Manie',
    icon: '🫨',
    kind: 'sensor',
    minPlayers: 2,
    equipment: [],
    devices: 'own',
    needsMotion: true,
    judge: 'auto',
    accent: '#EF4444',
    rules: 'Handy gut festhalten und 5 Sekunden so oft wie möglich schütteln. Der Beschleunigungssensor zählt mit.',
    createState: () => ({ durationMs: 5000 }),
    /** results[uid] = { shakes } – mehr ist besser */
    decide: (duel) => lowerWins(duel, (r, uid) => -(r.shakes * (sabotaged(duel, uid) ? 0.85 : 1))),
  },
  compass: {
    id: 'compass',
    name: 'Kompass-Axt',
    icon: '🧭',
    kind: 'sensor',
    minPlayers: 2,
    equipment: [],
    devices: 'own',
    needsCompass: true,
    judge: 'auto',
    accent: '#0EA5E9',
    rules: 'Eine Himmelsrichtung erscheint. Richte dein Handy als Erster genau dorthin aus und halte es kurz still.',
    createState(rng) {
      return { target: rng.pick(COMPASS_DIRECTIONS), holdMs: 800, timeoutMs: 20000 };
    },
    /** results[uid] = { ms } (null = nicht geschafft) */
    decide: (duel) => lowerWins(duel, (r, uid) => (r.ms == null ? Infinity : r.ms + (sabotaged(duel, uid) ? 1000 : 0))),
  },
  emojiQuiz: {
    id: 'emojiQuiz',
    name: 'Emoji-Hit-Raten',
    icon: '🤩',
    kind: 'digital',
    minPlayers: 2,
    equipment: [],
    devices: 'own',
    judge: 'auto',
    accent: '#F59E0B',
    rules: 'Eine Emoji-Kombination steht für einen Song, Film oder Begriff. Wer sie zuerst richtig eintippt, gewinnt.',
    createState(rng) {
      const idx = rng.int(0, EMOJI_PUZZLES.length - 1);
      return { puzzleIdx: idx, emojis: EMOJI_PUZZLES[idx].emojis, hint: EMOJI_PUZZLES[idx].hint };
    },
    /** results[uid] = { ms, correct } */
    decide: (duel) => lowerWins(duel, (r, uid) => (r.correct ? r.ms + (sabotaged(duel, uid) ? 2000 : 0) : Infinity)),
  },
  stareDown: {
    id: 'stareDown',
    name: 'Starr-Duell',
    icon: '👁️',
    kind: 'camera',
    minPlayers: 2,
    equipment: [],
    devices: 'own',
    needsCamera: true,
    judge: 'auto',
    accent: '#64748B',
    rules: 'Schaut euch in die Augen – die Frontkamera beobachtet euch. Wer zuerst blinzelt oder lacht, verliert.',
    createState: () => ({ maxMs: 60000, graceMs: 1500 }),
    /** results[uid] = { survivedMs, reason } – länger ist besser */
    decide: (duel) => lowerWins(duel, (r) => -r.survivedMs),
  },
  rhythm: {
    id: 'rhythm',
    name: 'Rhythmus-Echo',
    icon: '🥁',
    kind: 'audio',
    minPlayers: 2,
    equipment: [],
    devices: 'own',
    judge: 'auto',
    accent: '#D946EF',
    rules: 'Hör dir den Rhythmus an und klopf ihn danach so exakt wie möglich auf dem Button nach.',
    createState(rng, { phase }) {
      const beats = phase === 'warmup' ? 5 : 7;
      return { intervals: Array.from({ length: beats - 1 }, () => rng.pick([250, 500, 500, 750])) };
    },
    /** results[uid] = { errorMs } – mittlere Abweichung, kleiner ist besser */
    decide: (duel) => lowerWins(duel, (r, uid) => r.errorMs * (sabotaged(duel, uid) ? 1.15 : 1)),
  },
  bluffCard: {
    id: 'bluffCard',
    name: 'Bluff-Karten-Duell',
    icon: '🎴',
    kind: 'utensil',
    minPlayers: 2,
    equipment: ['cards'],
    devices: 'none',
    judge: 'host',
    accent: '#BE123C',
    rules: 'Jeder zieht verdeckt eine Karte. Nur Spieler A schaut heimlich auf seine und darf bluffen. Spieler B entscheidet blind: Karten tauschen oder behalten? Dann aufdecken – höhere Karte gewinnt.',
    createState: () => ({}),
  },
  coinSprint: {
    id: 'coinSprint',
    name: 'Münz-Sprint',
    icon: '🎯',
    kind: 'utensil',
    minPlayers: 2,
    equipment: ['coins'],
    devices: 'none',
    judge: 'host',
    accent: '#A16207',
    rules: 'Legt eine Markierung (z. B. Bierdeckel) ans andere Tischende. Abwechselnd die Münze rüberschnippen – wer nach 3 Versuchen am nächsten dran ist (oder trifft), gewinnt.',
    createState: () => ({}),
  },
  truthBluff: {
    id: 'truthBluff',
    name: 'Wahrheit oder Bluff',
    icon: '🤥',
    kind: 'social',
    minPlayers: 2,
    equipment: [],
    devices: 'own',
    judge: 'auto',
    accent: '#14B8A6',
    rules: 'Spieler A tippt eine verrückte Behauptung über sich ein und markiert geheim, ob sie stimmt. Spieler B (und alle Zuschauer) raten: Wahr oder Lüge? Liegt B richtig, gewinnt B – sonst A.',
    sequential: true, // B braucht das Ergebnis von A
    createState: () => ({}),
    /** results[A] = { claim, truth }, results[B] = { guess } */
    decide(duel) {
      const a = duel.results?.[duel.playerA];
      const b = duel.results?.[duel.playerB];
      if (!a || !b) return undefined;
      return b.guess === a.truth ? duel.playerB : duel.playerA;
    },
  },
};

export const CORE_GAME_IDS = [
  'colorSprint', 'speedTap', 'balance', 'memoryCode', 'estimate',
  'shake', 'compass', 'emojiQuiz', 'stareDown', 'rhythm', 'bluffCard', 'coinSprint', 'truthBluff',
];

/** Filtert die Bibliothek nach Spieleranzahl und vorhandenen Utensilien. */
export function filterLibrary({ playerCount, equipment = [] }) {
  return Object.values(GAMES).filter(
    (g) => playerCount >= g.minPlayers && g.equipment.every((e) => equipment.includes(e)),
  );
}

/** Spiele, die für ein konkretes Duell-Paar spielbar sind (z. B. Gyroskop bei beiden). */
export function playableFor(library, duelists) {
  const all = (cap) => duelists.every((p) => p?.caps?.[cap]);
  return library.filter((g) => (!g.needsMotion || all('motion'))
    && (!g.needsCompass || all('compass'))
    && (!g.needsCamera || all('camera')));
}

/** Kurzbeschreibung der Voraussetzungen für die Bibliothek. */
export function requirementsOf(game) {
  const r = [];
  r.push(game.minPlayers >= 3 ? t('ab {n} Spieler', { n: game.minPlayers }) : t('2 Spieler'));
  if (game.groupOnly) r.push(t('ganze Gruppe gleichzeitig'));
  if (game.devices === 'shared') r.push(t('1 geteiltes Gerät'));
  if (game.devices === 'own') r.push(t('eigene Smartphones'));
  if (game.needsMotion) r.push(t('Bewegungssensor'));
  if (game.needsCompass) r.push(t('Kompass'));
  if (game.needsCamera) r.push(t('Frontkamera'));
  return r;
}

/** Wählt ein Spiel; vermeidet direkte Wiederholung, wenn möglich. */
export function pickGame(candidates, lastGameId, seed) {
  if (!candidates.length) return null;
  const rng = makeRng(seed);
  const fresh = candidates.filter((g) => g.id !== lastGameId);
  return rng.pick(fresh.length ? fresh : candidates);
}

/**
 * Wählt Duell-Paar + Spiel. Jedes Spiel darf pro Party nur einmal vorkommen.
 * Die Duellanten werden in Wunschreihenfolge geprüft (z. B. Ausgeruhte zuerst);
 * genommen wird das erste Paar, für das noch ein ungespieltes, passendes Spiel existiert.
 * @returns { duelists, game } oder null, wenn kein ungespieltes Spiel mehr passt
 */
export function planDuel({ orderedPlayers, libraryIds = [], playedIds = [], seed }) {
  const unplayed = libraryIds.filter((id) => !playedIds.includes(id)).map((id) => GAMES[id]).filter(Boolean);
  for (let i = 0; i < orderedPlayers.length; i++) {
    for (let j = i + 1; j < orderedPlayers.length; j++) {
      const duelists = [orderedPlayers[i], orderedPlayers[j]];
      const game = pickGame(playableFor(unplayed, duelists), null, seed);
      if (game) return { duelists, game };
    }
  }
  return null;
}

// ------------------------------------------------------------------ Gruppen-Challenges (Spielfeld-Modus)
/*
 * Im Spielfeld-Modus spielen ALLE gleichzeitig. Auto-Spiele bekommen dafür eine
 * Punkte-Funktion (kleiner = besser), aus der die Platzierung entsteht.
 * Host-Spiele (Real-Life/Utensilien) → der Host tippt die Reihenfolge ein.
 */
const GROUP_SCORES = {
  speedTap: (r) => r.avgMs + (r.fouls ?? 0) * 300,
  balance: (r) => r.wobble,
  memoryCode: (r, uid, round) => (r.input === round.game.code ? r.ms : Infinity),
  estimate: (r, uid, round) => Math.abs(r.guess - round.game.a),
  shake: (r) => -r.shakes,
  compass: (r) => (r.ms == null ? Infinity : r.ms),
  emojiQuiz: (r) => (r.correct ? r.ms : Infinity),
  stareDown: (r) => -r.survivedMs,
  rhythm: (r) => r.errorMs,
  truthBluff: (r, uid, round) => {
    const claim = round.results?.[round.playerA];
    if (!claim) return Infinity;
    if (uid === round.playerA) {
      // Erzähler ist vorne, wenn er mindestens die Hälfte reinlegt
      const guesses = Object.entries(round.results).filter(([id]) => id !== round.playerA);
      const fooled = guesses.filter(([, g]) => g.guess !== claim.truth).length;
      return guesses.length && fooled * 2 >= guesses.length ? 0 : 1;
    }
    return r.guess === claim.truth ? 0 : 1;
  },
};

const GROUP_RULES = {
  colorSprint: 'Eine Farbe erscheint. Alle suchen gleichzeitig – der Host trägt ein, wer in welcher Reihenfolge einen passenden Gegenstand hochhält.',
  speedTap: 'Jeder auf seinem Handy: Der Button wechselt 5-mal die Farbe. Tippe nach jedem Wechsel so schnell wie möglich. Bester Durchschnitt gewinnt, zu frühes Tippen kostet Strafzeit.',
  balance: 'Alle legen gleichzeitig ihr Handy flach auf die Hand. Wer am ruhigsten bleibt, gewinnt.',
  memoryCode: 'Alle sehen den gleichen Code kurz aufblitzen. Wer ihn am schnellsten korrekt eintippt, gewinnt.',
  estimate: 'Alle tippen geheim ihre Schätzung. Wer am nächsten dran ist, gewinnt.',
  highCard: 'Jeder zieht verdeckt eine Karte, alle decken gleichzeitig auf. Der Host trägt die Reihenfolge von der höchsten zur niedrigsten Karte ein.',
  coinOracle: 'Jeder sagt 5 Münzwürfe an. Wer am öftesten richtig liegt, gewinnt – der Host trägt die Reihenfolge ein.',
  diceDuel: 'Jeder hat 3 Würfe und darf jederzeit stoppen. Höchste Augensumme (max. 15) gewinnt – der Host trägt die Reihenfolge ein.',
  cupFlip: 'Alle flippen gleichzeitig ihren Becher. Wer zuerst 3-mal schafft, gewinnt – der Host trägt die Reihenfolge ein.',
  coinSprint: 'Reihum schnippt jeder seine Münze Richtung Markierung. Wer am nächsten dran ist, gewinnt – der Host trägt die Reihenfolge ein.',
  shake: 'Alle schütteln gleichzeitig 5 Sekunden lang. Die meisten Schüttler gewinnen.',
  compass: 'Alle richten ihr Handy gleichzeitig in die angezeigte Himmelsrichtung. Wer am schnellsten ist, gewinnt.',
  emojiQuiz: 'Alle raten gleichzeitig dieselben Emojis. Wer zuerst richtig liegt, gewinnt.',
  stareDown: 'Alle starren in ihre Frontkamera. Wer am längsten nicht blinzelt oder lacht, gewinnt.',
  rhythm: 'Alle hören denselben Rhythmus und klopfen ihn nach. Wer am genauesten ist, gewinnt.',
  truthBluff: 'Ein Erzähler tippt eine Behauptung ein, alle anderen raten: wahr oder Lüge? Richtig Ratende landen vorne. Legt der Erzähler mindestens die Hälfte rein, ist er auch vorne.',
};

for (const [id, fn] of Object.entries(GROUP_SCORES)) GAMES[id].groupScore = fn;
for (const [id, text] of Object.entries(GROUP_RULES)) GAMES[id].groupRules = text;
GAMES.bluffCard.group = false; // reines 1-gegen-1

/** Spiele, die alle Teilnehmer gemeinsam spielen können. */
export function groupPlayable(libraryIds, participants) {
  const games = libraryIds.map((id) => GAMES[id]).filter((g) => g && g.group !== false);
  return playableFor(games, participants);
}

/**
 * Platzierungen aus Punkten (kleiner = besser). Gleichstand teilt sich den Platz (1, 1, 3 …).
 * Ohne gültiges Ergebnis: Platz n+1 → man bleibt stehen (auch wenn es niemand geschafft hat).
 */
export function rankFromScores(participantIds, scoreOf) {
  const scored = participantIds.map((id) => {
    const s = scoreOf(id);
    return { id, s: Number.isFinite(s) ? s : Infinity };
  }).sort((a, b) => a.s - b.s);
  const ranks = {};
  scored.forEach((e, i) => {
    if (e.s === Infinity) ranks[e.id] = participantIds.length + 1; // kein/ungültiges Ergebnis → zieht nicht
    else ranks[e.id] = i > 0 && e.s === scored[i - 1].s ? ranks[scored[i - 1].id] : i + 1;
  });
  return ranks;
}

/** Platzierungen für eine Gruppen-Runde mit Auto-Auswertung. */
export function rankGroupRound(round, participantIds) {
  const game = GAMES[round.gameId];
  return rankFromScores(participantIds, (id) => {
    const r = round.results?.[id];
    return r ? game.groupScore(r, id, round) : Infinity;
  });
}

// ------------------------------------------------------------------ Überall spielbar (ohne Utensilien)
/*
 * Ortsunabhängige Spiele: kein Equipment, keine Sensoren – drinnen, draußen,
 * im Zug oder im Café. Alle laufen als Duell UND als Gruppen-Challenge.
 */
CATEGORIES.anywhere = { label: 'Überall spielbar', icon: '🌍' };

export const ASSOCIATION_WORDS = [
  'Sommer', 'Pizza', 'Urlaub', 'Montag', 'Schule', 'Party', 'Hund', 'Kaffee', 'Regen', 'Geld', 'Liebe', 'Weihnachten',
  'Fußball', 'Handy', 'Berlin', 'Strand', 'Zahnarzt', 'Kino', 'Oma', 'Wecker', 'Burger', 'Disco', 'Zug', 'Schnee',
  'Hochzeit', 'Pommes', 'Chef', 'Katze', 'Bier', 'Fernseher',
];

export const SPRINT_CATEGORIES = [
  'Tier', 'Stadt', 'Land', 'Beruf', 'Lebensmittel', 'Vorname', 'Marke', 'Sportart', 'Getränk', 'Pflanze',
  'Film oder Serie', 'Musikinstrument', 'Körperteil', 'Kleidungsstück', 'Fahrzeug',
];
const SPRINT_LETTERS = 'ABDEFGHKLMNPRSTW';

/** Wortkette: Jede Runde hat eine Kategorie – alle Wörter müssen dazu passen (sonst zu leicht). */
export const CHAIN_CATEGORIES = [
  { category: 'Tiere', words: ['Elefant', 'Pinguin', 'Krokodil', 'Giraffe', 'Hamster'] },
  { category: 'Essen & Trinken', words: ['Banane', 'Kuchen', 'Schokolade', 'Tomate', 'Spaghetti'] },
  { category: 'Länder', words: ['Deutschland', 'Brasilien', 'Kanada', 'Norwegen', 'Italien'] },
  { category: 'Städte', words: ['Berlin', 'Paris', 'Madrid', 'London', 'Hamburg'] },
  { category: 'Vornamen', words: ['Anna', 'Tobias', 'Lukas', 'Marie', 'Daniel'] },
  { category: 'Berufe', words: ['Bäcker', 'Lehrer', 'Pilot', 'Arzt', 'Gärtner'] },
  { category: 'Marken', words: ['Adidas', 'Nike', 'Lego', 'Samsung', 'Nutella'] },
  { category: 'Sportarten', words: ['Fußball', 'Tennis', 'Handball', 'Golf', 'Rudern'] },
  { category: 'Dinge im Haushalt', words: ['Taschenlampe', 'Regenschirm', 'Kühlschrank', 'Teller', 'Besen'] },
];
export const CHAIN_WORDS = CHAIN_CATEGORIES.flatMap((c) => c.words);

/** Rechenaufgabe je Phase – gleiche Aufgabe auf allen Geräten (Seed). */
export function makeMathTask(rng, phase = 'warmup') {
  const r = (a, b) => rng.int(a, b);
  const pick = phase === 'suddenDeath' ? 3 : phase === 'chaos' ? r(1, 2) : r(0, 1);
  if (pick === 0) { const a = r(12, 89); const b = r(11, 79); return { text: `${a} + ${b}`, answer: a + b }; }
  if (pick === 1) { const a = r(3, 9); const b = r(6, 19); return { text: `${a} × ${b}`, answer: a * b }; }
  if (pick === 2) { const a = r(40, 99); const b = r(12, 39); const c = r(5, 29); return { text: `${a} − ${b} + ${c}`, answer: a - b + c }; }
  const a = r(6, 14); const b = r(4, 9); const c = r(10, 60);
  return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
}

/** Kategorie-Sprint: Wort beginnt mit dem Buchstaben und hat mindestens 3 Zeichen. */
export function categoryWordValid(word, letter, category) {
  const n = normalizeAnswer(word);
  return n.length >= 3 && n.startsWith(normalizeAnswer(letter)) && n !== normalizeAnswer(category);
}

/** Assoziation: irgendein echtes Wort (≥ 2 Buchstaben), nicht das Reizwort selbst. */
export function associationValid(word, prompt) {
  const n = normalizeAnswer(word);
  return n.length >= 2 && n !== normalizeAnswer(prompt);
}

/** Wen muss ich bei "Geheime Zahlen" knacken? Duell: Gegner. Gruppe: nächster im Kreis. */
export function secretTargetOf(round, uid) {
  if (round.participants?.length) {
    const ps = round.participants;
    return ps[(ps.indexOf(uid) + 1) % ps.length];
  }
  return uid === round.playerA ? round.playerB : round.playerA;
}

/**
 * Schere-Stein-Papier-Turnier: Paarungen werden aus dem Seed ausgelost (alle Geräte
 * berechnen dasselbe), gespeichert werden nur die Sieger je Match.
 */
export function buildBracket(participantIds, seed, winners = {}) {
  let alive = makeRng(`bracket:${seed}`).shuffle(participantIds);
  const rounds = [];
  const outInRound = {};
  for (let r = 0; alive.length > 1 && r < 10; r++) {
    const matches = [];
    const next = [];
    for (let i = 0; i < alive.length; i += 2) {
      const a = alive[i];
      const b = alive[i + 1];
      if (!b) { matches.push({ key: `${r}-${i / 2}`, a, b: null, winner: a, bye: true }); next.push(a); continue; }
      const winner = winners[`${r}-${i / 2}`] ?? null;
      matches.push({ key: `${r}-${i / 2}`, a, b, winner });
      if (winner) { next.push(winner); outInRound[winner === a ? b : a] = r; }
    }
    rounds.push(matches);
    if (matches.some((m) => !m.winner)) break; // aktuelle Runde noch offen
    alive = next;
  }
  const champion = alive.length === 1 ? alive[0] : null;
  return { rounds, champion, outInRound };
}

/** Platzierung aus dem Turnier: wer später rausfliegt, ist besser. */
export function ranksFromBracket(participantIds, bracket) {
  const remainingAfter = [];
  let alive = participantIds.length;
  bracket.rounds.forEach((matches, r) => {
    alive -= matches.filter((m) => !m.bye && m.winner).length;
    remainingAfter[r] = alive;
  });
  return Object.fromEntries(participantIds.map((id) => [
    id, id === bracket.champion ? 1 : (bracket.outInRound[id] != null ? remainingAfter[bracket.outInRound[id]] + 1 : participantIds.length),
  ]));
}

/** Ist das Ergebnis vollständig? (Geheime Zahlen schreibt zuerst nur die eigene Zahl.) */
export function resultComplete(gameId, r) {
  if (!r) return false;
  const g = GAMES[gameId];
  return g?.isComplete ? g.isComplete(r) : true;
}

const NEW_SCORES = {
  stopwatch: (r) => Math.abs(r.ms - r.target),
  mathBlitz: (r) => (r.correct ? r.ms + (r.wrong ?? 0) * 1000 : Infinity),
  f1Start: (r) => (r.jumpStart || r.ms == null ? Infinity : r.ms),
  secretNumber: (r) => (r.done && !r.gaveUp ? r.ms : Infinity),
  association: (r) => (r.valid ? r.ms : Infinity),
  categorySprint: (r) => (r.valid ? r.ms : Infinity),
  numberMemory: (r) => -r.digits * 1e6 + r.ms, // mehr Ziffern zuerst, dann Zeit
};

/** Duell-Auswertung aus der Punkte-Funktion – erst wenn beide Ergebnisse vollständig sind. */
function decideByScore(gameId) {
  return (duel) => {
    const a = duel.results?.[duel.playerA];
    const b = duel.results?.[duel.playerB];
    if (!resultComplete(gameId, a) || !resultComplete(gameId, b)) return undefined;
    const score = NEW_SCORES[gameId];
    const sa = score(a);
    const sb = score(b);
    if (sa === sb) return null;
    return sa < sb ? duel.playerA : duel.playerB;
  };
}

const base = { kind: 'anywhere', minPlayers: 2, equipment: [], anywhere: true };
Object.assign(GAMES, {
  stopwatch: {
    ...base, id: 'stopwatch', name: 'Mentale Stoppuhr', icon: '⏱️', devices: 'own', judge: 'auto', accent: '#0EA5E9',
    rules: 'Die App nennt eine Zielzeit. Starte und stoppe die Uhr blind – ohne Anzeige. Wer am nächsten dran ist, gewinnt.',
    groupRules: 'Alle stoppen gleichzeitig blind die vorgegebene Zielzeit. Wer am nächsten dran ist, gewinnt.',
    createState: (rng) => ({ targetMs: rng.int(300, 800) * 10 }),
  },
  mathBlitz: {
    ...base, id: 'mathBlitz', name: 'Blitz-Kopfrechnen', icon: '🧮', devices: 'own', judge: 'auto', accent: '#6366F1',
    rules: 'Eine Rechenaufgabe erscheint – tipp das Ergebnis so schnell wie möglich ein. Jeder Fehlversuch kostet 1 Sekunde.',
    groupRules: 'Alle bekommen dieselbe Aufgabe. Schnellste richtige Antwort gewinnt, Fehlversuche kosten je 1 Sekunde.',
    createState: (rng, { phase }) => makeMathTask(rng, phase),
  },
  wordChain: {
    ...base, id: 'wordChain', name: 'Wortketten-Duell', icon: '🔗', devices: 'none', judge: 'host', accent: '#14B8A6',
    rankBy: 'elimination',
    rules: 'Reihum laut sprechen: Jedes neue Wort muss zur Kategorie passen und mit dem letzten Buchstaben des vorherigen beginnen. Wer stockt, ein falsches Wort sagt oder eins doppelt nennt, fliegt raus – der Host entscheidet.',
    groupRules: 'Reihum laut: Jedes Wort muss zur Kategorie passen und mit dem letzten Buchstaben des vorherigen beginnen. Der Host tippt an, wer rausfliegt – der Letzte im Spiel gewinnt.',
    createState: (rng) => {
      const { category, words } = rng.pick(CHAIN_CATEGORIES);
      return { category, startWord: rng.pick(words) };
    },
  },
  f1Start: {
    ...base, id: 'f1Start', name: 'Formel-1-Frühstart', icon: '🏎️', devices: 'own', judge: 'auto', accent: '#DC2626',
    rules: 'Der Bildschirm wird schwarz, fünf rote Lichter gehen an. Wenn sie ausgehen: TIPPEN! Wer zu früh tippt, ist disqualifiziert.',
    groupRules: 'Alle Bildschirme werden gleichzeitig schwarz. Lichter aus → tippen! Der Schnellste gewinnt, Frühstarter sind raus.',
    createState: (rng) => ({ holdMs: rng.int(500, 3000) }),
  },
  secretNumber: {
    ...base, id: 'secretNumber', name: 'Geheime Zahlen knacken', icon: '🔐', devices: 'own', judge: 'auto', accent: '#7C3AED',
    rules: 'Jeder tippt heimlich eine Zahl von 10 bis 99. Dann errätst du die Zahl deines Gegners mit Hinweisen „höher“ / „tiefer“. Wer zuerst knackt, gewinnt.',
    groupRules: 'Jeder wählt heimlich eine Zahl von 10 bis 99 und knackt dann die Zahl seines Nachbarn mit „höher“/„tiefer“-Hinweisen. Wer am schnellsten knackt, gewinnt.',
    isComplete: (r) => r.done === true,
    createState: () => ({}),
  },
  association: {
    ...base, id: 'association', name: 'Assoziations-Blitz', icon: '💭', devices: 'own', judge: 'auto', accent: '#EC4899',
    rules: 'Ein Begriff erscheint – tipp sofort das erste Wort ein, das dir dazu einfällt. Der Schnellste gewinnt (8 Sekunden Zeit).',
    groupRules: 'Alle sehen denselben Begriff und tippen ihre erste Assoziation. Schnellste gültige Antwort gewinnt – die Antworten werden danach aufgedeckt.',
    createState: (rng) => ({ prompt: rng.pick(ASSOCIATION_WORDS), limitMs: 8000 }),
  },
  categorySprint: {
    ...base, id: 'categorySprint', name: 'Kategorie-Sprint', icon: '🔤', devices: 'own', judge: 'auto', accent: '#F59E0B',
    rules: 'Kategorie und Anfangsbuchstabe erscheinen – tipp blitzschnell einen passenden Begriff ein (20 Sekunden).',
    groupRules: 'Alle bekommen dieselbe Kategorie und denselben Buchstaben. Schnellster gültiger Begriff gewinnt – die Gruppe sieht danach alle Antworten.',
    createState: (rng) => ({ category: rng.pick(SPRINT_CATEGORIES), letter: rng.pick(SPRINT_LETTERS.split('')), limitMs: 20000 }),
  },
  numberMemory: {
    ...base, id: 'numberMemory', name: 'Zahlen-Merker', icon: '🧠', devices: 'own', judge: 'auto', accent: '#0D9488',
    rules: 'Eine Zahlenfolge blinkt kurz auf – tipp sie aus dem Kopf ein. Jede Runde kommt eine Ziffer dazu. Wer die längste Folge schafft, gewinnt.',
    groupRules: 'Alle bekommen dieselbe, immer länger werdende Zahlenfolge. Die längste fehlerfreie Folge gewinnt, bei Gleichstand die schnellere Zeit.',
    createState: (rng) => ({ digits: Array.from({ length: 14 }, () => rng.int(0, 9)).join(''), startLength: 4 }),
  },
  rps: {
    ...base, id: 'rps', name: 'Echtes Schere-Stein-Papier', icon: '✊', devices: 'none', judge: 'host', accent: '#64748B',
    bracket: true,
    rules: 'Face-to-face am Tisch: Schere, Stein, Papier – Best of 3. Der Host bestätigt den Sieger.',
    groupRules: 'Die App lost die Paarungen eines K.-o.-Turniers aus. Gespielt wird echt am Tisch (Best of 3), der Host bestätigt jeden Sieger.',
    createState: () => ({}),
  },
});

for (const [id, fn] of Object.entries(NEW_SCORES)) {
  GAMES[id].groupScore = fn;
  GAMES[id].decide = decideByScore(id);
}
