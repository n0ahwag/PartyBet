import { makeRng } from '../lib/random.js';

/*
 * Arcade-Minispiele: reine Spiellogik (ohne DOM, testbar). Alle Level entstehen
 * aus dem Seed des Spiels – so spielen alle Teilnehmer exakt denselben Parcours.
 */

// ------------------------------------------------------------------ Pixel-Sprint (Endless-Runner)

export const RUN = {
  groundY: 0, // Boden (Welt-y nach oben positiv)
  runnerX: 60, // feste Bildschirm-Position
  runnerW: 26,
  runnerH: 34,
  jumpV: 640, // px/s
  gravity: 2000,
  startSpeed: 260, // px/s
  accel: 9, // px/s pro Sekunde
  maxMs: 60000,
};

/** Hindernis-Parcours: [{ x, w, h }] in Welt-Pixeln, immer mit genug Abstand zum Landen. */
export function makeCourse(seed, count = 260) {
  const rng = makeRng(`run:${seed}`);
  const obstacles = [];
  let x = 600;
  for (let i = 0; i < count; i++) {
    const tall = rng.next() < Math.min(0.45, 0.1 + i * 0.01);
    const double = !tall && rng.next() < 0.25;
    const w = double ? 44 : 22;
    const h = tall ? 44 : 26;
    obstacles.push({ x, w, h });
    // Abstand wächst mit dem Tempo an dieser Stelle (länger als ein Sprung), damit alles schaffbar bleibt
    const speedHere = Math.sqrt(RUN.startSpeed ** 2 + 2 * RUN.accel * x);
    x += w + Math.max(240, speedHere * 0.85) + rng.int(0, 260);
  }
  return obstacles;
}

/** Ein Physik-Schritt des Läufers. state = { dist, y, vy, speed, alive } */
export function stepRunner(state, dt, jump, course) {
  if (!state.alive) return state;
  let { dist, y, vy, speed } = state;
  if (jump && y <= 0) vy = RUN.jumpV;
  vy -= RUN.gravity * dt;
  y = Math.max(0, y + vy * dt);
  if (y === 0 && vy < 0) vy = 0;
  speed += RUN.accel * dt;
  dist += speed * dt;
  // Kollision: Läufer [dist, dist + w] × [y, y + h] gegen Hindernisse
  const left = dist + 4;
  const right = dist + RUN.runnerW - 4;
  const hit = course.some((o) => o.x < right && o.x + o.w > left && y < o.h - 2);
  return { dist, y, vy, speed, alive: !hit };
}

/** Meter (für die Anzeige): 10 px = 1 m. */
export const runMeters = (dist) => Math.floor(dist / 10);

// ------------------------------------------------------------------ Block-Stacker

export const STACK = { width: 300, startW: 180, blockH: 24, maxFloors: 40, perfectPx: 4 };

/**
 * Block fallen lassen: Überhang wird abgeschnitten. Fast genau = „Perfekt“ (Breite bleibt).
 * @returns { placed: { x, w } | null, perfect }
 */
export function dropBlock(prev, cur) {
  const offset = cur.x - prev.x;
  if (Math.abs(offset) <= STACK.perfectPx) return { placed: { x: prev.x, w: prev.w }, perfect: true };
  const left = Math.max(prev.x, cur.x);
  const right = Math.min(prev.x + prev.w, cur.x + cur.w);
  if (right - left <= 0) return { placed: null, perfect: false };
  return { placed: { x: left, w: right - left }, perfect: false };
}

/** Geschwindigkeit des schwebenden Blocks je Stockwerk (px/s) – mit Seed leicht variiert. */
export function stackSpeed(seed, floor) {
  const rng = makeRng(`stack:${seed}:${floor}`);
  return 120 + floor * 9 + rng.int(0, 40);
}

// ------------------------------------------------------------------ Weitsprung-Challenge

export const JUMP = { attempts: 3, maxM: 9 };

/** Anlauf-Tempo pendelt 0 → 1 → 0 (Halten); periodMs je nach Seed. */
export const chargeAt = (ms, periodMs) => (1 - Math.cos((ms / periodMs) * Math.PI * 2)) / 2;

/** Absprungwinkel pendelt zwischen 10° und 80°. */
export const angleAt = (ms, periodMs) => 10 + 70 * ((1 - Math.cos((ms / periodMs) * Math.PI * 2)) / 2);

/** Weite in Metern wie ein schiefer Wurf: am weitesten bei vollem Tempo und 45°. */
export function jumpDistance(v, deg) {
  const m = JUMP.maxM * v * v * Math.sin((2 * deg * Math.PI) / 180);
  return Math.max(0, Math.round(m * 100) / 100);
}

// ------------------------------------------------------------------ Vertikal-Jumper

export const SKY = { width: 320, bounceV: 760, gravity: 1650, platW: 64, maxMs: 90000 };

/** Plattformen nach oben: [{ x, y, w, moving }] – Abstände immer erreichbar (Sprunghöhe ≈ 175 px). */
export function makePlatforms(seed, count = 400) {
  const rng = makeRng(`sky:${seed}`);
  const list = [{ x: SKY.width / 2 - 50, y: 20, w: 100, moving: 0 }];
  let y = 20;
  for (let i = 1; i < count; i++) {
    y += 55 + rng.int(0, Math.min(70, 20 + i)); // wird langsam lückenhafter, bleibt < 130
    const moving = i > 25 && rng.next() < 0.25 ? (rng.next() < 0.5 ? -1 : 1) * (40 + rng.int(0, 50)) : 0;
    list.push({ x: rng.int(0, SKY.width - SKY.platW), y, w: SKY.platW, moving });
  }
  return list;
}

/** Maximale Sprunghöhe (px) – zum Prüfen, dass jede Lücke schaffbar ist. */
export const skyJumpHeight = () => (SKY.bounceV * SKY.bounceV) / (2 * SKY.gravity);
