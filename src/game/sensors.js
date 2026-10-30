import { makeRng } from '../lib/random.js';

/*
 * Reine Hilfsfunktionen für die Sensor-Spiele (ohne DOM, testbar):
 * Drehwinkel aufsummieren, Hub aus Beschleunigung schätzen, Helligkeit messen,
 * Labyrinth erzeugen und die Kugel-Physik.
 */

// ------------------------------------------------------------------ Tresor-Dreher

/** Kürzeste Winkeldifferenz von a nach b in (-180, 180]. Positiv = im Uhrzeigersinn (Kompass-Kurs steigt). */
export function angleDelta(from, to) {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Kompass-Kurs aus einem deviceorientation-Event (iOS: webkitCompassHeading, sonst 360 − alpha). */
export function headingOf(e) {
  if (typeof e.webkitCompassHeading === 'number') return e.webkitCompassHeading;
  if (e.alpha != null) return (360 - e.alpha) % 360;
  return null;
}

/** Summiert die echte Drehung: Uhrzeigersinn zählt, Gegenrichtung zieht ab. */
export function makeRotationTracker() {
  let last = null;
  let total = 0;
  return {
    push(heading) {
      if (heading == null) return total;
      if (last != null) {
        const d = angleDelta(last, heading);
        if (Math.abs(d) < 90) total += d; // Sprünge (Sensor-Neukalibrierung) ignorieren
      }
      last = heading;
      return total;
    },
    get total() { return total; },
  };
}

// ------------------------------------------------------------------ Höhen-Strecker

const G = 9.81;

/**
 * Beschleunigung entlang der Senkrechten (m/s², + = nach oben).
 * Mit acceleration (ohne Schwerkraft) wird auf die Schwerkraft-Richtung projiziert,
 * sonst grob über den Betrag von accelerationIncludingGravity.
 */
export function verticalAccel(acc, accG) {
  if (acc && acc.x != null && accG && accG.x != null) {
    const g = { x: accG.x - acc.x, y: accG.y - acc.y, z: accG.z - acc.z };
    const len = Math.hypot(g.x, g.y, g.z) || 1;
    return (acc.x * g.x + acc.y * g.y + acc.z * g.z) / len;
  }
  if (accG && accG.x != null) return Math.hypot(accG.x, accG.y, accG.z) - G;
  return 0;
}

/**
 * Schätzt den Hub nach oben: Startet beim ersten kräftigen Ruck nach oben,
 * integriert Geschwindigkeit → Strecke, endet wenn die Bewegung stoppt (max. 1,5 s).
 */
export function makeLiftTracker({ startThreshold = 2.5 } = {}) {
  let startedAt = null;
  let lastT = null;
  let v = 0;
  let h = 0;
  let peakV = 0;
  let done = false;
  return {
    /** @param up vertikale Beschleunigung (m/s²)  @param tMs Zeitstempel */
    push(up, tMs) {
      if (done) return;
      if (startedAt == null) {
        if (up < startThreshold) return;
        startedAt = tMs;
        lastT = tMs;
        return;
      }
      const dt = Math.min(0.05, (tMs - lastT) / 1000);
      lastT = tMs;
      v += up * dt;
      if (v < 0) v = 0; // nach unten zählt nicht
      h += v * dt;
      peakV = Math.max(peakV, v);
      if ((peakV > 0.3 && v < 0.05) || tMs - startedAt > 1500) done = true;
    },
    get started() { return startedAt != null; },
    get startedAt() { return startedAt; },
    get done() { return done; },
    get heightCm() { return Math.round(Math.min(1.5, h) * 100); },
  };
}

/** Punkte für den Höhen-Strecker: hoch, schnell und danach ruhig. */
export function stretchScore({ heightCm, reactionMs, wobble }) {
  if (heightCm == null) return 0;
  return Math.max(0, Math.round((heightCm * 10) / (1 + wobble * 2) - (reactionMs ?? 2000) / 10));
}

// ------------------------------------------------------------------ Lichtsensor-Blitz

/** Mittlere Helligkeit (0–255) aus RGBA-Pixeldaten. */
export function lumaOf(data) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    n += 1;
  }
  return n ? sum / n : 0;
}

