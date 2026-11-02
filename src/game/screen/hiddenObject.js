import { makeRng } from '../../lib/random.js';
import { finishByScore, earliest } from './common.js';

/*
 * Wimmelbild-Rennen: Ein riesiges Bild voller (teils absurder) Figuren – z. B. ein Pinguin mit Krone.
 * Gesucht wird nacheinander eine Figur, die es genau einmal gibt. Das Bild wird aus dem Seed auf
 * jedem Gerät identisch erzeugt; am Handy kann man zoomen & verschieben und tippt die Figur an.
 * Eingabe: results.{uid}.hit = { k, at: Serverzeit } (nur richtige Treffer; falsch = 2 s Sperre am Handy)
 */

export const HIDDEN = { w: 1600, h: 1000, targets: 5, findMs: 40000, revealMs: 3500, graceMs: 350, penaltyMs: 2000 };

const CREATURES = ['🐧', '🦒', '🐘', '🦊', '🐸', '🐙', '🦄', '🐢', '🦀', '🐌', '🐝', '🦜', '🐄', '🐷', '🐒', '🦔', '🐳', '🦩', '🐨', '🦥', '🐿️', '🦦', '🐓', '🦕'];
const THINGS = ['🌵', '🌳', '🍄', '🎈', '🚲', '🛶', '⛱️', '🎪', '🏠', '🚗', '🛸', '🍦', '🌻', '🪁', '🎸', '🧸'];
const ACCESSORIES = [
  { e: '🎩', de: 'mit Zylinder', en: 'with a top hat' },
  { e: '👑', de: 'mit Krone', en: 'with a crown' },
  { e: '🕶️', de: 'mit Sonnenbrille', en: 'with sunglasses' },
  { e: '🎀', de: 'mit Schleife', en: 'with a bow' },
  { e: '⛑️', de: 'mit Helm', en: 'with a helmet' },
  { e: '🎧', de: 'mit Kopfhörern', en: 'with headphones' },
];
export const ACCESSORY = Object.fromEntries(ACCESSORIES.map((a) => [a.e, a]));

export const hiddenCreateState = (rng) => ({ seed: rng.int(1, 999999) });

const sceneCache = new Map();
/**
 * Szene: { objects: [{ e, acc, x, y, size, rot }], targets: [objektIndex…], zones: [...] }
 * Die Zielfiguren sind Kombinationen (Tier + Accessoire), die es genau einmal gibt.
 */
export function makeScene(seed) {
  if (sceneCache.has(seed)) return sceneCache.get(seed);
  const rng = makeRng(`hidden:${seed}`);
  const cols = 22; const rows = 13;
  const cw = HIDDEN.w / cols; const ch = HIDDEN.h / rows;
  const objects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng.next() < 0.12) continue; // ein paar Lücken
      const creature = rng.next() < 0.72;
      const e = creature ? rng.pick(CREATURES) : rng.pick(THINGS);
      const acc = creature && rng.next() < 0.38 ? rng.pick(ACCESSORIES).e : null;
      objects.push({
        e, acc,
        x: Math.round(c * cw + cw * (0.2 + rng.next() * 0.6)),
        y: Math.round(r * ch + ch * (0.2 + rng.next() * 0.6)),
        size: Math.round(36 + rng.next() * 26),
        rot: Math.round((rng.next() - 0.5) * 40),
      });
    }
  }
  // Ziele: Tier + Accessoire genau einmal (Doppelte bekommen ein anderes Accessoire bzw. keins)
  const key = (o) => `${o.e}|${o.acc}`;
  const targets = [];
  const order = rng.shuffle(objects.map((_, i) => i)).filter((i) => objects[i].acc);
  for (const i of order) {
    if (targets.length >= HIDDEN.targets) break;
    if (!objects[i].acc) continue; // Accessoire wurde als Doppel eines früheren Ziels entfernt
    const k = key(objects[i]);
    if (targets.some((t) => key(objects[t]) === k)) continue;
    objects.forEach((o, j) => { if (j !== i && key(o) === k) o.acc = null; });
    targets.push(i);
  }
  // Hintergrund-Zonen (Wiese, Teich, Sand) für die Optik
  const zones = Array.from({ length: 7 }, (_, i) => ({
    x: Math.round(rng.next() * HIDDEN.w), y: Math.round(rng.next() * HIDDEN.h), r: Math.round(120 + rng.next() * 160), kind: ['pond', 'sand', 'flowers'][i % 3],
  }));
  const scene = { objects, targets, zones };
  sceneCache.set(seed, scene);
  return scene;
}

/** Welche Figur liegt bei (x, y)? (oberste/nächste innerhalb ihrer Größe) */
export function objectAt(scene, x, y) {
  let best = -1; let bd = Infinity;
  scene.objects.forEach((o, i) => {
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < o.size * 0.62 && d < bd) { bd = d; best = i; }
  });
  return best;
}

export const hiddenDirector = {
  start(round, now) { return { phase: 'find', k: 0, scores: {}, found: [], firstAt: null, endsAt: now + HIDDEN.findMs }; },
  tick(sim, round, now) {
    if (sim.phase === 'find') {
      const first = earliest(round, round.participants, (r) => (r?.hit?.k === sim.k ? r.hit.at : null));
      if (first) {
        if (sim.firstAt == null) return { sim: { ...sim, firstAt: now } };
        if (now - sim.firstAt < HIDDEN.graceMs) return { sim };
        return { sim: { ...sim, phase: 'reveal', firstAt: null, found: [...sim.found, first.id], scores: { ...sim.scores, [first.id]: (sim.scores[first.id] ?? 0) + 1 }, endsAt: now + HIDDEN.revealMs } };
      }
      if (now >= sim.endsAt) return { sim: { ...sim, phase: 'reveal', found: [...sim.found, null], endsAt: now + HIDDEN.revealMs } };
      return { sim };
    }
    if (sim.phase === 'reveal') {
      if (now < sim.endsAt) return { sim };
      const total = makeScene(round.game.seed).targets.length;
      if (sim.k + 1 >= total) {
        const final = { ...sim, phase: 'done' };
        return { sim: final, done: finishByScore(round, (id) => final.scores[id] ?? 0, { extra: { scores: final.scores } }) };
      }
      return { sim: { ...sim, phase: 'find', k: sim.k + 1, endsAt: now + HIDDEN.findMs } };
    }
    return { sim };
  },
};
