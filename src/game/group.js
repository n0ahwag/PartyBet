import { GAMES, CATEGORIES, filterLibrary, ESTIMATE_QUESTIONS } from './gameLibrary.js';
import { SKETCH_PROMPTS, SKETCH } from './extras.js';
import { t } from '../i18n/index.js';
import './screen/index.js'; // registriert die Hauptbildschirm-Spiele 📺

/*
 * Gruppen-Modus: Alle spielen gleichzeitig, ohne Utensilien, für Punkte.
 * Enthält die 5 sozialen Gruppen-Spiele (groupOnly) – zusätzlich laufen alle
 * gruppenfähigen Spiele ohne Utensilien mit (Platz 1/2/3 = 3/2/1 Punkte).
 */

CATEGORIES.group = { label: 'Gruppen-Spiele', icon: '👥' };

export const RANK_POINTS = [3, 2, 1];
export const FINAL_MULTIPLIER = 2;

export const WHO_MOST_QUESTIONS = [
  'Wer verliert am ehesten seinen Schlüssel?',
  'Wer kommt am ehesten zu spät zur eigenen Hochzeit?',
  'Wer würde am ehesten eine Zombie-Apokalypse überleben?',
  'Wer schläft am ehesten im Kino ein?',
  'Wer wird am ehesten berühmt?',
  'Wer schreibt am ehesten nachts um 3 eine peinliche Nachricht?',
  'Wer isst am ehesten etwas vom Boden?',
  'Wer verläuft sich am ehesten mit Navi?',
  'Wer gewinnt am ehesten im Lotto – und verliert den Schein?',
  'Wer weint am ehesten bei einem Werbespot?',
  'Wer startet am ehesten spontan eine Weltreise?',
  'Wer redet am ehesten mit seinen Pflanzen?',
  'Wer wäre am ehesten ein schlechter Geheimagent?',
  'Wer bestellt am ehesten das Gleiche wie immer?',
  'Wer tanzt am ehesten auf dem Tisch?',
  'Wer vergisst am ehesten einen Geburtstag?',
  'Wer hätte am ehesten 20 Katzen?',
  'Wer lacht am ehesten über den eigenen Witz?',
];

export const HIVEMIND_CATEGORIES = [
  'Nenne eine Eissorte', 'Nenne ein Haustier', 'Nenne eine Farbe', 'Nenne etwas, das man am Strand findet',
  'Nenne eine Pizza-Zutat', 'Nenne ein Frühstück', 'Nenne eine Sportart', 'Nenne ein Obst',
  'Nenne einen Superhelden', 'Nenne ein Urlaubsland', 'Nenne etwas Rundes', 'Nenne ein Getränk',
  'Nenne ein Musikinstrument', 'Nenne etwas im Kühlschrank', 'Nenne einen Wochentag', 'Nenne ein Tier im Zoo',
];

export const STORY_STARTS = [
  'Gestern im Supermarkt passierte etwas Unglaubliches:',
  'Als der Bürgermeister die Tür öffnete, sah er',
  'Der Pinguin packte seinen Koffer, denn',
  'Niemand hätte gedacht, dass Oma heimlich',
  'Mitten in der Nacht klingelte das Telefon und',
  'Auf der Weihnachtsfeier stand plötzlich',
  'Der Außerirdische landete in Wanne-Eickel und',
  'Im Fitnessstudio rief der Trainer laut:',
];

const groupOnly = { equipment: [], devices: 'own', groupOnly: true, kind: 'group' };