/** Abgedunkelt = deutlich unter dem Ausgangswert (oder praktisch schwarz). */
export const isCovered = (value, baseline) => value < Math.max(8, baseline * 0.45);

// ------------------------------------------------------------------ Wasserwaage

/** Abweichung (Grad) der aktuellen Neigung von der Ziel-Neigung. */
export const tiltError = (beta, gamma, target) => Math.hypot(beta - target.beta, gamma - target.gamma);

// ------------------------------------------------------------------ Kugel-Labyrinth

/**
 * Labyrinth per Backtracking, deterministisch aus dem Seed (alle Geräte gleich).
 * walls[r][c] = { n, e, s, w } (true = Wand).
 */
export function makeMaze(seed, cols = 6, rows = 8) {
  const rng = makeRng(`maze:${seed}`);
  const walls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: true, e: true, s: true, w: true })));
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const dirs = [['n', 0, -1, 's'], ['e', 1, 0, 'w'], ['s', 0, 1, 'n'], ['w', -1, 0, 'e']];
  const stack = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const open = dirs.filter(([, dc, dr]) => {
      const nc = c + dc;
      const nr = r + dr;
      return nc >= 0 && nr >= 0 && nc < cols && nr < rows && !seen[nr][nc];
    });
    if (!open.length) { stack.pop(); continue; }
    const [side, dc, dr, opposite] = rng.pick(open);
    walls[r][c][side] = false;
    walls[r + dr][c + dc][opposite] = false;
    seen[r + dr][c + dc] = true;
    stack.push([c + dc, r + dr]);
  }
  return { cols, rows, walls, start: { c: 0, r: 0 }, goal: { c: cols - 1, r: rows - 1 } };
}

export const BALL_R = 0.28; // in Zellen

/**
 * Ein Physik-Schritt: Neigung → Beschleunigung, Reibung, Wände (achsweise).
 * @param ball { x, y, vx, vy } in Zellen (Mitte der Zelle 0/0 = 0.5/0.5)
 * @param tilt { x, y } Neigung (sin) – positiv = nach rechts / unten
 */
export function stepBall(ball, tilt, dt, maze) {
  const ACC = 9;
  const FRICTION = 0.9;
  const MAX = 6;
  let { x, y, vx, vy } = ball;
  vx = Math.max(-MAX, Math.min(MAX, (vx + tilt.x * ACC * dt) * FRICTION ** (dt * 10)));
  vy = Math.max(-MAX, Math.min(MAX, (vy + tilt.y * ACC * dt) * FRICTION ** (dt * 10)));

  const cellsAlong = (p) => {
    const a = Math.floor(p - BALL_R + 0.001);
    const b = Math.floor(p + BALL_R - 0.001);
    return a === b ? [a] : [a, b];
  };
  const wall = (c, r, side) => {
    if (c < 0 || r < 0 || c >= maze.cols || r >= maze.rows) return true;
    return maze.walls[r][c][side];
  };

  // x-Achse
  let nx = x + vx * dt;
  const c = Math.floor(x);
  for (const r of cellsAlong(y)) {
    if (vx > 0 && nx + BALL_R > c + 1 && wall(c, r, 'e')) { nx = c + 1 - BALL_R; vx = -vx * 0.25; }
    if (vx < 0 && nx - BALL_R < c && wall(c, r, 'w')) { nx = c + BALL_R; vx = -vx * 0.25; }
  }
  x = nx;
  // y-Achse
  let ny = y + vy * dt;
  const r0 = Math.floor(y);
  for (const cc of cellsAlong(x)) {
    if (vy > 0 && ny + BALL_R > r0 + 1 && wall(cc, r0, 's')) { ny = r0 + 1 - BALL_R; vy = -vy * 0.25; }
    if (vy < 0 && ny - BALL_R < r0 && wall(cc, r0, 'n')) { ny = r0 + BALL_R; vy = -vy * 0.25; }
  }
  y = ny;
  return { x, y, vx, vy };
}

export const inGoal = (ball, maze) => Math.floor(ball.x) === maze.goal.c && Math.floor(ball.y) === maze.goal.r;
