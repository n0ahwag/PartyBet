import { makeRng } from '../../lib/random.js';
import { finishByScore, earliest, msOf } from './common.js';

/*
 * Die Live-Quiz-Show: Spielbrett mit 3 Kategorien × 3 Werten (100/200/300).
 * Ablauf: board (wer zuletzt richtig lag, wählt ein Feld) → question (Buzzer offen)
 *         → answer (wer zuerst gebuzzert hat, antwortet am Handy) → reveal → board …
 * Eingaben am Handy: results.{uid}.pick {n, cell} · .buzz {k, at: Serverzeit} · .ans {k, i}
 */

export const QUIZ = { readMs: 2500, buzzMs: 12000, answerMs: 8000, revealMs: 3500, pickMs: 9000, autoPickMs: 2500, graceMs: 350 };

/** Fragen: a = Index der richtigen Antwort. */
export const QUIZ_CATEGORIES = [
  {
    name: { de: 'Geografie', en: 'Geography' }, icon: '🌍',
    qs: [
      { q: { de: 'Was ist die Hauptstadt von Australien?', en: 'What is the capital of Australia?' }, o: [{ de: 'Sydney', en: 'Sydney' }, { de: 'Canberra', en: 'Canberra' }, { de: 'Melbourne', en: 'Melbourne' }, { de: 'Perth', en: 'Perth' }], a: 1 },
      { q: { de: 'Welcher ist der längste Fluss Europas?', en: 'Which is the longest river in Europe?' }, o: [{ de: 'Donau', en: 'Danube' }, { de: 'Rhein', en: 'Rhine' }, { de: 'Wolga', en: 'Volga' }, { de: 'Dnepr', en: 'Dnieper' }], a: 2 },
      { q: { de: 'An wie viele Länder grenzt Deutschland?', en: 'How many countries border Germany?' }, o: [{ de: '7', en: '7' }, { de: '8', en: '8' }, { de: '9', en: '9' }, { de: '10', en: '10' }], a: 2 },
    ],
  },
  {
    name: { de: 'Tierwelt', en: 'Animals' }, icon: '🦁',
    qs: [
      { q: { de: 'Wie viele Beine hat eine Spinne?', en: 'How many legs does a spider have?' }, o: [{ de: '6', en: '6' }, { de: '8', en: '8' }, { de: '10', en: '10' }, { de: '12', en: '12' }], a: 1 },
      { q: { de: 'Welches ist das größte Tier der Welt?', en: 'What is the largest animal in the world?' }, o: [{ de: 'Afrikanischer Elefant', en: 'African elephant' }, { de: 'Blauwal', en: 'Blue whale' }, { de: 'Pottwal', en: 'Sperm whale' }, { de: 'Walhai', en: 'Whale shark' }], a: 1 },
      { q: { de: 'Welches Säugetier kann wirklich fliegen?', en: 'Which mammal can truly fly?' }, o: [{ de: 'Flughörnchen', en: 'Flying squirrel' }, { de: 'Fledermaus', en: 'Bat' }, { de: 'Gleithörnchen', en: 'Sugar glider' }, { de: 'Kolibri', en: 'Hummingbird' }], a: 1 },
    ],
  },
  {
    name: { de: 'Film & Musik', en: 'Film & Music' }, icon: '🎬',
    qs: [
      { q: { de: 'Wie heißt der Schneemann in „Die Eiskönigin“?', en: 'What is the snowman called in “Frozen”?' }, o: [{ de: 'Olaf', en: 'Olaf' }, { de: 'Sven', en: 'Sven' }, { de: 'Kristoff', en: 'Kristoff' }, { de: 'Hans', en: 'Hans' }], a: 0 },
      { q: { de: 'Aus welchem Land stammt die Band ABBA?', en: 'Which country is the band ABBA from?' }, o: [{ de: 'Norwegen', en: 'Norway' }, { de: 'Schweden', en: 'Sweden' }, { de: 'Dänemark', en: 'Denmark' }, { de: 'Finnland', en: 'Finland' }], a: 1 },
      { q: { de: 'Wie viele Saiten hat eine klassische Gitarre?', en: 'How many strings does a classical guitar have?' }, o: [{ de: '4', en: '4' }, { de: '5', en: '5' }, { de: '6', en: '6' }, { de: '8', en: '8' }], a: 2 },
    ],
  },
  {
    name: { de: 'Wissenschaft', en: 'Science' }, icon: '🔬',
    qs: [
      { q: { de: 'Welcher Planet ist der Sonne am nächsten?', en: 'Which planet is closest to the sun?' }, o: [{ de: 'Venus', en: 'Venus' }, { de: 'Merkur', en: 'Mercury' }, { de: 'Mars', en: 'Mars' }, { de: 'Erde', en: 'Earth' }], a: 1 },
      { q: { de: 'Was ist das chemische Symbol für Gold?', en: 'What is the chemical symbol for gold?' }, o: [{ de: 'Go', en: 'Go' }, { de: 'Gd', en: 'Gd' }, { de: 'Au', en: 'Au' }, { de: 'Ag', en: 'Ag' }], a: 2 },
      { q: { de: 'Wie viele Knochen hat ein erwachsener Mensch?', en: 'How many bones does an adult human have?' }, o: [{ de: '106', en: '106' }, { de: '156', en: '156' }, { de: '206', en: '206' }, { de: '306', en: '306' }], a: 2 },
    ],
  },
  {
    name: { de: 'Essen & Trinken', en: 'Food & Drink' }, icon: '🍕',
    qs: [
      { q: { de: 'Aus welchem Land stammt die Pizza Margherita?', en: 'Which country does pizza Margherita come from?' }, o: [{ de: 'Spanien', en: 'Spain' }, { de: 'Griechenland', en: 'Greece' }, { de: 'Italien', en: 'Italy' }, { de: 'Frankreich', en: 'France' }], a: 2 },
      { q: { de: 'Welche Frucht wächst an einer Palme und hat eine harte Schale?', en: 'Which fruit grows on a palm and has a hard shell?' }, o: [{ de: 'Mango', en: 'Mango' }, { de: 'Kokosnuss', en: 'Coconut' }, { de: 'Papaya', en: 'Papaya' }, { de: 'Ananas', en: 'Pineapple' }], a: 1 },
      { q: { de: 'Welches Gewürz wird aus den Blütennarben eines Krokus gewonnen?', en: 'Which spice comes from the stigmas of a crocus flower?' }, o: [{ de: 'Kurkuma', en: 'Turmeric' }, { de: 'Zimt', en: 'Cinnamon' }, { de: 'Paprika', en: 'Paprika' }, { de: 'Safran', en: 'Saffron' }], a: 3 },
    ],
  },
  {
    name: { de: 'Sport', en: 'Sports' }, icon: '⚽',
    qs: [
      { q: { de: 'Wie viele Spieler einer Fußballmannschaft stehen auf dem Feld?', en: 'How many players of a football team are on the pitch?' }, o: [{ de: '9', en: '9' }, { de: '10', en: '10' }, { de: '11', en: '11' }, { de: '12', en: '12' }], a: 2 },
      { q: { de: 'In welcher Sportart gibt es den „Slam Dunk“?', en: 'In which sport is there a “slam dunk”?' }, o: [{ de: 'Volleyball', en: 'Volleyball' }, { de: 'Basketball', en: 'Basketball' }, { de: 'Handball', en: 'Handball' }, { de: 'Tennis', en: 'Tennis' }], a: 1 },
      { q: { de: 'Wie lang ist ein Marathon?', en: 'How long is a marathon?' }, o: [{ de: '38,6 km', en: '38.6 km' }, { de: '40 km', en: '40 km' }, { de: '42,195 km', en: '42.195 km' }, { de: '45 km', en: '45 km' }], a: 2 },
    ],
  },
];