Object.assign(GAMES, {
  whoMost: {
    ...groupOnly, id: 'whoMost', name: 'Wer am ehesten …', icon: '🗳️', minPlayers: 3, judge: 'auto', accent: '#F43F5E',
    rules: 'Eine Frage erscheint. Alle stimmen geheim ab, welcher Mitspieler am besten passt. Wer mit der Mehrheit stimmt, bekommt einen Punkt.',
    createState: (rng) => ({ question: rng.pick(WHO_MOST_QUESTIONS) }),
  },
  syncTest: {
    ...groupOnly, id: 'syncTest', name: 'Gruppen-Synch-Test', icon: '🤝', minPlayers: 2, judge: 'auto', accent: '#10B981',
    rules: 'Kooperativ! Schaut euch an und tippt ALLE im exakt selben Moment auf den Button. Liegt die Gruppe im Zeitfenster, gewinnen alle.',
    createState: () => ({}),
  },
  hivemind: {
    ...groupOnly, id: 'hivemind', name: 'Hivemind', icon: '🐝', minPlayers: 3, devices: 'none', judge: 'host', accent: '#EAB308',
    rules: 'Eine Kategorie erscheint. Auf „Jetzt!“ ruft jeder gleichzeitig laut einen Begriff. Wer das häufigste Wort gerufen hat, holt die Punkte – der Host trägt es ein.',
    createState: (rng) => ({ category: rng.pick(HIVEMIND_CATEGORIES) }),
  },
  confession: {
    ...groupOnly, id: 'confession', name: 'Beicht-Quiz', icon: '🤫', minPlayers: 3, judge: 'auto', accent: '#8B5CF6',
    rules: 'Jeder tippt heimlich eine überraschende Info über sich ein. Dann erscheinen die Geheimnisse nacheinander – alle raten, wem es gehört.',
    createState: () => ({}),
  },
  chainStory: {
    ...groupOnly, id: 'chainStory', name: 'Ketten-Story', icon: '📜', minPlayers: 2, judge: 'auto', accent: '#0EA5E9',
    rules: 'Ein Satzanfang erscheint. Reihum fügt jeder genau ein Wort hinzu. Am Ende liest die App die absurde Geschichte laut vor.',
    createState: (rng) => ({ start: rng.pick(STORY_STARTS) }),
  },
});

// Erweiterung: Team-Spiele und Zeichnen
Object.assign(GAMES, {
  tugOfWar: {
    ...groupOnly, id: 'tugOfWar', name: 'Team-Tauziehen', icon: '🪢', minPlayers: 2, judge: 'auto', accent: '#F97316',
    rules: 'Die App teilt euch in zwei Teams. 10 Sekunden lang tippt jeder so schnell er kann – das Seil wandert auf dem Bildschirm zum stärkeren Team. Das Team mit dem höchsten Tipp-Schnitt gewinnt.',
    createState: (rng) => ({ seed: rng.int(1, 999999) }),
  },
  teamEstimate: {
    ...groupOnly, id: 'teamEstimate', name: 'Team-Schätzen', icon: '🎯', minPlayers: 4, judge: 'auto', accent: '#0EA5E9',
    rules: 'Zwei Teams, eine Schätzfrage. Jeder schätzt geheim – zählt wird der Mittelwert des Teams. Das Team, dessen Schnitt näher an der richtigen Antwort liegt, gewinnt.',
    createState: (rng) => ({ seed: rng.int(1, 999999), qIdx: rng.int(0, ESTIMATE_QUESTIONS.length - 1) }),
  },
  blindSketch: {
    ...groupOnly, id: 'blindSketch', name: 'Blind-Skizze', icon: '🖍️', minPlayers: 3, judge: 'auto', accent: '#A855F7',
    initialStep: 'draw',
    rules: `Alle zeichnen denselben Begriff – aber blind: Deine Linien bleiben unsichtbar, bis alle fertig sind (${SKETCH.drawMs / 1000} Sekunden). Dann werden die Bilder aufgedeckt und jeder stimmt für das beste fremde Kunstwerk.`,
    createState: (rng) => ({ prompt: rng.pick(SKETCH_PROMPTS) }),
  },
});

