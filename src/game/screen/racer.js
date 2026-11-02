import { makeRng } from '../../lib/random.js';
import { finishByScore } from './common.js';

/*
 * Party-Rennen aus der Vogelperspektive. Die Strecke ist ein geschlossener Kurs; jedes Auto hat
 * eine Position s entlang der Strecke und eine Spur d (−1 = linker Rand … +1 = rechter Rand).
 * Handys senden nur Tasten: results.{uid}.in = { l, r, b } (links, rechts, Boost gedrückt).
 * Der Hauptbildschirm simuliert 10× pro Sekunde und schreibt die Autos 5× pro Sekunde in sim.cars.
 */

export const RACE = { laps: 3, timeMs: 110000, countMs: 3500, vmax: 230, boostMul: 1.5, steer: 1.7, half: 44, world: { w: 1000, h: 620 } };

/** Kontrollpunkte (geschlossene Schleife) – daraus wird eine glatte Strecke. */
const TRACK_POINTS = [[160, 120], [470, 90], [640, 190], [840, 110], [920, 300], [820, 500], [560, 520], [470, 380], [330, 520], [120, 470], [80, 290]];

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t; const t3 = t2 * t;
  return [0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}

let cached = null;
/** Strecke als Polylinie mit Längen: { pts: [[x,y]…], len: [kumuliert], L } */
export function track() {
  if (cached) return cached;
  const P = TRACK_POINTS; const n = P.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 24; k++) pts.push(catmull(P[(i - 1 + n) % n], P[i], P[(i + 1) % n], P[(i + 2) % n], k / 24));
  }
  const len = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1]; const b = pts[i % pts.length];
    len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  cached = { pts, len, L: len[len.length - 1] };
  return cached;
}

/** Punkt + Richtung auf der Strecke bei Weg s (beliebig groß, wird um die Runde gelegt). */
export function trackAt(s) {
  const { pts, len, L } = track();
  const u = ((s % L) + L) % L;
  let lo = 0; let hi = len.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] <= u) lo = m; else hi = m; }
  const a = pts[lo]; const b = pts[(lo + 1) % pts.length];
  const f = (u - len[lo]) / Math.max(1e-6, len[lo + 1] - len[lo]);
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const dl = Math.hypot(dx, dy) || 1;
  return { x: a[0] + dx * f, y: a[1] + dy * f, tx: dx / dl, ty: dy / dl, nx: -dy / dl, ny: dx / dl };
}

/** Weltposition eines Autos. */
export function carXY(s, d) {
  const p = trackAt(s);
  return { x: p.x + p.nx * d * RACE.half, y: p.y + p.ny * d * RACE.half, angle: Math.atan2(p.ty, p.tx) };
}

/** Hindernisse & Power-ups entlang der Strecke (aus dem Seed). type: oil | cone | boost */
export function raceItems(seed) {
  const rng = makeRng(`race:${seed}`);
  const { L } = track();
  const items = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const s = 220 + (i / n) * (L - 300) + rng.int(-40, 40);
    const type = i % 4 === 3 ? 'boost' : rng.next() < 0.5 ? 'oil' : 'cone';
    items.push({ s: Math.round(s), d: Math.round((rng.next() * 1.4 - 0.7) * 100) / 100, type });
  }
  return items;
}

export const raceCreateState = (rng) => ({ seed: rng.int(1, 999999) });

const inputOf = (round, id) => round.results?.[id]?.in || {};

/** Ein Simulationsschritt für ein Auto. */
export function carStep(c, input, items, dt, t) {
  if (c.fin != null) return c;
  const { L } = track();
  let { s, d, v, boost } = c;
  const steer = (input.r ? 1 : 0) - (input.l ? 1 : 0);
  d = Math.max(-1.3, Math.min(1.3, d + steer * RACE.steer * dt));
  const off = Math.abs(d) > 1;
  let vmax = RACE.vmax * (off ? 0.45 : 1);
  if (input.b && boost > 0) { vmax *= RACE.boostMul; boost = Math.max(0, boost - 0.45 * dt); }
  const spun = c.spinUntil != null && t < c.spinUntil;
  if (spun) vmax *= 0.35;
  v += (vmax - v) * Math.min(1, 1.3 * dt);
  const s2 = s + v * dt;
  let fx = c.fx ?? null; let spinUntil = c.spinUntil ?? null;
  // überfahrene Hindernisse
  for (const it of items) {
    const lapBase = Math.floor(s / L) * L;
    for (const at of [lapBase + it.s, lapBase + L + it.s]) {
      if (at > s && at <= s2 && Math.abs(d - it.d) < 0.38) {
        if (it.type === 'oil') { spinUntil = t + 1.4; fx = { t: 'oil', at: t }; }
        if (it.type === 'cone') { v *= 0.25; fx = { t: 'cone', at: t }; }
        if (it.type === 'boost') { boost = Math.min(1, boost + 0.5); v *= 1.25; fx = { t: 'boost', at: t }; }
      }
    }
  }
  const out = { ...c, s: s2, d, v, boost, fx, spinUntil };
  if (s2 >= RACE.laps * L) out.fin = t;
  return out;
}

export const raceDirector = {
  start(round, now) {
    const cars = round.participants.map((id, i) => ({ id, s: -(i % 2) * 26 - Math.floor(i / 2) * 30, d: i % 2 ? 0.45 : -0.45, v: 0, boost: 0.6, fin: null }));
    return { phase: 'count', startAt: now + RACE.countMs, t: 0, cars };
  },
  tick(sim, round, now) {
    if (sim.phase === 'count') return now >= sim.startAt ? { sim: { ...sim, phase: 'run', t: 0 } } : { sim };
    if (sim.phase !== 'run') return { sim };
    const items = raceItems(round.game.seed);
    const t = (now - sim.startAt) / 1000;
    const dt = Math.min(0.25, Math.max(0, t - sim.t));
    const cars = sim.cars.map((c) => carStep(c, inputOf(round, c.id), items, dt, t));
    const r2 = (v) => Math.round(v * 100) / 100;
    const next = { ...sim, t: r2(t), cars: cars.map((c) => ({ ...c, s: r2(c.s), d: r2(c.d), v: Math.round(c.v), boost: r2(c.boost) })) };
    const allIn = cars.every((c) => c.fin != null);
    if (allIn || t * 1000 >= RACE.timeMs) {
      const final = { ...next, phase: 'done' };
      return { sim: final, done: raceResult(round, final) };
    }
    return { sim: next };
  },
};

/** Reihenfolge: Ziel-Zeit, sonst zurückgelegter Weg. */
export function raceOrder(cars) {
  return [...cars].sort((a, b) => (a.fin ?? Infinity) - (b.fin ?? Infinity) || b.s - a.s);
}

export function raceResult(round, sim) {
  const order = raceOrder(sim.cars).map((c) => c.id);
  return finishByScore(round, (id) => order.indexOf(id), { higher: false, extra: { raceOrder: order } });
}
