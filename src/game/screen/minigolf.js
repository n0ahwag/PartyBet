import { clamp, finishByScore } from './common.js';

/*
 * Minigolf: Alle spielen gleichzeitig dieselben 3 Bahnen (die Bälle sind „Geister“ und stoßen nicht zusammen).
 * Am Handy wird mit Aufziehen & Loslassen (Schleuder) geschlagen. Das Handy rechnet den Schlag
 * deterministisch durch und schreibt Schlag + Endposition: results.{uid}.shots = [{ h, a, p, x, y, in }].
 * Der Hauptbildschirm spielt jeden neuen Schlag als Animation ab (gleiche Physik, Endpunkt aus dem Handy).
 */

export const GOLF = { w: 100, h: 160, ballR: 2.2, cupR: 3.4, maxV: 230, maxStrokes: 6, timeMs: 180000, dt: 1 / 120 };

/** Bahnen: Wände (Rechtecke), Bumper (Kreise), Sand (Rechtecke, bremst stark). */
export const HOLES = [
  {
    par: 2, start: { x: 50, y: 146 }, cup: { x: 50, y: 22 },
    walls: [{ x: 28, y: 74, w: 44, h: 10 }], bumpers: [], sand: [{ x: 10, y: 38, w: 22, h: 20 }],
  },
  {
    par: 3, start: { x: 18, y: 146 }, cup: { x: 20, y: 20 },
    walls: [{ x: 34, y: 104, w: 66, h: 9 }, { x: 0, y: 58, w: 66, h: 9 }], bumpers: [{ x: 82, y: 82, r: 6 }], sand: [],
  },
  {
    par: 3, start: { x: 50, y: 148 }, cup: { x: 50, y: 22 },
    walls: [{ x: 0, y: 40, w: 20, h: 8 }, { x: 80, y: 40, w: 20, h: 8 }], bumpers: [{ x: 30, y: 82, r: 7 }, { x: 70, y: 82, r: 7 }, { x: 50, y: 58, r: 7 }],
    sand: [{ x: 28, y: 104, w: 44, h: 14 }],
  },
];

const inRect = (b, r) => b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h;

/**
 * Simuliert einen Schlag. a = Winkel (Bogenmaß, 0 = rechts, −π/2 = nach oben), p = Stärke 0…1.
 * @returns { path: [[x,y]…], x, y, in }
 */
export function simulateShot(hole, from, a, p) {
  const H = HOLES[hole];
  const b = { x: from.x, y: from.y, vx: Math.cos(a) * p * GOLF.maxV, vy: Math.sin(a) * p * GOLF.maxV };
  const R = GOLF.ballR;
  const path = [[b.x, b.y]];
  const dt = GOLF.dt;
  for (let i = 0; i < 120 * 10; i++) {
    const sand = H.sand.some((r) => inRect(b, r));
    const speed = Math.hypot(b.vx, b.vy);
    // Reibung: konstant + geschwindigkeitsabhängig (Sand bremst viel stärker)
    const decel = (sand ? 160 : 26) + speed * (sand ? 2.2 : 0.55);
    const ns = Math.max(0, speed - decel * dt);
    if (speed > 0) { b.vx *= ns / speed; b.vy *= ns / speed; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    // Rand
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * 0.8; }
    if (b.x > GOLF.w - R) { b.x = GOLF.w - R; b.vx = -Math.abs(b.vx) * 0.8; }
    if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * 0.8; }
    if (b.y > GOLF.h - R) { b.y = GOLF.h - R; b.vy = -Math.abs(b.vy) * 0.8; }
    // Wände
    for (const w of H.walls) {
      const cx = clamp(b.x, w.x, w.x + w.w);
      const cy = clamp(b.y, w.y, w.y + w.h);
      const dx = b.x - cx; const dy = b.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < R) {
        let nx; let ny;
        if (d > 1e-6) { nx = dx / d; ny = dy / d; } else {
          // Mittelpunkt in der Wand: an der nächsten Kante hinausschieben
          const opts = [[b.x - w.x, -1, 0], [w.x + w.w - b.x, 1, 0], [b.y - w.y, 0, -1], [w.y + w.h - b.y, 0, 1]].sort((u, v) => u[0] - v[0]);
          [, nx, ny] = opts[0];
        }
        b.x = cx + nx * R; b.y = cy + ny * R;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; }
      }
    }
    // Bumper (federn kräftig)
    for (const c of H.bumpers) {
      const dx = b.x - c.x; const dy = b.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d < c.r + R && d > 1e-6) {
        const nx = dx / d; const ny = dy / d;
        b.x = c.x + nx * (c.r + R); b.y = c.y + ny * (c.r + R);
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 2.1 * vn * nx; b.vy -= 2.1 * vn * ny; }
      }
    }
    if (i % 3 === 0) path.push([b.x, b.y]);
    // Loch: nur, wenn der Ball nicht zu schnell darüberrollt
    const toCup = Math.hypot(b.x - H.cup.x, b.y - H.cup.y);
    if (toCup < GOLF.cupR && Math.hypot(b.vx, b.vy) < 150) {
      path.push([H.cup.x, H.cup.y]);
      return { path, x: H.cup.x, y: H.cup.y, in: true };
    }
    if (Math.hypot(b.vx, b.vy) < 1.5) break;
  }
  const r2 = (v) => Math.round(v * 100) / 100;
  path.push([b.x, b.y]);
  return { path, x: r2(b.x), y: r2(b.y), in: false };
}

/** Stand eines Spielers aus seinen Schlägen: aktuelle Bahn, Position, Schläge je Bahn. */
export function golfState(shots = []) {
  const strokes = HOLES.map(() => 0);
  const holed = HOLES.map(() => false);
  const pos = HOLES.map((h) => ({ ...h.start }));
  for (const s of shots) {
    if (s.h < 0 || s.h >= HOLES.length) continue;
    strokes[s.h] += 1;
    pos[s.h] = { x: s.x, y: s.y };
    if (s.in) holed[s.h] = true;
  }
  const doneHole = (h) => holed[h] || strokes[h] >= GOLF.maxStrokes;
  const hole = HOLES.findIndex((_, h) => !doneHole(h));
  return { strokes, holed, pos, hole, done: hole === -1, doneHole };
}

/** Wertung: Schläge je Bahn, nicht eingelocht = maxStrokes + 1. Kleiner ist besser. */
export function golfTotal(shots) {
  const st = golfState(shots);
  return st.strokes.reduce((sum, n, h) => sum + (st.holed[h] ? n : GOLF.maxStrokes + 1), 0);
}

export const golfCreateState = (rng) => ({ seed: rng.int(1, 999999) });

export const golfDirector = {
  start(round, now) { return { phase: 'run', endsAt: now + GOLF.timeMs }; },
  tick(sim, round, now) {
    const all = round.participants.every((id) => golfState(round.results?.[id]?.shots).done);
    if (all || now >= sim.endsAt) {
      return { sim: { ...sim, phase: 'done' }, done: finishByScore(round, (id) => golfTotal(round.results?.[id]?.shots), { higher: false }) };
    }
    return { sim };
  },
};
