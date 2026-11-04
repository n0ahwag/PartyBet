import { describe, it, expect } from 'vitest';
import { GAMES, chooseNextGame, pickGame } from '../src/game/gameLibrary.js';
import { libraryFor } from '../src/game/group.js';

const lib = libraryFor('board', 4, []);

/** Eine Party simulieren: n Runden, Ergebnis = gewählte Spiel-Ids. */
function party(n, { cycle = [], seed = 'P' } = {}) {
  let played = []; let last = null; const out = []; let cyc = [...cycle];
  for (let i = 0; i < n; i++) {
    const r = chooseNextGame({ playable: lib, played, cycle: cyc, lastGameId: last, seed: `${seed}:${i}` });
    out.push(r.game.id);
    played = r.playedGames; last = r.game.id;
    cyc = r.cycleReset ? [r.game.id] : [...cyc, r.game.id];
  }
  return { out, cycle: cyc };
}

describe('Spielauswahl', () => {
  it('jedes Spiel genau einmal, bevor sich etwas wiederholt', () => {
    for (const seed of ['A', 'B', 'C']) {
      const { out } = party(lib.length, { seed });
      expect(new Set(out).size).toBe(lib.length);
    }
  });

  it('Kategorien wechseln sich ab: nie dieselbe Kategorie dreimal hintereinander, selten zweimal', () => {
    const { out } = party(lib.length, { seed: 'mix' });
    const kinds = out.map((id) => GAMES[id].kind);
    let doubles = 0;
    for (let i = 1; i < kinds.length; i++) {
      if (kinds[i] === kinds[i - 1]) doubles += 1;
      if (i >= 2) expect(kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2]).toBe(false);
    }
    expect(doubles).toBeLessThanOrEqual(6); // gegen Ende bleiben nur noch die großen Kategorien übrig
    // in den ersten 10 Runden mindestens 7 verschiedene Kategorien
    expect(new Set(kinds.slice(0, 10)).size).toBeGreaterThanOrEqual(7);
  });

  it('partyübergreifend: die nächste Party macht mit den noch nicht gespielten Spielen weiter', () => {
    const first = party(10, { seed: 'X' });
    const second = party(10, { seed: 'Y', cycle: first.cycle });
    expect(second.out.some((id) => first.out.includes(id))).toBe(false);
    // nach einem kompletten Durchlauf beginnt der Zyklus von vorn
    const all = party(lib.length, { seed: 'Z' });
    const next = chooseNextGame({ playable: lib, played: [], cycle: all.cycle, seed: 'Z2' });
    expect(next.cycleReset).toBe(true);
  });

  it('nie zweimal dasselbe Spiel direkt hintereinander', () => {
    const g = pickGame(lib.slice(0, 2), lib[0].id, 's', null, []);
    expect(g.id).toBe(lib[1].id);
  });
});
