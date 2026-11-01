/*
 * Spielfeld-Maps (rein, ohne 3D-Bibliothek): Inseln/Plattformen, Route und Hindernisse.
 * Spiellogik (board.js) und 3D-Darstellung (scene3d.js) nutzen dieselben Feldpositionen.
 *
 * Koordinaten: x/z Boden, y Höhe. Die Maps werden je nach Feldzahl in x/z skaliert (k),
 * damit 90, 120 oder 150 Felder bequem Platz haben.
 */

export const MAP_IDS = ['sky', 'volcano', 'canyon'];
export const MAP_INFO = {
  sky: { id: 'sky', label: 'Himmelsinseln', icon: '☁️' },
  volcano: { id: 'volcano', label: 'Vulkan-Festung', icon: '🌋' },
  canyon: { id: 'canyon', label: 'Kristall-Canyon', icon: '💎' },
};
/** Alte Themen (vor den 3D-Maps) → passende neue Map. */
export const mapIdOf = (theme) => (MAP_INFO[theme] ? theme : 'sky');

const BUMP = { grass: 0.08, stone: 0.02, sand: 0.02, wood: 0.01, step: 0.03 };

/** Höhe der Oberfläche einer Insel an (x, z). */
export function surfaceY(isl, x, z) {
  const t = Math.min(1, Math.hypot(x - isl.x, z - isl.z) / isl.radius);
  return isl.top + (BUMP[isl.style] ?? 0.05) * (1 - t * t) * 1.5 + 0.02;
}

// ------------------------------------------------------------------ Polylinien
export class Polyline {
  constructor(pts) {
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + dist(pts[i - 1], pts[i]));
    this.length = this.cum[this.cum.length - 1];
  }

  /** Punkt & Richtung bei Bogenlänge-Anteil u (0…1). */
  at(u) {
    const d = Math.max(0, Math.min(1, u)) * this.length;
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = this.pts[i - 1]; const b = this.pts[i];
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const t = (d - this.cum[i - 1]) / seg;
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const l = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
    return { p, tan: [(b[0] - a[0]) / l, 0, (b[2] - a[2]) / l] };
  }

  slice(u0, u1) {
    const n = Math.max(2, Math.ceil(((u1 - u0) * this.length) / 0.1));
    return new Polyline(Array.from({ length: n + 1 }, (_, i) => this.at(u0 + ((u1 - u0) * i) / n).p));
  }
}
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

/** Catmull-Rom-Kurve durch Punkte → dichte Polylinie. */
export function catmull(pts, step = 0.08) {
  if (pts.length < 2) return new Polyline(pts);
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(dist(p1, p2) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n; const t2 = t * t; const t3 = t2 * t;
      out.push([0, 1, 2].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return new Polyline(out);
}

/** Hängebrücke: leicht durchhängend. */
export function bridgeLine(a, b, sag = 0.3) {
  return new Polyline(Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
  }));
}
export const GAP = [0.4, 0.62]; // Lücke einer kaputten Brücke (Anteil der Brückenlänge)

// ------------------------------------------------------------------ Map-Daten (unskaliert)
/*
 * islands: { x, z, top, radius, depth, style, seed, outline?: ['oct', r] | ['box', a, b, n] }
 * parts:   { path: island, pts: [[x, z] | [x, y, z]] } | { bridge: [[x, z, island], [x, z, island]], sag, broken, stone }
 *          | { ladder | stairs: [[x, z, island], [x, z, island]] }
 * Wege laufen nahtlos: das Ende eines Abschnitts ist der Anfang des nächsten.
 */
const SKY = {
  islands: [
    { x: 0, z: 6, top: 0, radius: 3.6, depth: 6.5, style: 'grass', seed: 1 },
    { x: 7.6, z: 0.6, top: 2.3, radius: 3.0, depth: 5, style: 'grass', seed: 2 },
    { x: -1.4, z: -4.8, top: 4.0, radius: 3.1, depth: 5.2, style: 'grass', seed: 3 },
    { x: 6.2, z: -10.4, top: 7.4, radius: 2.3, depth: 4, style: 'grass', seed: 4 },
  ],
  parts: [
    { path: 0, pts: [[-2.3, 8.2], [0.4, 9.0], [2.6, 7.6], [2.2, 5.2], [0.0, 4.3], [-2.0, 5.2], [-1.4, 6.8], [0.6, 6.6], [2.5, 3.8]] },
    { bridge: [[2.5, 3.8, 0], [5.4, 2.1, 1]], sag: 0.3 },
    { path: 1, pts: [[5.4, 2.1], [7.2, 3.1], [9.4, 2.0], [9.6, -0.2], [7.8, -1.6], [6.0, -0.6], [5.0, -1.4]] },
    { bridge: [[5.0, -1.4, 1], [1.0, -3.4, 2]], sag: 0.25, broken: true },
    { path: 2, pts: [[1.0, -3.4], [-0.8, -2.2], [-3.2, -3.0], [-3.8, -5.2], [-2.0, -7.0], [0.4, -6.6], [0.9, -7.4]] },
    { steps: [[0.9, -7.4, 2], [4.6, -9.2, 3]], count: 6 },
    { path: 3, pts: [[4.6, -9.2], [6.6, -8.4], [7.8, -10.0], [6.8, -11.8], [5.4, -11.6]] },
  ],
  obstacles: [{ kind: 'boulder', at: 0.15 }, { kind: 'duck', at: 0.38 }, { kind: 'boulder', at: 0.66 }],
  camera: { pos: [36, 37, 40], target: [2.4, 2.2, -2.2], fov: 27 },
};

