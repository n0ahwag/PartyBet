import { describe, it, expect } from 'vitest';
import { lockDuel, settleDuel, applyRepayments, minStakeFor } from '../src/game/economy.js';
import { phaseForRound } from '../src/game/constants.js';

const base = { playerA: 'a', playerB: 'b', phase: 'warmup' };

describe('lockDuel', () => {
  it('bucht Pflicht-Einsatz der Duellanten ab', () => {
    const r = lockDuel({ ...base, bets: {} }, { a: 20, b: 1 });
    expect(r.stakes).toEqual({ a: 2, b: 1 });
    expect(r.debits).toEqual({ a: 2, b: 1 });
  });

  it('verdoppelt in der Chaos-Runde Mindest- und Wetteinsätze', () => {
    expect(minStakeFor('chaos')).toBe(4);
    const r = lockDuel({ ...base, phase: 'chaos', bets: { c: { on: 'a', amount: 3 } } }, { a: 20, b: 20, c: 20 });
    expect(r.stakes.a).toBe(4);
    expect(r.bets.c.amount).toBe(6);
  });

  it('kappt Wetten auf das Guthaben und ignoriert Duellanten-Wetten', () => {
    const r = lockDuel({ ...base, bets: { a: { on: 'a', amount: 5 }, c: { on: 'b', amount: 9 } } }, { a: 20, b: 20, c: 4 });
    expect(r.bets).toEqual({ c: { on: 'b', amount: 4 } });
  });

  it('gibt dem Außenseiter Quote 3', () => {
    const r = lockDuel({ ...base, bets: { c: { on: 'a', amount: 5 }, d: { on: 'b', amount: 1 } } }, { a: 20, b: 20, c: 20, d: 20 });
    expect(r.odds).toEqual({ a: 2, b: 3 });
  });
});

describe('settleDuel', () => {
  const locked = {
    ...base,
    stakes: { a: 2, b: 2 },
    bets: { c: { on: 'a', amount: 4 }, d: { on: 'b', amount: 2 } },
    odds: { a: 2, b: 3 },
    activePowerups: {},
  };
  const balances = { a: 18, b: 18, c: 16, d: 18 };

  it('zahlt Gewinner doppelt bzw. dreifach aus', () => {
    const r = settleDuel(locked, 'b', balances);
    expect(r.net).toEqual({ a: -2, b: 2, c: -4, d: 4 });
    expect(r.credits).toEqual({ a: 0, b: 4, c: 0, d: 6 });
  });

  it('Schild erstattet den Einsatz', () => {
    const r = settleDuel({ ...locked, activePowerups: { a: { type: 'shield' } } }, 'b', balances);
    expect(r.net.a).toBe(0);
    expect(r.outcome.a).toBe('shielded');
  });

  it('Double-Down verdoppelt Gewinn und Verlust', () => {
    const r = settleDuel({ ...locked, activePowerups: { b: { type: 'doubleDown' }, c: { type: 'doubleDown' } } }, 'b', balances);
    expect(r.net.b).toBe(4);
    expect(r.net.c).toBe(-8);
  });

  it('Unentschieden gibt alle Einsätze zurück', () => {
    const r = settleDuel(locked, null, balances);
    expect(Object.values(r.net).every((n) => n === 0)).toBe(true);
    expect(r.credits.c).toBe(4);
  });

  it('tilgt Schulden automatisch aus Gewinnen', () => {
    const r = settleDuel(locked, 'b', balances, { d: [{ to: 'c', amount: 3 }] });
    expect(r.repayments).toEqual([{ from: 'd', to: 'c', amount: 3 }]);
    expect(r.credits.d).toBe(3);
    expect(r.credits.c).toBe(3);
    expect(applyRepayments([{ to: 'c', amount: 3 }], r.repayments, 'd')).toEqual([]);
  });
});

describe('phaseForRound', () => {
  it('teilt Warm-up, Chaos und Sudden Death auf', () => {
    const phases = Array.from({ length: 8 }, (_, i) => phaseForRound(i + 1, 8));
    expect(phases).toEqual(['warmup', 'warmup', 'warmup', 'warmup', 'chaos', 'chaos', 'chaos', 'suddenDeath']);
  });
});