export const quizCreateState = (rng) => ({ seed: rng.int(1, 999999), cats: rng.shuffle(QUIZ_CATEGORIES.map((_, i) => i)).slice(0, 3) });

/** Feld des Spielbretts: cell = Kategorie-Spalte * 3 + Wert-Zeile. */
export const quizCell = (game, cell) => {
  const cat = QUIZ_CATEGORIES[game.cats[Math.floor(cell / 3)]];
  const row = cell % 3;
  return { cat, row, value: (row + 1) * 100, question: cat.qs[row] };
};

const nextAutoCell = (sim, seed) => {
  const open = Array.from({ length: 9 }, (_, i) => i).filter((i) => !sim.used.includes(i));
  // kleinster Wert zuerst, sonst zufällig
  const minRow = Math.min(...open.map((i) => i % 3));
  return makeRng(`quiz:${seed}:${sim.used.length}`).pick(open.filter((i) => i % 3 === minRow));
};

export const quizDirector = {
  start(round, now) {
    return { phase: 'board', used: [], scores: {}, chooser: null, pickN: 0, until: now + QUIZ.autoPickMs, k: 0, cell: null, locked: [], buzzer: null, firstAt: null, last: null };
  },
  tick(sim, round, now) {
    const s = sim;
    if (s.phase === 'board') {
      const pick = s.chooser ? round.results?.[s.chooser]?.pick : null;
      const chosen = pick && pick.n === s.pickN && !s.used.includes(pick.cell) && pick.cell >= 0 && pick.cell < 9 ? pick.cell : null;
      if (chosen == null && now < s.until) return { sim: s };
      const cell = chosen ?? nextAutoCell(s, round.game.seed);
      return { sim: { ...s, phase: 'question', cell, used: [...s.used, cell], k: s.k + 1, locked: [], buzzer: null, firstAt: null, openAt: now + QUIZ.readMs, until: now + QUIZ.readMs + QUIZ.buzzMs } };
    }
    if (s.phase === 'question') {
      const can = round.participants.filter((id) => !s.locked.includes(id));
      const first = earliest(round, can, (r) => (r?.buzz?.k === s.k ? r.buzz.at : null));
      if (first) {
        if (s.firstAt == null) return { sim: { ...s, firstAt: now } };
        if (now - s.firstAt < QUIZ.graceMs) return { sim: s }; // kurz warten, falls ein früherer Buzz noch unterwegs ist
        return { sim: { ...s, phase: 'answer', buzzer: first.id, firstAt: null, until: now + QUIZ.answerMs } };
      }
      if (now >= s.until) return { sim: { ...s, phase: 'reveal', last: { by: null, ok: null }, until: now + QUIZ.revealMs } };
      return { sim: s };
    }
    if (s.phase === 'answer') {
      const ans = round.results?.[s.buzzer]?.ans;
      const given = ans?.k === s.k ? ans.i : null;
      if (given == null && now < s.until) return { sim: s };
      const { value, question } = quizCell(round.game, s.cell);
      const ok = given === question.a;
      const scores = { ...s.scores, [s.buzzer]: (s.scores[s.buzzer] ?? 0) + (ok ? value : -value / 2) };
      if (ok) return { sim: { ...s, scores, phase: 'reveal', chooser: s.buzzer, last: { by: s.buzzer, ok: true, i: given }, until: now + QUIZ.revealMs } };
      const locked = [...s.locked, s.buzzer];
      const last = { by: s.buzzer, ok: false, i: given };
      if (locked.length >= round.participants.length) return { sim: { ...s, scores, locked, phase: 'reveal', last, until: now + QUIZ.revealMs } };
      // falsch: die anderen dürfen nochmal buzzern
      return { sim: { ...s, scores, locked, last, phase: 'question', buzzer: null, firstAt: null, openAt: now + 1200, until: now + 1200 + QUIZ.buzzMs * 0.7 } };
    }
    if (s.phase === 'reveal') {
      if (now < s.until) return { sim: s };
      if (s.used.length >= 9) return { sim: { ...s, phase: 'done' }, done: quizResult(round, s) };
      return { sim: { ...s, phase: 'board', pickN: s.pickN + 1, cell: null, last: null, until: now + (s.chooser ? QUIZ.pickMs : QUIZ.autoPickMs) } };
    }
    return { sim: s };
  },
};

export const quizResult = (round, sim) => finishByScore(round, (id) => sim.scores?.[id] ?? 0, { extra: { scores: sim.scores } });

/** Darf ich gerade buzzern? (Handy) */
export const canBuzz = (sim, uid, now) => sim?.phase === 'question' && !sim.locked?.includes(uid) && now >= (sim.openAt ?? 0);

export { msOf };