const oct = (r) => ['oct', r];
const VOLCANO = {
  islands: [
    { id: 'front', x: 5.5, z: 5.5, top: 1.2, radius: 2.8 },
    { id: 'fl', x: -4.5, z: 6.5, top: 1.2, radius: 2.4 },
    { id: 'l', x: -9, z: 1.5, top: 1.2, radius: 2.4 },
    { id: 'bl', x: -6.5, z: -6.5, top: 1.2, radius: 2.4 },
    { id: 'r', x: 1.5, z: -9, top: 1.2, radius: 2.4 },
    { id: 'fr', x: 6.5, z: -4.5, top: 1.2, radius: 2.4 },
    { id: 'core', x: 0, z: 0, top: 1.6, radius: 4.6, depth: 2.8, outline: oct(4.6) },
    { id: 'tier', x: 0, z: 0, top: 3.4, radius: 2.8, depth: 1.9, outline: oct(2.8) },
    { id: 'crater', x: 0, z: 0, top: 5.0, radius: 1.3, depth: 1.7 },
  ].map((d, i) => ({ depth: 2.4, style: 'stone', seed: i + 1, ...d })),
  parts: null, // wird unten aus Ringen berechnet
  obstacles: [{ kind: 'boulder', at: 0.2 }, { kind: 'duck', at: 0.57 }, { kind: 'boulder', at: 0.8 }],
  camera: { pos: [31, 36, 33], target: [-1, 1.2, -0.5], fov: 29 },
};
{
  const I = Object.fromEntries(VOLCANO.islands.map((d, i) => [d.id, i]));
  const P = (id) => VOLCANO.islands[I[id]];
  const edge = (a, b, inset = 0.35) => { const A = P(a); const B = P(b); const dx = B.x - A.x; const dz = B.z - A.z; const l = Math.hypot(dx, dz); const r = A.radius - inset; return [A.x + (dx / l) * r, A.z + (dz / l) * r]; };
  const loop = (k, from, to) => {
    const o = P(k); const a = edge(k, from); const b = edge(k, to);
    const m = [(a[0] + b[0]) / 2 - o.x, (a[1] + b[1]) / 2 - o.z]; const l = Math.hypot(...m) || 1;
    const far = [o.x - (m[0] / l) * (o.radius - 0.75), o.z - (m[1] / l) * (o.radius - 0.75)];
    const mid = (p) => [(p[0] + far[0]) / 2 - (o.x - (p[0] + far[0]) / 2) * 0.25, (p[1] + far[1]) / 2 - (o.z - (p[1] + far[1]) / 2) * 0.25];
    return [a, mid(a), far, mid(b), b];
  };
  const br = (a, b, broken = false) => ({ bridge: [[...edge(a, b), I[a]], [...edge(b, a), I[b]]], stone: true, sag: 0.05, broken });
  const coreIn = [3.2, -1.3];
  VOLCANO.parts = [
    { path: I.front, pts: [[6.9, 7.3], [7.7, 5.2], [6.4, 3.7], [4.2, 4.1], [3.7, 5.9], edge('front', 'fl')] },
    br('front', 'fl'),
    { path: I.fl, pts: loop('fl', 'front', 'l') },
    br('fl', 'l'),
    { path: I.l, pts: loop('l', 'fl', 'bl') },
    br('l', 'bl'),
    { path: I.bl, pts: loop('bl', 'l', 'r') },
    br('bl', 'r', true),
    { path: I.r, pts: loop('r', 'bl', 'fr') },
    br('r', 'fr'),
    { path: I.fr, pts: [...loop('fr', 'r', 'core').slice(0, 4), edge('fr', 'core')] },
    { bridge: [[...edge('fr', 'core'), I.fr], [...coreIn, I.core]], stone: true, sag: 0.05 },
    { path: I.core, pts: [coreIn, [3.6, 1.4], [1.6, 3.6], [-1.6, 3.8], [-3.7, 1.4], [-3.5, -1.2]] },
    { stairs: [[-3.5, -1.2, I.core], [-2.25, -1.3, I.tier]] },
    { path: I.tier, pts: [[-2.25, -1.3], [-1.2, -2.25], [1.0, -2.2], [2.2, -0.5], [1.7, 1.6], [0.0, 2.25], [-1.4, 1.5]] },
    { stairs: [[-1.4, 1.5, I.tier], [-0.75, 0.75, I.crater]] },
    { path: I.crater, pts: [[-0.75, 0.75], [-0.85, -0.4], [0.1, -0.95]] },
  ];
}

