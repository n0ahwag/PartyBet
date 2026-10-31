import { describe, it, expect } from 'vitest';
import {
  RUN, makeCourse, stepRunner, STACK, dropBlock, stackSpeed, chargeAt, angleAt, jumpDistance, makePlatforms, skyJumpHeight,
} from '../src/game/arcade.js';
import { GAMES, filterLibrary, QUIET_IDS } from '../src/game/gameLibrary.js';
import { libraryFor } from '../src/game/group.js';

const ARCADE = ['pixelRun', 'blockStacker', 'longJump', 'skyJumper'];

describe('Arcade-Spiele', () => {
  it('sind ohne Utensilien in der Bibliothek, mit Auswertung für Duell und Gruppe', () => {
    const lib = filterLibrary({ playerCount: 2, equipment: [] }).map((g) => g.id);
    for (const id of ARCADE) {
      expect(lib).toContain(id);
      expect(GAMES[id].kind).toBe('arcade');
      expect(GAMES[id].groupScore).toBeTypeOf('function');
    }
    const d = (gameId, a, b) => ({ gameId, playerA: 'a', playerB: 'b', results: { a, b } });
    expect(GAMES.pixelRun.decide(d('pixelRun', { m: 120 }, { m: 80 }))).toBe('a');
    expect(GAMES.blockStacker.decide(d('blockStacker', { floors: 9, perfects: 0 }, { floors: 9, perfects: 3 }))).toBe('b');
    expect(GAMES.longJump.decide(d('longJump', { best: 7.1 }, { best: 8.4 }))).toBe('b');
    expect(GAMES.skyJumper.decide(d('skyJumper', { m: 300 }, { m: 300 }))).toBeNull();
  });

  it('Pixel-Sprint: Parcours fest, jeder Abstand länger als ein Sprung', () => {
    const c = makeCourse(42);
    expect(makeCourse(42)).toEqual(c);
    const airtime = (2 * RUN.jumpV) / RUN.gravity;
    for (let i = 1; i < c.length; i++) {
      const speed = Math.sqrt(RUN.startSpeed ** 2 + 2 * RUN.accel * c[i].x);
      expect(c[i].x - (c[i - 1].x + c[i - 1].w)).toBeGreaterThan(speed * airtime * 0.8);
    }
    // ohne Springen gibt es eine Kollision, mit perfektem Springen nicht
    let st = { dist: 0, y: 0, vy: 0, speed: RUN.startSpeed, alive: true };
    for (let i = 0; i < 400 && st.alive; i++) st = stepRunner(st, 1 / 60, false, c);
    expect(st.alive).toBe(false);
    st = { dist: 0, y: 0, vy: 0, speed: RUN.startSpeed, alive: true };
    for (let i = 0; i < 60 * 20 && st.alive; i++) {
      const next = c.find((o) => o.x + o.w > st.dist);
      const jump = next && next.x - (st.dist + RUN.runnerW) < st.speed * 0.12;
      st = stepRunner(st, 1 / 60, jump, c);
    }
    expect(st.alive).toBe(true);
  });

  it('Block-Stacker: Überhang wird abgeschnitten, daneben = Ende, fast genau = perfekt', () => {
    const prev = { x: 60, w: 180 };
    expect(dropBlock(prev, { x: 90, w: 180 })).toEqual({ placed: { x: 90, w: 150 }, perfect: false });
    expect(dropBlock(prev, { x: 62, w: 180 })).toEqual({ placed: { x: 60, w: 180 }, perfect: true });
    expect(dropBlock(prev, { x: 260, w: 180 }).placed).toBeNull();
    expect(stackSpeed(1, 10)).toBeGreaterThan(stackSpeed(1, 1) - 40);
    expect(STACK.maxFloors).toBeGreaterThan(10);
  });

  it('Weitsprung: am weitesten bei vollem Tempo und 45°', () => {
    expect(jumpDistance(1, 45)).toBe(9);
    expect(jumpDistance(1, 30)).toBeLessThan(9);
    expect(jumpDistance(0.5, 45)).toBe(2.25);
    expect(chargeAt(0, 1000)).toBeCloseTo(0);
    expect(chargeAt(500, 1000)).toBeCloseTo(1);
    expect(angleAt(0, 1000)).toBeCloseTo(10);
    expect(angleAt(500, 1000)).toBeCloseTo(80);
  });

  it('Vertikal-Jumper: jede Plattform ist erreichbar', () => {
    const p = makePlatforms(7);
    for (let i = 1; i < p.length; i++) expect(p[i].y - p[i - 1].y).toBeLessThan(skyJumpHeight() * 0.85);
  });
});

describe('Stealth-/Uni-Modus', () => {
  it('nur leise Spiele – nichts zum Rufen, Aufstehen oder Hören', () => {
    const lib = libraryFor('party', 4, [], { stealth: true }).map((g) => g.id);
    expect(lib.length).toBeGreaterThan(10);
    for (const id of lib) expect(GAMES[id].quiet).toBe(true);
    for (const loud of ['wordChain', 'hivemind', 'rps', 'rhythm', 'shake', 'heightStretch', 'colorSprint', 'cupFlip']) expect(lib).not.toContain(loud);
    expect(QUIET_IDS).toContain('balance');
    expect(GAMES.balance.name).toBe('Der fliegende Teppich');
    expect(libraryFor('group', 4, [], { stealth: true }).map((g) => g.id)).toEqual(expect.arrayContaining(['whoMost', 'syncTest', 'confession', 'chainStory']));
  });
});
