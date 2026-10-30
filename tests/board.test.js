import { describe, it, expect } from 'vitest';
import { generateBoard, moveRule, applyRound, boardPhase, stepBack } from '../src/game/board.js';
import { rankFromScores, rankGroupRound, groupPlayable, GAMES } from '../src/game/gameLibrary.js';

const F = (s) => s.split('').map((c) => ({ S: 'start', G: 'goal', '.': 'normal', R: 'rocket', P: 'portal', C: 'chaos', X: 'stumble' })[c]);

describe('Spielfeld', () => {
  it('Start/Ziel an den Enden, Sonderfelder nie direkt nebeneinander', () => {
    for (const len of [20, 30, 40]) {
      const f = generateBoard(len, `seed${len}`);
      expect(f).toHaveLength(len);
      expect(f[0]).toBe('start');
      expect(f.at(-1)).toBe('goal');
      for (let i = 1; i < len - 1; i++) {
        if (f[i] !== 'normal') expect(f[i + 1] === 'normal' || f[i + 1] === 'goal').toBe(true);
      }
      expect(f.filter((t) => t === 'portal').length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Platzierung → Zug', () => {
    expect(moveRule(1, 4)).toMatchObject({ dice: true, bonus: 2 });
    expect(moveRule(2, 4)).toMatchObject({ dice: true, bonus: 0 });
    expect(moveRule(2, 2)).toMatchObject({ dice: false, bonus: 1 });
    expect(moveRule(3, 4)).toMatchObject({ dice: false, bonus: 1 });
    expect(moveRule(4, 4)).toMatchObject({ dice: false, bonus: 0 });
  });

  it('Phasen nach Fortschritt des Führenden', () => {
    expect(boardPhase(5, 30)).toBe('warmup');
    expect(boardPhase(14, 30)).toBe('chaos');
    expect(boardPhase(23, 30)).toBe('suddenDeath');
    expect(stepBack(1, 2)).toBe(0);
  });
});

describe('applyRound', () => {
  // zwei Mitspieler ohne Ergebnis (bleiben stehen), damit Platz 3 gültig ist
  const idle = [{ id: 'x', position: 0 }, { id: 'y', position: 0 }];
  const idleRanks = { x: 4, y: 4 };

  it('Rakete: +3 Felder', () => {
    const fields = F('S..R..........G');
    const r = applyRound({ players: [{ id: 'a', position: 2 }, ...idle], ranks: { a: 3, ...idleRanks }, fields, seed: 'x' });
    expect(r.moves.a).toMatchObject({ landed: 3, to: 6, effect: { type: 'rocket', delta: 3 } });
    expect(r.positions.x).toBe(0);
    expect(r.stats.a.rockets).toBe(1);
  });

  it('Portal: tauscht mit dem Führenden', () => {
    const fields = F('S...P..........G');
    const r = applyRound({
      players: [{ id: 'a', position: 3 }, { id: 'b', position: 12 }, { id: 'c', position: 0 }],
      ranks: { a: 3, b: 4, c: 4 }, fields, seed: 'x', // b und c: kein Ergebnis
    });
    expect(r.positions).toMatchObject({ a: 12, b: 4 });
    expect(r.stats.b.fieldsLost).toBe(8);
  });

  it('Stolperstein: zurück oder aussetzen; Aussetzen gilt in der nächsten Runde', () => {
    const fields = F('S.X...........G');
    const r = applyRound({ players: [{ id: 'a', position: 1 }, ...idle], ranks: { a: 3, ...idleRanks }, fields, seed: 'x' });
    expect(['back', 'skip']).toContain(r.moves.a.effect.kind);
    const next = applyRound({ players: [{ id: 'a', position: 3, skipNext: true }], ranks: { a: 1 }, fields, seed: 'y' });
    expect(next.moves.a.skipped).toBe(true);
    expect(next.positions.a).toBe(3);
  });

  it('Chaos-Feld wird gemeldet, Ziel beendet das Spiel, bester Platz zieht zuerst', () => {
    const fields = F('S.C...G');
    const chaos = applyRound({ players: [{ id: 'a', position: 1 }, ...idle], ranks: { a: 3, ...idleRanks }, fields, seed: 'x' });
    expect(chaos.chaos).toBe(true);
    const fin = applyRound({
      players: [{ id: 'a', position: 5 }, { id: 'b', position: 5 }, ...idle], ranks: { a: 1, b: 2, ...idleRanks }, fields, seed: 'x',
    });
    expect(fin.winnerId).toBe('a');
    expect(fin.positions.a).toBe(6);
  });
});

describe('Gruppen-Challenges', () => {
  it('Gleichstand teilt den Platz, fehlende Ergebnisse sind Letzte', () => {
    expect(rankFromScores(['a', 'b', 'c', 'd'], (id) => ({ a: 5, b: 1, c: 5 })[id])).toEqual({ b: 1, a: 2, c: 2, d: 5 });
    // Niemand hat es geschafft → niemand zieht
    const none = rankFromScores(['a', 'b'], () => Infinity);
    expect(none).toEqual({ a: 3, b: 3 });
    expect(moveRule(3, 2)).toMatchObject({ dice: false, bonus: 0 });
  });

  it('Auto-Auswertung für alle Teilnehmer', () => {
    const round = { gameId: 'shake', results: { a: { shakes: 20 }, b: { shakes: 35 }, c: { shakes: 10 } } };
    expect(rankGroupRound(round, ['a', 'b', 'c'])).toEqual({ b: 1, a: 2, c: 3 });
  });

  it('Wahrheit oder Bluff in der Gruppe: richtig Ratende vorne, Erzähler vorne wenn er ≥ die Hälfte täuscht', () => {
    const round = {
      gameId: 'truthBluff', playerA: 'a',
      results: { a: { claim: 'x', truth: false }, b: { guess: true }, c: { guess: false }, d: { guess: true } },
    };
    expect(rankGroupRound(round, ['a', 'b', 'c', 'd'])).toEqual({ a: 1, c: 1, b: 3, d: 3 });
  });

  it('Bluff-Karten-Duell ist kein Gruppenspiel, Kamera-Spiele nur wenn alle eine Kamera haben', () => {
    const ids = Object.keys(GAMES);
    const all = groupPlayable(ids, [{ caps: { camera: true, motion: true, compass: true } }, { caps: { motion: true, compass: true } }]).map((g) => g.id);
    expect(all).not.toContain('bluffCard');
    expect(all).not.toContain('stareDown');
    expect(all).toContain('shake');
  });
});