// Team-Spiele (Team vs. Team & kooperativ)
CATEGORIES.team = { label: 'Team-Spiele', icon: '🤝' };
const team = { ...groupOnly, kind: 'team', judge: 'auto', minPlayers: 4 };
Object.assign(GAMES, {
  rafting: {
    ...team, id: 'rafting', name: 'Wildwasser-Rafting', icon: '🛶', minPlayers: 2, accent: '#0891B2',
    rules: 'Alle sitzen im selben Boot! Jeder bekommt eine Aufgabe: links rudern, rechts rudern oder Tempo machen. Gedrückt halten = rudern. Sprecht euch ab und weicht den Felsen aus – nach 3 Treffern kentert ihr. Schafft ihr es ins Ziel, bekommen alle 3 Punkte.',
    createState: (rng) => ({ seed: rng.int(1, 999999) }),
  },
  shakeMarathon: {
    ...team, id: 'shakeMarathon', name: 'Schüttel-Marathon', icon: '📳', needsMotion: true, accent: '#DB2777',
    rules: 'Team gegen Team: Auf das Startsignal schüttelt jeder 5 Sekunden lang sein Handy, so oft er kann. Jeder Schüttler zieht am Seil – das Team mit dem höheren Schnitt pro Kopf gewinnt.',
    createState: (rng) => ({ seed: rng.int(1, 999999) }),
  },
  teamSeesaw: {
    ...team, id: 'teamSeesaw', name: 'Team-Wippe', icon: '⚖️', needsMotion: true, accent: '#16A34A',
    rules: 'Jedes Team hält eine wackelige Brücke im Gleichgewicht, während Wellen sie kippen. Gleicht die Wellen aus, indem ihr eure Handys gegenkippt – alle im gleichen Winkel! 20 Sekunden: Das Team mit der längsten Zeit im Gleichgewicht gewinnt.',
    createState: (rng) => ({ seed: rng.int(1, 999999) }),
  },
  compassWheel: {
    ...team, id: 'compassWheel', name: 'Kompass-Riesenrad', icon: '🎡', needsCompass: true, accent: '#7C3AED',
    rules: 'Alle drehen sich mit dem Handy flach in der Hand im Kreis – der Kompass zählt jede Drehung. Jedes Team sammelt gemeinsam Grad (Ziel: 2,5 Umdrehungen pro Person). Wer nach 30 Sekunden weiter ist, gewinnt.',
    createState: (rng) => ({ seed: rng.int(1, 999999) }),
  },
  teamFlash: {
    ...team, id: 'teamFlash', name: 'Team-Lichtblitz', icon: '💡', needsCamera: true, accent: '#CA8A04',
    rules: 'Ein Signal erscheint auf allen Handys gleichzeitig – deckt sofort die Oberseite (Frontkamera) mit der Hand ab. Gezählt wird die durchschnittliche Reaktionszeit des Teams; Frühstart zählt wie 1,5 Sekunden.',
    createState: (rng) => ({ seed: rng.int(1, 999999), ...GAMES.lightFlash.createState(rng) }),
  },
  mathRelay: {
    ...team, id: 'mathRelay', name: 'Mathe-Staffel', icon: '🧮', accent: '#6366F1',
    rules: 'Staffellauf im Kopfrechnen: Im Team löst einer nach dem anderen eine Aufgabe – erst nach der richtigen Antwort ist der Nächste dran. Beide Teams bekommen dieselben 6 Aufgaben. Wer zuerst fertig ist, gewinnt.',
    createState: (rng) => ({ seed: rng.int(1, 999999) }),
  },
  touchParcours: {
    ...team, id: 'touchParcours', name: 'Touch-Parcours', icon: '🎯', accent: '#EA580C',
    rules: 'Jedes Team steuert gemeinsam eine Kugel durch einen Schacht voller Tore. Jeder hat einen Schieberegler – die Kugel steht dort, wo der Schnitt aller Regler liegt. Nur gemeinsam trefft ihr die Lücken – jedes verfehlte Tor kostet ein Leben (3 Leben). Wer weiter kommt, gewinnt.',
    createState: (rng) => ({ seed: rng.int(1, 999999) }),
  },
  teamHivemind: {
    ...team, id: 'teamHivemind', name: 'Team-Mehrheits-Duell', icon: '🧠', accent: '#EAB308',
    rules: 'Beide Teams bekommen dieselbe Frage (z. B. „Nenne eine Eissorte“). Jeder tippt geheim einen Begriff. Es gewinnt das Team, in dem der größte Anteil exakt denselben Begriff getippt hat – denkt wie euer Team!',
    createState: (rng) => ({ seed: rng.int(1, 999999), category: rng.pick(HIVEMIND_CATEGORIES) }),
  },
});
export const TEAM_GAME_IDS = ['rafting', 'shakeMarathon', 'teamSeesaw', 'compassWheel', 'teamFlash', 'mathRelay', 'touchParcours', 'teamHivemind'];
for (const id of ['mathRelay', 'teamHivemind', 'teamFlash']) GAMES[id].quiet = true;

