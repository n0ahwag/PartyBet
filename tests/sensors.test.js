import { describe, it, expect } from 'vitest';
import {
  angleDelta, makeRotationTracker, verticalAccel, makeLiftTracker, stretchScore, lumaOf, isCovered,
  tiltError, makeMaze, stepBall, inGoal,
} from '../src/game/sensors.js';
import { GAMES, filterLibrary, playableFor } from '../src/game/gameLibrary.js';
import { makeRng } from '../src/lib/random.js';

const SENSOR = ['spiritLevel', 'safeCracker', 'heightStretch', 'lightFlash', 'marbleMaze'];

describe('Sensor-Spiele: Bibliothek', () => {
  it('ohne Utensilien, mit 2 Spielern dabei, nur auf Geräten mit passendem Sensor', () => {
    const lib = filterLibrary({ playerCount: 2, equipment: [] });
    for (const id of SENSOR) {
      expect(lib.map((g) => g.id)).toContain(id);
      expect(GAMES[id].equipment).toEqual([]);
      expect(GAMES[id].groupScore).toBeTypeOf('function');
    }
    const desktop = { caps: { motion: false, compass: false, camera: true } };
    const ids = playableFor(SENSOR.map((id) => GAMES[id]), [desktop, desktop]).map((g) => g.id);
    expect(ids).toEqual(['lightFlash']);
  });

  it('Duell-Auswertung', () => {
    const d = (gameId, a, b) => ({ gameId, playerA: 'a', playerB: 'b', results: { a, b } });
    expect(GAMES.spiritLevel.decide(d('spiritLevel', { bestMs: 4000 }, { bestMs: 2500 }))).toBe('a');
    expect(GAMES.safeCracker.decide(d('safeCracker', { ms: null, degrees: 200 }, { ms: null, degrees: 300 }))).toBe('b');
    expect(GAMES.safeCracker.decide(d('safeCracker', { ms: 9000, degrees: 360 }, { ms: null, degrees: 359 }))).toBe('a');
    expect(GAMES.lightFlash.decide(d('lightFlash', { jumpStart: true, ms: null }, { ms: 420 }))).toBe('b');
    expect(GAMES.marbleMaze.decide(d('marbleMaze', { ms: 30000 }, { ms: 25000 }))).toBe('b');
    expect(GAMES.heightStretch.decide(d('heightStretch', { score: 500 }, { score: 300 }))).toBe('a');
  });
});

describe('Tresor-Dreher', () => {
  it('Winkeldifferenz über 0°/360° hinweg', () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
  });
  it('eine volle Drehung im Uhrzeigersinn = 360°, Gegenrichtung zieht ab', () => {
    const tr = makeRotationTracker();
    for (let h = 100; h <= 460; h += 15) tr.push(h % 360);
    expect(tr.total).toBe(360);
    for (let h = 100; h >= 40; h -= 15) tr.push(h);
    expect(tr.total).toBe(300);
  });
});

describe('Höhen-Strecker', () => {
  it('projiziert auf die Senkrechte', () => {
    // Handy aufrecht: Schwerkraft-Reaktion zeigt entlang +y
    expect(verticalAccel({ x: 0, y: 3, z: 0 }, { x: 0, y: 12.81, z: 0 })).toBeCloseTo(3);
    expect(verticalAccel(null, { x: 0, y: 0, z: 12.81 })).toBeCloseTo(3);
  });
  it('schätzt den Hub aus einem Beschleunigungs-Stoß', () => {
    const lift = makeLiftTracker();
    let tm = 0;
    // 0,3 s mit +8 m/s² hoch, dann 0,3 s bremsen
    for (; tm <= 300; tm += 10) lift.push(8, tm);
    for (; tm <= 700; tm += 10) lift.push(-8, tm);
    expect(lift.done).toBe(true);
    expect(lift.heightCm).toBeGreaterThan(25);
    expect(lift.heightCm).toBeLessThan(90);
  });
  it('Punkte: höher und ruhiger ist besser', () => {
    expect(stretchScore({ heightCm: 60, reactionMs: 300, wobble: 0.1 })).toBeGreaterThan(stretchScore({ heightCm: 60, reactionMs: 300, wobble: 1 }));
    expect(stretchScore({ heightCm: 70, reactionMs: 300, wobble: 0.2 })).toBeGreaterThan(stretchScore({ heightCm: 40, reactionMs: 300, wobble: 0.2 }));
  });
});

describe('Lichtsensor & Wasserwaage', () => {
  it('Helligkeit und Abdecken', () => {
    expect(lumaOf(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]))).toBeCloseTo(127.5);
    expect(isCovered(20, 120)).toBe(true);
    expect(isCovered(100, 120)).toBe(false);
  });
  it('Neigungsfehler', () => {
    expect(tiltError(10, -5, { beta: 10, gamma: -5 })).toBe(0);
    expect(tiltError(13, -1, { beta: 10, gamma: -5 })).toBe(5);
  });
});

describe('Kugel-Labyrinth', () => {
  it('Labyrinth ist deterministisch und jede Zelle erreichbar', () => {
    const m = makeMaze(42);
    expect(makeMaze(42)).toEqual(m);
    const seen = new Set(['0,0']);
    const q = [[0, 0]];
    const step = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
    while (q.length) {
      const [c, r] = q.shift();
      for (const [side, [dc, dr]] of Object.entries(step)) {
        const k = `${c + dc},${r + dr}`;
        if (!m.walls[r][c][side] && !seen.has(k)) { seen.add(k); q.push([c + dc, r + dr]); }
      }
    }
    expect(seen.size).toBe(m.cols * m.rows);
  });
  it('Kugel bleibt an Wänden hängen und rollt nie aus dem Spielfeld', () => {
    const m = makeMaze(7);
    const rng = makeRng('tilt');
    let ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    for (let i = 0; i < 4000; i++) {
      const tilt = { x: rng.next() * 2 - 1, y: rng.next() * 2 - 1 };
      ball = stepBall(ball, tilt, 0.004, m);
      expect(ball.x).toBeGreaterThan(0);
      expect(ball.y).toBeGreaterThan(0);
      expect(ball.x).toBeLessThan(m.cols);
      expect(ball.y).toBeLessThan(m.rows);
    }
    // Erste Zelle: rechts oder unten ist eine Wand → Kugel stoppt davor
    const blocked = m.walls[0][0].e ? 'e' : 's';
    let b = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    for (let i = 0; i < 400; i++) b = stepBall(b, blocked === 'e' ? { x: 1, y: 0 } : { x: 0, y: 1 }, 0.004, m);
    expect(blocked === 'e' ? b.x : b.y).toBeLessThan(1);
    expect(inGoal(b, m)).toBe(false);
  });
});
