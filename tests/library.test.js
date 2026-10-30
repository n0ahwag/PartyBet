import { describe, it, expect } from 'vitest';
import { filterLibrary, playableFor, GAMES } from '../src/game/gameLibrary.js';
import { makeRng } from '../src/lib/random.js';
import { buildWrapped } from '../src/game/wrapped.js';

const ids = (list) => list.map((g) => g.id).sort();

describe('filterLibrary', () => {
  it('2 Spieler ohne Utensilien: keine 3-Spieler-Spiele', () => {
    expect(ids(filterLibrary({ playerCount: 2, equipment: [] }))).toEqual(['balance', 'memoryCode', 'speedTap']);
  });

  it('Utensilien schalten Bonus-Spiele frei', () => {
    const lib = ids(filterLibrary({ playerCount: 4, equipment: ['cards', 'cups'] }));
    expect(lib).toContain('highCard');
    expect(lib).toContain('cupFlip');
    expect(lib).not.toContain('diceDuel');
  });

  it('Handy-Balance nur, wenn beide ein Gyroskop haben', () => {
    const lib = filterLibrary({ playerCount: 4, equipment: [] });
    const without = playableFor(lib, [{ caps: { motion: true } }, { caps: {} }]);
    expect(ids(without)).not.toContain('balance');
  });
});

describe('Auto-Auswertung', () => {
  it('Memory-Code: richtig schlägt schnell', () => {
    const duel = { playerA: 'a', playerB: 'b', game: { code: '12345' }, results: { a: { input: '12345', ms: 4000 }, b: { input: '12344', ms: 900 } } };
    expect(GAMES.memoryCode.decide(duel)).toBe('a');
  });

  it('Schätz-Duell: näher dran gewinnt, unvollständig = undefined', () => {
    const duel = { playerA: 'a', playerB: 'b', game: { a: 100 }, results: { a: { guess: 80 }, b: { guess: 130 } } };
    expect(GAMES.estimate.decide(duel)).toBe('a');
    expect(GAMES.estimate.decide({ ...duel, results: { a: { guess: 1 } } })).toBeUndefined();
  });

  it('Speed-Tap: Best of 5', () => {
    const rounds = ['A', 'B', 'B', 'A', 'B'].map((winner) => ({ winner }));
    expect(GAMES.speedTap.decide({ playerA: 'a', playerB: 'b', results: { shared: { rounds } } })).toBe('b');
  });

  it('Seeds erzeugen identischen Spielzustand auf allen Geräten', () => {
    expect(GAMES.memoryCode.createState(makeRng('X:1'), { phase: 'warmup' }))
      .toEqual(GAMES.memoryCode.createState(makeRng('X:1'), { phase: 'warmup' }));
  });
});

describe('buildWrapped', () => {
  it('vergibt Wett-König, Pechvogel und Saboteur', () => {
    const players = [
      { id: 'a', name: 'Ana', balance: 30, stats: { betProfit: 9, betsWon: 3, sipsDrunk: 2, sabotages: 0 } },
      { id: 'b', name: 'Ben', balance: 5, stats: { betProfit: -4, sipsDrunk: 15, sabotages: 2 } },
    ];
    const cards = buildWrapped(players, [{ type: 'duel', gameId: 'estimate' }]);
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
    expect(byId.betKing.player.name).toBe('Ana');
    expect(byId.unlucky.player.name).toBe('Ben');
    expect(byId.saboteur.player.name).toBe('Ben');
    expect(byId.finale.player.name).toBe('Ana');
    expect(cards.at(-1).ranking[0].name).toBe('Ana');
  });
});