const box = (a, b, n = 5) => ['box', a, b, n];
const CANYON = {
  islands: [
    { id: 'Ltop', x: 0.5, z: -1.75, top: 9, a: 2.5, b: 2.25 },
    { id: 'Rtop', x: 8.25, z: -6.5, top: 9, a: 2.25, b: 2.5 },
    { id: 'Lmid', x: -1.25, z: 3, top: 6, a: 2.75, b: 2.0 },
    { id: 'Rmid', x: 11, z: -2.25, top: 6, a: 2.0, b: 2.75 },
    { id: 'Llow', x: -2, z: 7.3, top: 3, a: 3, b: 1.8 },
    { id: 'Rlow', x: 13.8, z: 1.75, top: 3, a: 1.8, b: 3.25 },
  ].map((d, i) => ({ ...d, radius: Math.max(d.a, d.b), depth: d.top + 1, style: 'sand', seed: i + 1, outline: box(d.a, d.b) }))
    .concat([{ id: 'dock', x: 6.5, z: 10, top: 0.6, radius: 2.5, depth: 1.6, style: 'wood', seed: 9, outline: box(2.5, 2.0, 4) }]),
  parts: null,
  obstacles: [{ kind: 'boulder', at: 0.2 }, { kind: 'duck', at: 0.37 }, { kind: 'boulder', at: 0.85 }],
  camera: { pos: [33, 33, 38], target: [4.4, 3.0, 1.6], fov: 30 },
};
{
  const I = Object.fromEntries(CANYON.islands.map((d, i) => [d.id, i]));
  CANYON.parts = [
    { path: I.dock, pts: [[8.2, 11.2], [6.3, 11.4], [4.9, 10.4], [4.6, 9.0]] },
    { bridge: [[4.6, 9.0, I.dock], [0.6, 8.0, I.Llow]], sag: 0.15 },
    { path: I.Llow, pts: [[0.6, 8.0], [-1.6, 8.5], [-4.0, 7.9], [-3.6, 6.4], [-1.2, 6.4], [0.3, 6.0]] },
    { ladder: [[0.3, 6.0, I.Llow], [0.7, 4.4, I.Lmid]] },
    { path: I.Lmid, pts: [[0.7, 4.4], [-1.4, 4.4], [-3.3, 3.6], [-2.8, 2.0], [-0.6, 1.8], [0.9, 1.6]] },
    { ladder: [[0.9, 1.6, I.Lmid], [1.6, -0.2, I.Ltop]] },
    { path: I.Ltop, pts: [[1.6, -0.2], [-0.4, -0.6], [-1.2, -2.2], [0.4, -3.3], [2.0, -2.6], [2.7, -1.7]] },
    { bridge: [[2.7, -1.7, I.Ltop], [6.3, -5.0, I.Rtop]], sag: 0.5, broken: true },
    { path: I.Rtop, pts: [[6.3, -5.0], [6.6, -6.8], [8.4, -8.1], [9.9, -6.2], [8.8, -4.4]] },
    { ladder: [[8.8, -4.4, I.Rtop], [9.8, -1.1, I.Rmid]] },
    { path: I.Rmid, pts: [[9.8, -1.1], [9.6, -3.4], [11.4, -4.6], [12.4, -2.2], [11.9, -0.1]] },
    { ladder: [[11.9, -0.1, I.Rmid], [12.9, 0.7, I.Rlow]] },
    { path: I.Rlow, pts: [[12.9, 0.7], [14.6, 0.6], [14.8, 2.8], [13.4, 4.2]] },
  ];
}

const DEFS = { sky: SKY, volcano: VOLCANO, canyon: CANYON };

// ------------------------------------------------------------------ Aufbau für n Felder
const BASE_SPACING = 0.8;

/** Länge der unskalierten Route (für die Skalierung). */
function rawLength(def) {
  return buildParts(def, 1).reduce((s, p) => s + p.line.length, 0);
}

function scaleIsland(d, k) {
  return { ...d, x: d.x * k, z: d.z * k, radius: d.radius * k, a: d.a && d.a * k, b: d.b && d.b * k, outline: d.outline && (d.outline[0] === 'oct' ? ['oct', d.outline[1] * k] : ['box', d.outline[1] * k, d.outline[2] * k, d.outline[3]]) };
}

