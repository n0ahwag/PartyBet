import { describe, it, expect } from 'vitest';
import {
  GAMES, makeMathTask, categoryWordValid, associationValid, secretTargetOf, buildBracket, ranksFromBracket,
  resultComplete, rankGroupRound, filterLibrary, CHAIN_CATEGORIES,
} from '../src/game/gameLibrary.js';
import { makeRng } from '../src/lib/random.js';

const NEW = ['stopwatch', 'mathBlitz', 'wordChain', 'f1Start', 'secretNumber', 'association', 'categorySprint', 'numberMemory', 'rps'];
const duel = (gameId, results, extra = {}) => ({ gameId, playerA: 'a', playerB: 'b', results, ...extra });

describe('Überall spielbar', () => {
  it('alle 9 Spiele brauchen keine Utensilien/Sensoren und sind mit 2 Spielern dabei', () => {
    const lib = filterLibrary({ playerCount: 2, equipment: [] }).map((g) => g.id);
    for (const id of NEW) {
      expect(lib).toContain(id);
      expect(GAMES[id].kind).toBe('anywhere');
      expect(GAMES[id].needsMotion || GAMES[id].needsCamera || GAMES[id].needsCompass).toBeFalsy();
    }
  });

  it('Mentale Stoppuhr: näher an der Zielzeit gewinnt (egal ob zu früh oder zu spät)', () => {
    expect(GAMES.stopwatch.decide(duel('stopwatch', { a: { ms: 4400, target: 4250 }, b: { ms: 4200, target: 4250 } }))).toBe('b');
  });

  it('Blitz-Kopfrechnen: gleiche Aufgabe aus gleichem Seed, Fehlversuche kosten 1 s', () => {
    expect(makeMathTask(makeRng('x'), 'chaos')).toEqual(makeMathTask(makeRng('x'), 'chaos'));
    const t = makeMathTask(makeRng('y'), 'suddenDeath');
    expect(Number.isInteger(t.answer)).toBe(true);
    expect(GAMES.mathBlitz.decide(duel('mathBlitz', { a: { correct: true, ms: 3000, wrong: 2 }, b: { correct: true, ms: 4500, wrong: 0 } }))).toBe('b');
  });

  it('F1-Frühstart: Frühstarter verliert immer', () => {
    expect(GAMES.f1Start.decide(duel('f1Start', { a: { jumpStart: true, ms: null }, b: { ms: 900 } }))).toBe('b');
    expect(GAMES.f1Start.decide(duel('f1Start', { a: { ms: 240 }, b: { ms: 310 } }))).toBe('a');
  });

  it('Geheime Zahlen: erst fertig, wenn geknackt; Ziel ist Gegner bzw. Nachbar im Kreis', () => {
    expect(resultComplete('secretNumber', { secret: 42 })).toBe(false);
    expect(resultComplete('secretNumber', { secret: 42, done: true, ms: 9000 })).toBe(true);
    expect(GAMES.secretNumber.decide(duel('secretNumber', { a: { secret: 42 }, b: { secret: 17, done: true, ms: 5000 } }))).toBeUndefined();
    expect(GAMES.secretNumber.decide(duel('secretNumber', { a: { secret: 42, done: true, ms: 8000 }, b: { secret: 17, done: true, ms: 5000 } }))).toBe('b');
    expect(secretTargetOf({ playerA: 'a', playerB: 'b' }, 'a')).toBe('b');
    expect(secretTargetOf({ participants: ['a', 'b', 'c'] }, 'c')).toBe('a');
  });

  it('Kategorie-Sprint & Assoziation: Gültigkeit', () => {
    expect(categoryWordValid('Ölbaum', 'Ö', 'Pflanze')).toBe(true);
    expect(categoryWordValid('Tiger', 'L', 'Tier')).toBe(false);
    expect(categoryWordValid('Ab', 'A', 'Tier')).toBe(false);
    expect(associationValid('Sonne', 'Sommer')).toBe(true);
    expect(associationValid('sommer', 'Sommer')).toBe(false);
  });

  it('Zahlen-Merker: mehr Ziffern schlagen schnellere Zeit', () => {
    const r = rankGroupRound({ gameId: 'numberMemory', results: { a: { digits: 7, ms: 30000 }, b: { digits: 6, ms: 9000 }, c: { digits: 7, ms: 20000 } } }, ['a', 'b', 'c']);
    expect(r).toEqual({ c: 1, a: 2, b: 3 });
  });

  it('Schere-Stein-Papier: Turnier mit Freilos und Platzierung', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    let b = buildBracket(ids, 'seed');
    const winners = {};
    // immer den ersten Spieler eines Matches gewinnen lassen, bis ein Champion feststeht
    for (let i = 0; i < 10 && !b.champion; i++) {
      for (const m of b.rounds.flat()) if (!m.winner) winners[m.key] = m.a;
      b = buildBracket(ids, 'seed', winners);
    }
    expect(b.champion).toBeTruthy();
    const ranks = ranksFromBracket(ids, b);
    expect(ranks[b.champion]).toBe(1);
    expect(Object.values(ranks).filter((r) => r === 2)).toHaveLength(1);
    expect(Math.max(...Object.values(ranks))).toBeLessThanOrEqual(5);
    // gleicher Seed → gleiche Paarungen auf allen Geräten
    expect(buildBracket(ids, 'seed').rounds[0]).toEqual(buildBracket(ids, 'seed').rounds[0]);
  });
});

describe('Wortkette', () => {
  it('hat immer eine Kategorie, und das Startwort gehört dazu', () => {
    for (let i = 0; i < 40; i++) {
      const s = GAMES.wordChain.createState(makeRng(`chain${i}`), { phase: 'warmup' });
      const cat = CHAIN_CATEGORIES.find((c) => c.category === s.category);
      expect(cat).toBeTruthy();
      expect(cat.words).toContain(s.startWord);
    }
  });
});
