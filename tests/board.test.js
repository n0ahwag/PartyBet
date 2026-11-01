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

  it('Platzierung → Würfel: jeder würfelt, Platz 1–3 mit Spezialwürfel', () => {
    expect(moveRule(1).dice).toEqual(['gold', 'normal']);
    expect(moveRule(2).dice).toEqual(['silver', 'normal']);
    expect(moveRule(3).dice).toEqual(['bronze', 'normal']);
    expect(moveRule(4).dice).toEqual(['normal']);
    expect(moveRule(9).dice).toEqual(['normal']); // auch ohne Ergebnis wird gewürfelt
  });

  it('Phasen nach Fortschritt des Führenden', () => {
    expect(boardPhase(5, 30)).toBe('warmup');
    expect(boardPhase(14, 30)).toBe('chaos');
    expect(boardPhase(23, 30)).toBe('suddenDeath');
    expect(stepBack(1, 2)).toBe(0);
  });
});

describe('applyRound', () => {
  // zwei weitere Mitspieler (würfeln auch, hier fest je 1 Feld)
  const idle = [{ id: 'x', position: 0 }, { id: 'y', position: 0 }];
  const idleRanks = { x: 4, y: 4 };
  const idleRolls = { x: [1], y: [1] };

  it('Rakete: +3 Felder', () => {
    const fields = F('S..R..........G');
    const r = applyRound({ players: [{ id: 'a', position: 2 }, ...idle], ranks: { a: 3, ...idleRanks }, fields, seed: 'x', fixedRolls: { a: [1], ...idleRolls } });
    expect(r.moves.a).toMatchObject({ landed: 3, to: 6, effect: { type: 'rocket', delta: 3 } });
    expect(r.positions.x).toBe(1);
    expect(r.stats.a.rockets).toBe(1);
  });

  it('Portal: tauscht mit dem Führenden', () => {
    const fields = F('S...P..........G');
    const r = applyRound({
      players: [{ id: 'a', position: 3 }, { id: 'b', position: 12 }, { id: 'c', position: 0 }],
      ranks: { a: 3, b: 4, c: 4 }, fields, seed: 'x', fixedRolls: { a: [1], b: [1], c: [1] },
    });
    // a landet auf dem Portal (4) und tauscht mit b (12); b würfelt danach von 4 aus weiter
    expect(r.positions).toMatchObject({ a: 12, b: 5 });
    expect(r.stats.b.fieldsLost).toBe(8);
  });

  it('Stolperstein: zurück oder aussetzen; Aussetzen gilt in der nächsten Runde', () => {
    const fields = F('S.X...........G');
    const r = applyRound({ players: [{ id: 'a', position: 1 }, ...idle], ranks: { a: 3, ...idleRanks }, fields, seed: 'x', fixedRolls: { a: [1], ...idleRolls } });
    expect(['back', 'skip']).toContain(r.moves.a.effect.kind);
    const next = applyRound({ players: [{ id: 'a', position: 3, skipNext: true }], ranks: { a: 1 }, fields, seed: 'y' });
    expect(next.moves.a.skipped).toBe(true);
    expect(next.positions.a).toBe(3);
  });

  it('Chaos-Feld wird gemeldet, Ziel beendet das Spiel, bester Platz zieht zuerst', () => {
    const fields = F('S.C...G');
    const chaos = applyRound({ players: [{ id: 'a', position: 1 }, ...idle], ranks: { a: 3, ...idleRanks }, fields, seed: 'x', fixedRolls: { a: [1], ...idleRolls } });
    expect(chaos.chaos).toBe(true);
    const fin = applyRound({
      players: [{ id: 'a', position: 5 }, { id: 'b', position: 5 }, ...idle], ranks: { a: 1, b: 2, ...idleRanks }, fields, seed: 'x',
      fixedRolls: { a: [1], b: [1], ...idleRolls },
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

describe('3D-Spielfeld & Würfel', () => {
  it('Pfad: ein Punkt pro Feld, gleichmäßige Abstände, Deko nie auf der Straße', async () => {
    const { layoutBoard } = await import('../src/game/board3d.js');
    for (const n of [20, 30, 40, 90, 150]) {
      const l = layoutBoard(n, 'ABCD');
      expect(l.fields).toHaveLength(n);
      for (let i = 1; i < n; i++) {
        const d = Math.hypot(l.fields[i].X - l.fields[i - 1].X, l.fields[i].Y - l.fields[i - 1].Y);
        expect(d).toBeGreaterThan(0.9); // Felder überlappen nicht
        expect(d).toBeLessThan(1.6); // Schwung macht Abstände minimal größer
      }
      for (const it of l.decor) for (const p of l.road) expect(Math.hypot(it.X - p.X, it.Y - p.Y)).toBeGreaterThanOrEqual(1.05);
      expect(layoutBoard(n, 'ABCD')).toEqual(l); // alle Geräte gleich
    }
  });

  it('Würfel: Spezialwürfel nur mit ihren Augen, deterministisch, gleich im Zug und auf dem Handy', async () => {
    const { diceFor, rollDiceFor, rollersOf, DICE_KINDS } = await import('../src/game/board.js');
    const seen = (faces) => [...new Set(Array.from({ length: 300 }, (_, i) => diceFor('ROOM:r01', `p${i}`, 0, faces)))].sort();
    expect(seen(DICE_KINDS.gold.faces)).toEqual([4, 5, 6]);
    expect(seen(DICE_KINDS.silver.faces)).toEqual([2, 3, 4]);
    expect(seen(DICE_KINDS.bronze.faces)).toEqual([1, 2, 3]);
    expect(seen(DICE_KINDS.normal.faces)).toEqual([1, 2, 3, 4, 5, 6]);
    const fields = F('S........................................G');
    const players = ['a', 'b', 'c', 'd'].map((id) => ({ id, position: 0 }));
    const r = applyRound({ players, ranks: { a: 1, b: 2, c: 3, d: 4 }, fields, seed: 'ROOM:r01' });
    for (const [id, rank] of [['a', 1], ['b', 2], ['c', 3], ['d', 4]]) {
      const dice = rollDiceFor('ROOM:r01', id, rank);
      expect(r.moves[id].dice).toEqual(dice);
      expect(r.moves[id].steps).toBe(dice.reduce((s2, x) => s2 + x.value, 0));
    }
    expect(r.moves.a.dice.map((d) => d.kind)).toEqual(['gold', 'normal']);
    expect(r.moves.d.dice.map((d) => d.kind)).toEqual(['normal']);
    const round = { participants: ['a', 'b', 'c'], ranks: { a: 1, b: 2, c: 9 } };
    expect(rollersOf(round, [{ id: 'a' }, { id: 'b', skipNext: true }, { id: 'c' }])).toEqual(['a', 'c']);
  });
});

describe('3D-Maps & Hindernisse', async () => {
  const { buildMap, MAP_IDS } = await import('../src/game/maps/defs.js');
  const { generateBoard, applyRound, obstaclesOnPath, challengesFor, pickMap } = await import('../src/game/board.js');

  it('jede Map liefert genau so viele Felder wie das Spielfeld hat – ohne Lücken außer an der Brücke', () => {
    for (const id of MAP_IDS) {
      for (const n of [90, 120, 150]) {
        const m = buildMap(id, n);
        expect(m.fields).toHaveLength(n);
        expect(m.jumps.length).toBe(1);
        expect(Object.keys(m.obstacles).length).toBe(3);
        m.fields.forEach((f) => f.p.forEach((v) => expect(Number.isFinite(v)).toBe(true)));
        for (let i = 1; i < n; i++) {
          const a = m.fields[i - 1].p; const b = m.fields[i].p;
          const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
          if (!m.jumps.includes(i - 1)) expect(d).toBeLessThan(1.25);
        }
      }
    }
  });

  it('Spielfeld enthält die Hindernisse der Map an den richtigen Stellen', () => {
    const fields = generateBoard(120, 'ABCD', 'canyon');
    const m = buildMap('canyon', 120);
    expect(fields[m.jumps[0]]).toBe('jump');
    Object.entries(m.obstacles).forEach(([i, k]) => expect(fields[Number(i)]).toBe(k));
    expect(['sky', 'volcano', 'canyon']).toContain(pickMap('XYZ'));
  });

  it('Felsen: nur mit 4–6 kommt man durch', () => {
    const fields = Array(30).fill('normal'); fields[0] = 'start'; fields[29] = 'goal'; fields[10] = 'boulder';
    const players = [{ id: 'a', position: 7 }, { id: 'b', position: 7 }];
    const r = applyRound({ players, ranks: { a: 4, b: 5 }, fields, seed: 's', fixedRolls: { a: [5], b: [3] } });
    expect(r.positions.a).toBe(12);
    expect(r.moves.a.obstacles[0]).toMatchObject({ type: 'boulder', ok: true });
    expect(r.positions.b).toBe(9); // bleibt vor dem Felsen stehen
    expect(r.moves.b.obstacles[0]).toMatchObject({ type: 'boulder', ok: false });
  });

  it('Ducken & Brücke hängen am Ergebnis der Probe am Handy', () => {
    const fields = Array(40).fill('normal'); fields[0] = 'start'; fields[39] = 'goal'; fields[10] = 'duck'; fields[20] = 'jump';
    const players = [{ id: 'a', position: 8 }, { id: 'b', position: 8 }, { id: 'c', position: 18 }, { id: 'd', position: 18 }];
    const r = applyRound({
      players, ranks: { a: 4, b: 4, c: 4, d: 4 }, fields, seed: 's',
      fixedRolls: { a: [4], b: [4], c: [5], d: [5] },
      challenges: { a: { 10: true }, b: { 10: false }, c: { 20: true }, d: { 20: false } },
    });
    expect(r.positions.a).toBe(12);
    expect(r.positions.b).toBe(9);
    expect(r.positions.c).toBe(23);
    expect(r.positions.d).toBe(17); // abgestürzt: 3 Felder vor der Brücke
    expect(obstaclesOnPath(fields, 18, 20)).toEqual([]); // genau auf dem Sprungfeld landen = noch kein Sprung
    expect(challengesFor(fields, 8, [{ value: 2 }, { value: 1 }])).toEqual([{ idx: 10, type: 'duck' }]);
  });
});