export const GROUP_ONLY_IDS = ['whoMost', 'syncTest', 'hivemind', 'confession', 'chainStory', 'tugOfWar', 'teamEstimate', 'blindSketch', ...TEAM_GAME_IDS];
// Stealth-Modus: diese Gruppen-Spiele gehen auch leise (Ketten-Story ohne Vorlesen)
for (const id of ['whoMost', 'syncTest', 'confession', 'chainStory', 'teamEstimate', 'blindSketch']) GAMES[id].quiet = true;

/** Bibliothek je Spielmodus (wird beim Erstellen im Raum gespeichert). */
export function libraryFor(gameMode, playerCount, equipment = [], { stealth = false, screen = false } = {}) {
  // Hauptbildschirm-Spiele nur, wenn wirklich ein zentraler Bildschirm dabei ist
  const lib = libraryForMode(gameMode, playerCount, equipment).filter((g) => screen || !g.needsScreen);
  return stealth ? lib.filter((g) => g.quiet) : lib;
}

function libraryForMode(gameMode, playerCount, equipment) {
  // Bibliotheks-Lobby: alle Spiele, die die ganze Gruppe spielen kann – der Host wählt passend zur Spielerzahl
  if (gameMode === 'library') return Object.values(GAMES).filter((g) => g.group !== false);
  if (gameMode === 'group') {
    // ohne Utensilien: die Gruppen-Spiele + alle gruppenfähigen Spiele ohne Equipment
    return filterLibrary({ playerCount, equipment: [] }).filter((g) => g.groupOnly || g.group !== false);
  }
  const lib = filterLibrary({ playerCount, equipment }).filter((g) => !g.groupOnly);
  return gameMode === 'board' ? lib.filter((g) => g.group !== false) : lib;
}

/** Punkte für Platzierungen (Platz 1/2/3 = 3/2/1). */
export function pointsForRanks(ranks, playerCount) {
  return Object.fromEntries(Object.entries(ranks).map(([id, r]) => [id, r <= playerCount ? (RANK_POINTS[r - 1] ?? 0) : 0]));
}

// ---------------------------------------------------------------- Wer am ehesten
export function tallyVotes(round) {
  const counts = Object.fromEntries(round.participants.map((id) => [id, 0]));
  for (const r of Object.values(round.results || {})) if (r?.vote && counts[r.vote] !== undefined) counts[r.vote] += 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = max > 0 ? Object.keys(counts).filter((id) => counts[id] === max) : [];
  const points = {};
  const stats = {};
  for (const [uid, r] of Object.entries(round.results || {})) {
    if (r?.vote && top.includes(r.vote)) points[uid] = 1;
  }
  for (const [id, n] of Object.entries(counts)) if (n) stats[id] = { votesReceived: n };
  return { counts, top, points, stats };
}

// ---------------------------------------------------------------- Synch-Test
/** Zeitfenster wächst leicht mit der Gruppengröße. */
export const syncWindow = (n) => 250 + 40 * Math.max(0, n - 2);

