import { makeRng } from '../lib/random.js';

/*
 * Spielfeld-Modus (alkoholfrei): reine Spiellogik ohne Firebase.
 * Alle spielen jede Challenge gemeinsam und würfeln danach; die Platzierung
 * bestimmt, welchen Spezialwürfel man zusätzlich bekommt. Wer zuerst das Ziel erreicht, gewinnt.
 */

/**
 * Spielfeld-Längen. Per Simulation so gewählt, dass eine Partie mindestens ~10 Challenges dauert
 * (rounds = typische Anzahl Challenges bis zum Ziel, Median aus 900 simulierten Partien).
 */
export const BOARD_LENGTHS = {
  short: { id: 'short', label: 'Kurz', fields: 90, rounds: 14 },
  normal: { id: 'normal', label: 'Normal', fields: 120, rounds: 18 },
  long: { id: 'long', label: 'Lang', fields: 150, rounds: 23 },
};

export const FIELD_TYPES = {
  start: { id: 'start', label: 'Start', icon: '🏁', color: '#E5E7EB' },
  normal: { id: 'normal', label: '', icon: '', color: null },
  rocket: { id: 'rocket', label: 'Rakete', icon: '🚀', color: '#22C55E', desc: '+3 Felder vor' },
  portal: { id: 'portal', label: 'Portal', icon: '🌀', color: '#8B5CF6', desc: 'Platz tauschen mit dem Führenden' },
  chaos: { id: 'chaos', label: 'Chaos', icon: '💥', color: '#F97316', desc: 'Challenge für alle – der Letzte geht 2 zurück' },
  stumble: { id: 'stumble', label: 'Stolperstein', icon: '🪨', color: '#78716C', desc: '1 Feld zurück oder einmal aussetzen' },
  goal: { id: 'goal', label: 'Zielfeld', icon: '🏆', color: '#EAB308' },
};

/** Themen-Welten für das 3D-Spielfeld (Farben, Hintergrund, Deko). */
export const BOARD_THEMES = {
  city: { id: 'city', label: 'Party-Stadt', icon: '🏙️' },
  jungle: { id: 'jungle', label: 'Dschungel-Pfad', icon: '🌴' },
  arcade: { id: 'arcade', label: 'Retro-Arcade', icon: '👾' },
};

/** Würfel-Arten: Platz 1–3 bekommen zusätzlich zum normalen Würfel einen Spezialwürfel. */
export const DICE_KINDS = {
  gold: { id: 'gold', faces: [4, 5, 6], color: '#FCD34D' },
  silver: { id: 'silver', faces: [2, 3, 4], color: '#CBD5E1' },
  bronze: { id: 'bronze', faces: [1, 2, 3], color: '#F0B27A' },
  normal: { id: 'normal', faces: [1, 2, 3, 4, 5, 6], color: '#FFFFFF' },
};

/**
 * Würfelwurf eines Spielers in einer Runde – deterministisch aus Runde, Spieler und Würfel-Nummer.
 * So zeigt das Handy beim Antippen sofort dieselbe Zahl, mit der der Host später zieht.
 */
export function diceFor(seed, uid, index = 0, faces = DICE_KINDS.normal.faces) {
  return makeRng(`dice:${seed}:${uid}:${index}`).pick(faces);
}

/** Alle Würfel eines Spielers mit Ergebnis: [{ kind, value }]. */
export function rollDiceFor(seed, uid, rank) {
  return moveRule(rank).dice.map((kind, i) => ({ kind, value: diceFor(seed, uid, i, DICE_KINDS[kind].faces) }));
}

/** Wer würfelt in dieser Runde? Jeder – außer wer aussetzen muss. */
export function rollersOf(round, players) {
  if (!round?.ranks) return [];
  return round.participants.filter((id) => {
    const p = players.find((x) => x.id === id);
    return p && !p.skipNext;
  });
}

export const ROCKET_STEPS = 3;
export const CHAOS_PENALTY = 2;
export const EVENT_PENALTY = 1; // zufällige Live-Events zwischen den Runden

/**
 * Würfel je Platzierung: Jeder würfelt mit einem normalen Würfel. Platz 1 bekommt
 * zusätzlich einen Gold-Würfel (4–6), Platz 2 einen Silber-Würfel (2–4), Platz 3 einen Bronze-Würfel (1–3).
 */
export function moveRule(rank) {
  if (rank === 1) return { dice: ['gold', 'normal'], label: '🥇 Gold-Würfel (4–6) + Würfel' };
  if (rank === 2) return { dice: ['silver', 'normal'], label: '🥈 Silber-Würfel (2–4) + Würfel' };
  if (rank === 3) return { dice: ['bronze', 'normal'], label: '🥉 Bronze-Würfel (1–3) + Würfel' };
  return { dice: ['normal'], label: '🎲 Würfel' };
}

/** Spielfeld mit zufällig verteilten Sonderfeldern (nicht direkt hintereinander). */
export function generateBoard(length, seed) {
  const rng = makeRng(`board:${seed}`);
  const fields = Array.from({ length }, () => 'normal');
  fields[0] = 'start';
  fields[length - 1] = 'goal';
  const counts = {
    rocket: Math.round(length * 0.1),
    chaos: Math.round(length * 0.1),
    stumble: Math.round(length * 0.1),
    portal: Math.max(1, Math.round(length * 0.05)),
  };
  const special = (t) => t !== 'normal' && t !== 'start' && t !== 'goal';
  // freie Felder ohne Sonderfeld-Nachbarn, nicht direkt an Start oder Ziel
  const free = () => {
    const options = [];
    for (let i = 2; i < length - 2; i++) {
      if (fields[i] === 'normal' && !special(fields[i - 1]) && !special(fields[i + 1])) options.push(i);
    }
    return options;
  };
  for (const [type, n] of Object.entries(counts)) {
    for (let k = 0; k < n; k++) {
      const options = free();
      if (!options.length) break;
      fields[rng.pick(options)] = type;
    }
  }
  return fields;
}

