import { describe, it, expect } from 'vitest';
import '../src/game/group.js';
import { GAMES, playableFor } from '../src/game/gameLibrary.js';
import {
  teamsOfRound, shakeResult, wheelResult, flashResult, relayResult, relayRunner, relayTask, RELAY_TASKS, hivemindTeam, teamHivemindResult,
  makeRiver, raftStart, raftStep, raftRoles, raftResult, RIVER, makeShaft, shaftStart, shaftStep, SHAFT, seesawWave,
} from '../src/game/teams.js';
import { makeRng } from '../src/lib/random.js';

const round = (results = {}, n = 4) => ({ participants: ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, n), game: { seed: 5 }, results });

describe('Team-Spiele', () => {
  it('alle 8 Spiele sind registriert und erzeugen einen Zustand', () => {
    for (const id of ['rafting', 'shakeMarathon', 'teamSeesaw', 'compassWheel', 'teamFlash', 'mathRelay', 'touchParcours', 'teamHivemind']) {
      expect(GAMES[id].groupOnly).toBe(true);
      expect(GAMES[id].createState(makeRng(id))).toBeTruthy();
    }
    expect(playableFor([GAMES.compassWheel], [{ caps: { compass: true } }, { caps: {} }])).toHaveLength(0);
  });

  it('Team-Schnitt entscheidet (fair bei ungleich großen Teams)', () => {
    const r = round({}, 5);
    const [t0, t1] = teamsOfRound(r);
    t0.forEach((id) => { r.results[id] = { shakes: 20, done: true }; });
    t1.forEach((id) => { r.results[id] = { shakes: 30, done: true }; });
    const res = shakeResult(r);
    expect(res.extra.winnerTeam).toBe(1);
    t1.forEach((id) => expect(res.points[id]).toBe(2));
    // Licht: kleinere Zeit gewinnt, Frühstart = 1500 ms
    t0.forEach((id) => { r.results[id] = { ms: 300 }; });
    t1.forEach((id) => { r.results[id] = { jumpStart: true }; });
    expect(flashResult(r).extra.winnerTeam).toBe(0);
    // Kompass: Fortschritt pro Kopf
    t0.forEach((id) => { r.results[id] = { deg: 900 }; });
    t1.forEach((id) => { r.results[id] = { deg: 450 }; });
    expect(wheelResult(r).extra.teamValues).toEqual([1, 0.5]);
  });

  it('Mathe-Staffel: Reihenfolge im Team, gleiche Aufgaben, wer zuerst fertig ist', () => {
    const r = round();
    const [t0, t1] = teamsOfRound(r);
    expect(relayRunner(t0, 0)).toBe(t0[0]);
    expect(relayRunner(t0, 3)).toBe(t0[1]);
    expect(relayTask(5, 2)).toEqual(relayTask(5, 2));
    for (let k = 0; k < RELAY_TASKS; k++) {
      r.results[relayRunner(t0, k)] = { ...r.results[relayRunner(t0, k)], [`t${k}`]: 1000 + k * 10 };
      r.results[relayRunner(t1, k)] = { ...r.results[relayRunner(t1, k)], [`t${k}`]: 1000 + k * 12 };
    }
    expect(relayResult(r).extra.winnerTeam).toBe(0);
  });

  it('Team-Hivemind: größter Anteil gleicher Begriffe', () => {
    const r = round();
    const [t0, t1] = teamsOfRound(r);
    r.results[t0[0]] = { word: 'Vanille' }; r.results[t0[1]] = { word: 'vanille ' };
    r.results[t1[0]] = { word: 'Schoko' }; r.results[t1[1]] = { word: 'Erdbeere' };
    expect(hivemindTeam(r, t0).share).toBe(1);
    expect(teamHivemindResult(r).extra.winnerTeam).toBe(0);
  });

  it('Rafting: Rollen verteilt, Felsen umschiffbar, Ziel erreichbar', () => {
    const r = round({}, 3);
    expect(Object.values(raftRoles(r)).sort()).toEqual(['left', 'right', 'speed']);
    const rocks = makeRiver(5);
    rocks.forEach((rk) => expect(Math.abs(rk.x) + rk.r).toBeLessThan(RIVER.width / 2));
    // Erreichbarkeit (alle Positionen, die man mit voller Ruderkraft ohne Treffer erreichen kann) → jeder Fluss ist schaffbar
    for (let seed = 1; seed < 25; seed++) {
      const rocks = makeRiver(seed);
      const lim = RIVER.width / 2 - RIVER.raftR;
      let xs = new Set([0]);
      for (let y = 0; y < RIVER.length; y += RIVER.speed * 0.1) {
        const next = new Set();
        const near = rocks.filter((rk) => Math.abs(y - rk.y) < 2);
        for (const x of xs) for (const d of [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]) {
          const nx = Math.round(Math.max(-lim, Math.min(lim, x + d)) * 10) / 10;
          if (!next.has(nx) && near.every((rk) => Math.hypot(nx - rk.x, y - rk.y) >= rk.r + RIVER.raftR)) next.add(nx);
        }
        xs = next;
        if (!xs.size) break;
      }
      expect(xs.size).toBeGreaterThan(0);
    }
    let s = raftStart(); s = { ...s, y: RIVER.length, ok: true, done: true };
    expect(s.ok).toBe(true);
    expect(raftResult(r, s).points.a).toBe(3);
  });

  it('Touch-Parcours: Kugel in der Lücke kommt durch, daneben stoppt sie', () => {
    const gates = makeShaft(5);
    let st = shaftStart(); let t = 0;
    for (let i = 0; i < 1000 && st[0].finishedAt == null && st[0].alive; i++) {
      const g = gates.find((x) => x.y >= st[0].y) ?? { c: 0 };
      st = shaftStep(st, [g.c, 4], gates, 0.1, t); t += 0.1;
    }
    expect(st[0].finishedAt).not.toBeNull();
    expect(st[0].lives).toBe(SHAFT.lives);
    expect(st[1].lives).toBeLessThan(SHAFT.lives); // daneben kostet Leben
  });

  it('Wippe: Wellen sind für alle gleich', () => {
    expect(seesawWave(3, 2.5)).toBe(seesawWave(3, 2.5));
    expect(Math.abs(seesawWave(3, 1))).toBeLessThan(25);
  });
});