/** results[uid].at = Server-Zeitstempel (ms) des Taps – unabhängig von Geräte-Uhren. */
export function syncResult(round) {
  const times = round.participants
    .map((id) => round.results?.[id]?.at)
    .map((t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : t))
    .filter((t) => typeof t === 'number');
  const complete = times.length === round.participants.length;
  const spread = times.length ? Math.max(...times) - Math.min(...times) : null;
  const success = complete && spread <= syncWindow(round.participants.length);
  const points = success ? Object.fromEntries(round.participants.map((id) => [id, 2])) : {};
  const stats = success ? Object.fromEntries(round.participants.map((id) => [id, { syncWins: 1 }])) : {};
  return { spread, success, complete, window: syncWindow(round.participants.length), points, stats };
}

// ---------------------------------------------------------------- Hivemind
/** majority = Spieler, die das häufigste Wort gerufen haben (vom Host eingetragen). */
export function hivemindResult(majority) {
  return {
    points: Object.fromEntries(majority.map((id) => [id, 2])),
    stats: Object.fromEntries(majority.map((id) => [id, { hivemindHits: 1 }])),
  };
}

// ---------------------------------------------------------------- Beicht-Quiz
/** Reihenfolge der Geheimnisse – deterministisch aus dem Runden-Seed. */
export function confessionOrder(round, shuffle) {
  return shuffle(round.participants.filter((id) => round.results?.[id]?.fact));
}

/** Richtig geratene Stimmen +1; Besitzer +2, wenn weniger als die Hälfte richtig lag. */
export function confessionResult(round) {
  const order = round.order || [];
  const points = {};
  const stats = {};
  const add = (id, key, n) => {
    points[id] = (points[id] ?? 0) + (key === 'points' ? n : 0);
    if (key !== 'points') stats[id] = { ...(stats[id] || {}), [key]: (stats[id]?.[key] ?? 0) + n };
  };
  order.forEach((owner, idx) => {
    const guessers = round.participants.filter((id) => id !== owner);
    const right = guessers.filter((id) => round.results?.[id]?.guesses?.[idx] === owner);
    right.forEach((id) => { add(id, 'points', 1); add(id, 'confessCorrect', 1); });
    if (guessers.length && right.length * 2 < guessers.length) { add(owner, 'points', 2); add(owner, 'confessFooled', 1); }
  });
  for (const id of Object.keys(points)) if (!points[id]) delete points[id];
  return { points, stats };
}

// ---------------------------------------------------------------- Ketten-Story
export const storyWordsPerPlayer = (n) => (n > 6 ? 2 : 3);

export function storyWords(round) {
  const words = [];
  for (const r of Object.values(round.results || {})) {
    for (const [idx, w] of Object.entries(r?.words || {})) words[Number(idx)] = w;
  }
  return words;
}

export function storyState(round) {
  const words = storyWords(round);
  const count = words.filter(Boolean).length;
  const n = round.participants.length;
  const total = n * storyWordsPerPlayer(n);
  return {
    words,
    count,
    total,
    done: count >= total,
    turn: round.participants[count % n],
    text: [t(round.game.start), ...words.filter(Boolean)].join(' '),
  };
}

export function storyResult(round) {
  return {
    points: Object.fromEntries(round.participants.map((id) => [id, 1])),
    stats: Object.fromEntries(round.participants.map((id) => [id, { storyWords: storyWordsPerPlayer(round.participants.length) }])),
  };
}

/** Phasen-Texte im Gruppen-Modus. */
export const GROUP_PHASES = {
  warmup: { label: 'Warm-up', title: 'LOS!', tagline: 'Alle gemeinsam!' },
  chaos: { label: 'Chaos-Runde', title: 'CHAOS!', tagline: 'Jetzt wird es wild.' },
  suddenDeath: { label: 'Finale ×2', title: 'FINALE!', tagline: 'Doppelte Punkte!' },
};