/** Phase für Stimmung & Farben: nach Fortschritt des Führenden. */
export function boardPhase(leaderPos, length) {
  const progress = leaderPos / (length - 1);
  if (progress >= 0.75) return 'suddenDeath'; // Endspurt
  if (progress >= 0.4) return 'chaos'; // Halbzeit-Chaos
  return 'warmup';
}

/**
 * Wendet eine Runde an: Bewegung nach Platzierung, dann Sonderfelder.
 * Reihenfolge: bester Platz zuerst (wichtig für Portal & Zieleinlauf).
 *
 * @param players [{ id, position, skipNext }]
 * @param ranks   { uid: rank }
 * @param fields  Spielfeld (Array von Feldtypen)
 * @param fixedRolls { uid: [Augen…] } – optional, für Tests
 * @returns { moves, positions, skipNext, winnerId, chaos, stats }
 */
export function applyRound({ players, ranks, fields, seed, fixedRolls = null }) {
  const rng = makeRng(`move:${seed}`);
  const goal = fields.length - 1;
  const positions = Object.fromEntries(players.map((p) => [p.id, p.position ?? 0]));
  const skipNext = Object.fromEntries(players.map((p) => [p.id, false]));
  const stats = {};
  const stat = (uid, key, n = 1) => { stats[uid] = { ...(stats[uid] || {}), [key]: (stats[uid]?.[key] ?? 0) + n }; };
  const moves = {};
  let winnerId = null;
  let chaos = false;

  const order = [...players].sort((a, b) => (ranks[a.id] ?? 99) - (ranks[b.id] ?? 99));
  for (const p of order) {
    const rank = ranks[p.id] ?? players.length;
    const from = positions[p.id];
    const m = { rank, from, roll: null, steps: 0, landed: from, to: from, field: null, effect: null, skipped: false };
    moves[p.id] = m;
    if (rank === 1) stat(p.id, 'firstPlaces');

    if (p.skipNext) {
      m.skipped = true;
      continue;
    }
    if (winnerId) continue; // Spiel ist schon entschieden

    // fixedRolls (nur für Tests): feste Augenzahlen statt Würfel
    m.dice = fixedRolls?.[p.id]
      ? fixedRolls[p.id].map((value) => ({ kind: 'normal', value }))
      : rollDiceFor(seed, p.id, rank);
    m.roll = m.dice.reduce((sum, d) => sum + d.value, 0);
    m.steps = m.roll;
    m.landed = Math.min(goal, from + m.steps);
    let to = m.landed;
    const field = fields[to];
    m.field = field;

    // Sonderfelder wirken nur, wenn man in dieser Runde darauf gezogen ist
    if (to !== goal && m.steps > 0) {
      if (field === 'rocket') {
        to = Math.min(goal, to + ROCKET_STEPS);
        m.effect = { type: 'rocket', delta: to - m.landed };
        stat(p.id, 'rockets');
      } else if (field === 'portal') {
        const leader = players.filter((o) => o.id !== p.id).sort((x, y) => positions[y.id] - positions[x.id])[0];
        if (leader && positions[leader.id] > to) {
          const leaderPos = positions[leader.id];
          positions[leader.id] = to;
          if (moves[leader.id]) moves[leader.id].to = to; // Führender hat diese Runde schon gezogen
          m.effect = { type: 'portal', with: leader.id, delta: leaderPos - to };
          stat(leader.id, 'fieldsLost', leaderPos - to);
          stat(p.id, 'portals');
          to = leaderPos;
        } else {
          m.effect = { type: 'portal', with: null, delta: 0 };
        }
      } else if (field === 'stumble') {
        if (rng.next() < 0.5) {
          to = Math.max(0, to - 1);
          m.effect = { type: 'stumble', kind: 'back', delta: -1 };
          stat(p.id, 'fieldsLost', 1);
        } else {
          skipNext[p.id] = true;
          m.effect = { type: 'stumble', kind: 'skip', delta: 0 };
        }
        stat(p.id, 'stumbles');
      } else if (field === 'chaos') {
        chaos = true;
        m.effect = { type: 'chaos', delta: 0 };
      }
    }

    positions[p.id] = to;
    m.to = to;
    stat(p.id, 'fieldsMoved', Math.max(0, to - from));
    if (to - from > 0) stats[p.id].biggestMove = to - from;
    if (to >= goal && !winnerId) winnerId = p.id;
  }

  return { moves, positions, skipNext, winnerId, chaos, stats };
}

/** Rückwärts (Live-Events, Chaos): nie hinter den Start. */
export function stepBack(position, n) {
  return Math.max(0, (position ?? 0) - n);
}

/** Phasen-Texte im Spielfeld-Modus (gleiche Farben/Effekte wie im Party-Modus). */
export const BOARD_PHASES = {
  warmup: { label: 'Aufwärmen', title: 'LOS!', tagline: 'Auf die Plätze …' },
  chaos: { label: 'Halbzeit-Chaos', title: 'HALBZEIT!', tagline: 'Die Hälfte ist geschafft – jetzt wird es eng!' },
  suddenDeath: { label: 'Endspurt', title: 'ENDSPURT!', tagline: 'Das Ziel ist in Sichtweite!' },
};
