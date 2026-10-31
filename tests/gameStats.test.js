import { describe, it, expect } from 'vitest';
import { GAMES, pickGame, planDuel, leastPlayed } from '../src/game/gameLibrary.js';

describe('Wochen-Statistik', () => {
  it('Tagesschlüssel & Summe über 7 Tage', async () => {
    const { lastDays, sumCounts, dayKey } = await import('../src/game/gameStats.js');
    const days = lastDays(7, new Date('2026-10-31T12:00:00Z'));
    expect(days).toEqual(['2026-10-31', '2026-10-30', '2026-10-29', '2026-10-28', '2026-10-27', '2026-10-26', '2026-10-25']);
    expect(dayKey(new Date('2026-01-02T23:59:00Z'))).toBe('2026-01-02');
    expect(sumCounts([{ counts: { a: 2, b: 1 } }, null, { counts: { a: 3 } }])).toEqual({ a: 5, b: 1 });
  });

  it('wählt immer eines der am wenigsten gespielten Spiele', () => {
    const cands = ['stopwatch', 'mathBlitz', 'f1Start', 'rps'].map((id) => GAMES[id]);
    const counts = { stopwatch: 9, mathBlitz: 2, f1Start: 2, rps: 5 };
    expect(leastPlayed(cands, counts).map((g) => g.id)).toEqual(['mathBlitz', 'f1Start']);
    for (let i = 0; i < 50; i++) expect(['mathBlitz', 'f1Start']).toContain(pickGame(cands, null, `s${i}`, counts).id);
    // nie gespielt (0) schlägt alles
    expect(pickGame(cands, null, 'x', { stopwatch: 1, mathBlitz: 1, f1Start: 1 }).id).toBe('rps');
    // ohne Statistik: alle Kandidaten möglich
    expect(leastPlayed(cands, null)).toHaveLength(4);
  });

  it('Duell-Planung nutzt die Statistik', () => {
    const players = [{ id: 'a', caps: {} }, { id: 'b', caps: {} }];
    const lib = ['stopwatch', 'mathBlitz', 'f1Start'];
    const plan = planDuel({ orderedPlayers: players, libraryIds: lib, seed: 'z', counts: { stopwatch: 4, mathBlitz: 0, f1Start: 3 } });
    expect(plan.game.id).toBe('mathBlitz');
  });
});