function buildParts(def, k) {
  const islands = def.islands.map((d) => scaleIsland(d, k));
  const P = ([x, z, i]) => [x * k, surfaceY(islands[i], x * k, z * k), z * k];
  const parts = def.parts.map((part) => {
    if (part.path != null) {
      const isl = islands[part.path];
      const pts = part.pts.map((q) => (q.length === 3 ? [q[0] * k, q[1], q[2] * k] : [q[0] * k, surfaceY(isl, q[0] * k, q[1] * k), q[1] * k]));
      return { type: 'path', island: part.path, line: catmull(pts) };
    }
    if (part.bridge) {
      const a = P(part.bridge[0]); const b = P(part.bridge[1]);
      return { type: 'bridge', a, b, sag: part.sag ?? 0.3, broken: !!part.broken, stone: !!part.stone, line: bridgeLine(a, b, part.sag ?? 0.3) };
    }
    if (part.ladder || part.stairs) {
      const [a0, b0] = part.ladder || part.stairs;
      const a = P(a0); const b = P(b0);
      return { type: part.ladder ? 'ladder' : 'stairs', a, b, line: new Polyline([a, b]) };
    }
    if (part.steps) {
      // schwebende Trittsteine zwischen zwei Inseln
      const a = P(part.steps[0]); const b = P(part.steps[1]);
      const stones = [];
      for (let i = 1; i <= part.count; i++) {
        const t = i / (part.count + 1);
        stones.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 0.4, a[2] + (b[2] - a[2]) * t]);
      }
      return { type: 'steps', a, b, stones, line: catmull([a, ...stones.map((s) => [s[0], s[1] + 0.03, s[2]]), b]) };
    }
    throw new Error('unbekannter Abschnitt');
  });
  return Object.assign(parts, { islands });
}

/**
 * Komplette Map für n Felder: skalierte Inseln, Abschnitte, Feldpositionen,
 * Sprung-Felder (vor Brückenlücken) und Hindernis-Felder.
 */
export function buildMap(mapId, n) {
  const def = DEFS[mapIdOf(mapId)];
  const base = rawLength(def);
  const ratio = ((n - 1) * BASE_SPACING) / base;
  const k = Math.max(1, Math.sqrt(ratio));
  const parts = buildParts(def, k);
  // Gruppen: zusammenhängende Wegstücke, getrennt durch Brückenlücken
  const groups = [[]];
  parts.forEach((p, pi) => {
    if (p.type === 'bridge' && p.broken) {
      groups[groups.length - 1].push({ line: p.line.slice(0, GAP[0]), part: pi });
      groups.push([{ line: p.line.slice(GAP[1], 1), part: pi }]);
    } else groups[groups.length - 1].push({ line: p.line, part: pi });
  });
  const lens = groups.map((g) => g.reduce((s, x) => s + x.line.length, 0));
  const total = lens.reduce((a, b) => a + b, 0);
  const counts = lens.map((l) => Math.max(2, Math.round((n * l) / total)));
  let diff = n - counts.reduce((a, b) => a + b, 0);
  while (diff !== 0) { const i = lens.indexOf(Math.max(...lens)); counts[i] += Math.sign(diff); diff -= Math.sign(diff); }
  const fields = []; const jumps = [];
  groups.forEach((g, gi) => {
    const L = lens[gi]; const c = counts[gi];
    for (let j = 0; j < c; j++) {
      let d = (j / (c - 1)) * L; let s = 0;
      for (const seg of g) {
        if (d <= seg.line.length + 1e-6 || seg === g[g.length - 1]) {
          const { p, tan } = seg.line.at(seg.line.length ? Math.min(1, d / seg.line.length) : 0);
          fields.push({ p, tan, part: seg.part });
          break;
        }
        d -= seg.line.length; s += 1;
      }
    }
    if (gi < groups.length - 1) jumps.push(fields.length - 1);
  });
  // Hindernisse: auf Inselwegen, mit Abstand zu Start, Ziel, Sprüngen und untereinander
  const taken = [...jumps];
  const obstacles = {};
  for (const o of def.obstacles) {
    const want = Math.round(o.at * (n - 1));
    for (let off = 0; off < n; off++) {
      const cands = [want + off, want - off];
      const hit = cands.find((i) => i > 4 && i < n - 5 && parts[fields[i].part].type === 'path' && taken.every((t) => Math.abs(t - i) >= 13));
      if (hit != null) { obstacles[hit] = o.kind; taken.push(hit); break; }
    }
  }
  const camera = { pos: def.camera.pos.map((v, i) => (i === 1 ? v * Math.sqrt(k) : v * k)), target: def.camera.target.map((v, i) => (i === 1 ? v : v * k)), fov: def.camera.fov };
  return { id: mapIdOf(mapId), k, islands: parts.islands, parts: [...parts], fields, jumps, obstacles, camera, spacing: total / (n - 1) };
}
