import { describe, it, expect } from 'vitest';
import {
  GAMES, CATEGORIES, EMOJI_PUZZLES, emojiAnswerCorrect, rhythmError, playableFor, filterLibrary,
} from '../src/game/gameLibrary.js';
import { makeRng } from '../src/lib/random.js';

const duel = (gameId, results, extra = {}) => ({ gameId, playerA: 'a', playerB: 'b', results, ...extra });

describe('Neue Spiele 6–13', () => {
  it('alle Spiele haben eine bekannte Kategorie und erzeugen einen Zustand', () => {
    for (const g of Object.values(GAMES)) {
      expect(CATEGORIES[g.kind], g.id).toBeTruthy();
      expect(() => g.createState(makeRng('x'), { phase: 'warmup' })).not.toThrow();
    }
    expect(Object.keys(GAMES)).toHaveLength(35);
  });

  it('Schüttel-Manie: mehr Schüttler gewinnt, Sabotage −15 %', () => {
    expect(GAMES.shake.decide(duel('shake', { a: { shakes: 30 }, b: { shakes: 28 } }))).toBe('a');
    expect(GAMES.shake.decide(duel('shake', { a: { shakes: 30 }, b: { shakes: 28 } }, { sabotage: { target: 'a' } }))).toBe('b');
  });

  it('Kompass-Axt: schneller gewinnt, nicht geschafft verliert', () => {
    expect(GAMES.compass.decide(duel('compass', { a: { ms: 4000 }, b: { ms: null } }))).toBe('a');
    expect(GAMES.compass.decide(duel('compass', { a: { ms: 4000 }, b: { ms: 3000 } }))).toBe('b');
  });

  it('Emoji-Raten: Antworterkennung mit Umlauten und Tippfreiheit', () => {
    const lion = EMOJI_PUZZLES.find((p) => p.emojis === '🦁👑');
    expect(emojiAnswerCorrect(lion, 'Der König der Löwen')).toBe(true);
    expect(emojiAnswerCorrect(lion, 'koenig der loewen!')).toBe(true);
    expect(emojiAnswerCorrect(lion, 'Tiger')).toBe(false);
    expect(GAMES.emojiQuiz.decide(duel('emojiQuiz', { a: { correct: false }, b: { correct: true, ms: 9000 } }))).toBe('b');
  });

  it('Starr-Duell: länger durchgehalten gewinnt', () => {
    expect(GAMES.stareDown.decide(duel('stareDown', { a: { survivedMs: 5000 }, b: { survivedMs: 12000 } }))).toBe('b');
  });

  it('Rhythmus-Echo: Fehlerberechnung und Auswertung', () => {
    expect(rhythmError([500, 250], [0, 500, 750])).toBe(0);
    expect(rhythmError([500, 250], [0, 600, 750])).toBe(100); // (|600−500| + |150−250|) / 2
    expect(rhythmError([500, 500], [0, 500])).toBe(250); // fehlender Tap zählt voll
    expect(GAMES.rhythm.decide(duel('rhythm', { a: { errorMs: 40 }, b: { errorMs: 90 } }))).toBe('a');
  });

  it('Wahrheit oder Bluff: B gewinnt nur bei richtigem Tipp', () => {
    expect(GAMES.truthBluff.decide(duel('truthBluff', { a: { claim: 'x', truth: true }, b: { guess: true } }))).toBe('b');
    expect(GAMES.truthBluff.decide(duel('truthBluff', { a: { claim: 'x', truth: false }, b: { guess: true } }))).toBe('a');
    expect(GAMES.truthBluff.decide(duel('truthBluff', { a: { claim: 'x', truth: false } }))).toBeUndefined();
  });

  it('Kamera- und Kompass-Spiele nur, wenn beide Geräte es können', () => {
    const lib = filterLibrary({ playerCount: 4, equipment: [] });
    const ids = playableFor(lib, [{ caps: { motion: true, compass: true, camera: false } }, { caps: { motion: true, compass: true, camera: true } }]).map((g) => g.id);
    expect(ids).toContain('compass');
    expect(ids).not.toContain('stareDown');
  });

  it('Utensilien-Spiele nur mit passendem Equipment', () => {
    const ids = filterLibrary({ playerCount: 2, equipment: ['coins'] }).map((g) => g.id);
    expect(ids).toContain('coinSprint');
    expect(ids).not.toContain('bluffCard');
  });
});

import { planDuel } from '../src/game/gameLibrary.js';

describe('planDuel – jedes Spiel nur einmal pro Party', () => {
  const p = (id, caps = {}) => ({ id, caps });

  it('wählt nie ein schon gespieltes Spiel', () => {
    const libraryIds = ['memoryCode', 'emojiQuiz', 'rhythm'];
    const seen = new Set();
    let played = [];
    for (let i = 0; i < 3; i++) {
      const plan = planDuel({ orderedPlayers: [p('a'), p('b')], libraryIds, playedIds: played, seed: `s${i}` });
      expect(seen.has(plan.game.id)).toBe(false);
      seen.add(plan.game.id);
      played = [...played, plan.game.id];
    }
    expect(planDuel({ orderedPlayers: [p('a'), p('b')], libraryIds, playedIds: played, seed: 'x' })).toBeNull();
  });

  it('weicht auf ein anderes Paar aus, wenn nur noch Sensor-Spiele übrig sind', () => {
    const plan = planDuel({
      orderedPlayers: [p('a'), p('b', { motion: true }), p('c', { motion: true })],
      libraryIds: ['memoryCode', 'shake'],
      playedIds: ['memoryCode'],
      seed: 'y',
    });
    expect(plan.game.id).toBe('shake');
    expect(plan.duelists.map((d) => d.id)).toEqual(['b', 'c']);
  });

  it('bevorzugt die ersten Spieler der Wunschreihenfolge', () => {
    const plan = planDuel({ orderedPlayers: [p('x'), p('y'), p('z')], libraryIds: ['memoryCode'], playedIds: [], seed: 'z' });
    expect(plan.duelists.map((d) => d.id)).toEqual(['x', 'y']);
  });
});
