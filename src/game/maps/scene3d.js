import {
  THREE, stage, gradientBg, island, fromPolyline, pathStrip, fieldDisc, sign, FIELD, ropeBridge, stairs, ladder,
  tree, pine, bush, rock, boulderBlock, duckGate, lighthouse, house, cloud, lavaSea, waterSea, castleTower, torch,
  crystal, barrel, waterfall, boat, chest, rng, std, addMesh, iconSprite, canvasTex,
} from './lib3d.js';
import { flock, butterflies, sheepWalk, balloon, windmill, jumpingFish, particles, smoke, lavaBubbles } from './creatures.js';
import { buildMap, surfaceY } from './defs.js';

/*
 * Lebendige 3D-Karte für den Spielfeld-Modus (Three.js). Wird nur im Spielfeld-Modus nachgeladen.
 *
 * createMapScene({ canvas, width, height, mapId, fields }) →
 *   { setPlayers(players, positions, meId), setFocus(fieldIndex|null), setMode('overview'|'follow'), resize(w, h), dispose() }
 */

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ISLAND_LOOK = {
  grass: { grass: '#86CC5E', grass2: '#5EAE48', rock: '#A7A49F', rock2: '#6F6A66', dirt: '#8B6B4E' },
  stone: { grass: '#B6A58D', grass2: '#9E8D76', dirt: '#6E5F50', rock: '#6A5D52', rock2: '#3A322D', shape: 'column', strata: 0.45, tip: 0.9 },
  sand: { grass: '#E3BC84', grass2: '#D2A56C', dirt: '#B9814A', rock: '#C98B55', rock2: '#7E4B2A', shape: 'column', strata: 0.5 },
  wood: { grass: '#B98250', grass2: '#A87240', dirt: '#7C4A1E', rock: '#7C4A1E', rock2: '#5B3417', shape: 'column', strata: 0.18 },
};
const BUMP = { grass: 0.08, stone: 0.02, sand: 0.02, wood: 0.01 };

/** Umriss-Funktion aus defs (Achteck / abgerundetes Rechteck). */
function outlineFn(o) {
  if (!o) return null;
  if (o[0] === 'oct') { const r = o[1]; return (a) => (r * Math.cos(Math.PI / 8)) / Math.cos((((a % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4)) - Math.PI / 8); }
  const [, a, b, n] = o;
  return (ang) => Math.pow(Math.pow(Math.abs(Math.cos(ang) / a), n) + Math.pow(Math.abs(Math.sin(ang) / b), n), -1 / n);
}

// ------------------------------------------------------------------ Welten
const WORLDS = {
  sky: {
    stage: {
      bg: ['#9FD3F5', '#FCE3C0', '#FFD2A6', '#FFF4E6'], fog: ['#FCE6CC', 72, 150],
      sun: [-12, 24, 10], sunColor: '#FFE4C2', sunI: 3.4, hemi: ['#DCEBFF', '#8A7058', 0.85], bloom: 0.2, bloomThreshold: 0.9, exposure: 0.97,
    },
    road: ['#E9D9B8', '#B9A27E'],
    build(ctx) {
      const { scene, map, P, k, anim, isl } = ctx;
      // Wolkenmeer + ziehende Wolken
      const RC = rng(31); const clouds = [];
      for (let i = 0; i < 40; i++) { const x = RC.range(-24, 26) * k; const z = RC.range(-28, 20) * k; if (x + z > 22 * k) continue; cloud(scene, V(x, RC.range(-12, -9.5), z), { size: RC.range(1.6, 3.0), seed: 100 + i }); }
      [[-12, -4, -2, 2.0], [-3, 9, -18, 1.5], [16, 7, -16, 1.3], [-12, 4, -8, 1.0], [12, -3, -12, 1.6], [20, 10, 2, 1.4]].forEach(([x, y, z, s], i) => clouds.push({ m: cloud(scene, V(x * k, y, z * k), { size: s, seed: i + 1 }), x: x * k, sp: 0.25 + i * 0.07 }));
      anim((t) => clouds.forEach((c) => { c.m.position.x = c.x + ((t * c.sp) % 40) - 20; }));
      // schwebende Mini-Inseln (wippen)
      const R = rng(9); const floaters = [];
      for (let i = 0; i < 16; i++) {
        const x = R.range(-9, 15) * k; const z = R.range(-16, 10) * k;
        if (x + z > 3 * k || map.islands.some((d) => Math.hypot(x - d.x, z - d.z) < d.radius + 1.6)) continue;
        const m = island(scene, { ...ISLAND_LOOK.grass, x: 0, z: 0, top: 0, radius: R.range(0.35, 0.7), depth: R.range(0.8, 1.6), seed: 20 + i, strata: 0 });
        const y = R.range(-1, 8); m.position.set(x, y, z); floaters.push({ m, y, ph: R.range(0, 6) });
      }
      anim((t) => floaters.forEach((f) => { f.m.position.y = f.y + Math.sin(t * 0.6 + f.ph) * 0.25; }));
      // Gebäude & Natur
      const lh = lighthouse(scene, P(3, 6.6, -10.2), { h: 2.6 });
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#FFF3C4', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.geometry.translate(0, -3, 0); beam.rotation.z = Math.PI / 2; const piv = new THREE.Group(); piv.position.set(lh.position.x, lh.position.y + 2.86, lh.position.z); piv.add(beam); scene.add(piv);
      anim((t) => { piv.rotation.y = t * 0.8; });
      house(scene, P(0, -2.4, 3.6), { roof: '#E2683C', rot: 0.5 });
      house(scene, P(1, 9.3, 0.8), { roof: '#7C5CE0', rot: -0.4, size: 0.85 });
      house(scene, P(2, -2.4, -4.8), { roof: '#2F7DF6', rot: 0.9, size: 0.9 });
      anim(windmill(scene, P(1, 7.5, 0.7), { size: 0.75 }));
      [[0, -3.1, 7.0, 1.0, 1], [0, 3.0, 6.4, 0.85, 2], [0, 1.1, 2.9, 0.9, 3], [2, -4.0, -4.0, 0.95, 5], [2, 0.6, -4.8, 0.8, 6], [0, -3.3, 4.6, 0.7, 7], [2, -3.6, -6.6, 0.7, 8]]
        .forEach(([i, x, z, s, sd]) => tree(scene, P(i, x, z), { size: s, seed: sd, leaf: sd % 2 ? '#56A846' : '#6DB84E' }));
      [[0, -0.6, 8.0, 0.8], [1, 6.2, 2.6, 0.75], [2, 1.4, -4.6, 0.8], [3, 4.6, -11.0, 0.7], [3, 7.6, -8.8, 0.6], [0, 3.3, 8.6, 0.6]].forEach(([i, x, z, s]) => pine(scene, P(i, x, z), { size: s }));
      const flowers = [[0, -2.6, 6.2, '#F472B6'], [0, 1.7, 8.8, '#FACC15'], [1, 9.8, 1.2, '#F9FAFB'], [2, -1.6, -7.2, '#F472B6'], [1, 6.6, -2.0, null], [2, -0.2, -2.0, '#FACC15'], [0, 2.9, 4.4, '#A78BFA'], [3, 5.0, -10.4, '#F472B6']];
      flowers.forEach(([i, x, z, f]) => bush(scene, P(i, x, z), { flowers: f, size: 0.28 }));
      [[0, 3.1, 4.6], [1, 5.6, 0.4], [2, -2.9, -6.4]].forEach(([i, x, z], j) => rock(scene, P(i, x, z), { size: 0.22, seed: j + 2, color: '#A39C94' }));
      // Leben: Schafe, Schmetterlinge, Vögel, Ballon
      const sur = (i) => (x, z) => surfaceY(isl[i], x, z);
      anim(sheepWalk(scene, { center: P(0, -0.6, 6.2), radius: 0.9 * k, speed: 0.3, surface: sur(0), seed: 1 }));
      anim(sheepWalk(scene, { center: P(2, -1.2, -4.6), radius: 0.7 * k, speed: 0.25, surface: sur(2), seed: 4, scale: 0.85 }));
      anim(butterflies(scene, { centers: flowers.map(([i, x, z]) => P(i, x, z)) }));
      anim(flock(scene, { center: V(3 * k, 0, -2 * k), radius: 11 * k, height: 9, speed: 0.16, count: 5, seed: 1 }));
      anim(flock(scene, { center: V(-2 * k, 0, 4 * k), radius: 7 * k, height: 5, speed: -0.22, count: 3, seed: 2, color: '#FDE68A' }));
      anim(balloon(scene, { center: V(-4 * k, 0, -8 * k), radius: 9 * k, height: 10, speed: 0.035 }));
    },
  },

  volcano: {
    stage: {
      bg: ['#12060A', '#3A0D08', '#7A1E0A'], fog: ['#4A1208', 60, 120],
      sun: [-14, 26, 8], sunColor: '#FFD8B5', sunI: 2.2, hemi: ['#5E5470', '#C2410C', 0.7], bloom: 0.55, bloomThreshold: 0.97, exposure: 0.92,
    },
    road: ['#E8DCC6', '#8F8273'],
    build(ctx) {
      const { scene, map, k, anim, isl } = ctx;
      const lava = lavaSea(scene, { y: -0.35 });
      anim((t) => { lava.material.map.offset.set(t * 0.004, t * 0.002); lava.material.emissiveIntensity = 0.95 + Math.sin(t * 0.8) * 0.08; });
      const crater = isl[8];
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), new THREE.MeshStandardMaterial({ color: '#FF7A1A', emissive: '#FF6A00', emissiveIntensity: 1.3 }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(crater.x + 0.35, crater.top + 0.08, crater.z + 0.35); scene.add(pool);
      const glow = new THREE.PointLight('#FF7A1A', 2.5, 5, 1.8); glow.position.set(crater.x + 0.3, crater.top + 1.2, crater.z + 0.3); scene.add(glow);
      anim((t) => { pool.material.emissiveIntensity = 1.2 + Math.sin(t * 2.3) * 0.25; glow.intensity = 2.3 + Math.sin(t * 3.1) * 0.5; });
      anim(smoke(scene, { at: V(crater.x + 0.3, crater.top + 0.3, crater.z + 0.3) }));
      const Q = (i, dx, dz) => { const d = isl[i]; return V(d.x + dx, surfaceY(d, d.x + dx, d.z + dz), d.z + dz); };
      const flags = [];
      [[3, -0.9, -0.9], [2, -1.3, 0.2], [4, 0.2, -1.3], [5, 1.2, -0.4], [1, -0.6, 1.2]].forEach(([i, dx, dz]) => flags.push(castleTower(scene, Q(i, dx * k, dz * k), { h: 2.4, r: 0.62 })));
      flags.push(castleTower(scene, Q(6, -2.6 * k, -2.6 * k), { h: 3.6, r: 0.8 }));
      anim((t) => flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 0.9 + i) * 0.05; }));
      const torches = [];
      [[0, 1, 1], [0, -1.4, 1.3], [1, 1.3, 0.9], [2, 0.9, 1.3], [4, 1.3, 0.9], [5, 0.9, 1.3], [3, 1.3, 0.9]].forEach(([i, dx, dz]) => torches.push(torch(scene, Q(i, dx * 1.45 * k, dz * 1.45 * k))));
      [[2.6, 2.6], [-2.6, 2.9], [3.4, -2.4]].forEach(([x, z]) => torches.push(torch(scene, Q(6, x * k, z * k))));
      anim((t) => torches.forEach((tc, i) => { const f = 0.8 + Math.abs(Math.sin(t * 9 + i * 2.1)) * 0.25 + Math.sin(t * 23 + i) * 0.05; tc.userData.flame.scale.setScalar(f); if (tc.userData.light) tc.userData.light.intensity = 1.8 + f; }));
      const R = rng(5); const spots = [];
      for (let i = 0; i < 26; i++) { const x = R.range(-17, 15) * k; const z = R.range(-17, 15) * k; if (Math.hypot(x, z) < 12 * k) continue; if (i % 2) rock(scene, V(x, -0.6, z), { size: R.range(0.4, 1.3), color: '#2A2522', seed: i }); else spots.push(V(x, 0, z)); }
      anim(lavaBubbles(scene, { spots }));
      anim(particles(scene, { count: 160, area: [[-16 * k, 14 * k], [-0.2, 9], [-16 * k, 14 * k]], color: '#FFB347', size: 0.28, rise: 0.7, wander: 0.5, seed: 3 }));
      anim(flock(scene, { center: V(0, 0, 0), radius: 9 * k, height: 7, speed: 0.3, count: 4, bat: true, color: '#1F1A24', seed: 5 }));
      anim(flock(scene, { center: V(-2 * k, 0, 3 * k), radius: 5 * k, height: 5.5, speed: -0.42, count: 3, bat: true, color: '#1F1A24', seed: 6 }));
      void map;
    },
  },

  canyon: {
    stage: {
      bg: ['#0F0B0A', '#2B1D16', '#0F4C5C'], fog: ['#1E2A2E', 62, 125],
      sun: [-6, 30, -4], sunColor: '#FFE7C4', sunI: 3.0, hemi: ['#BFE6FF', '#5A3A24', 0.75], bloom: 0.5, bloomThreshold: 0.92, exposure: 0.98,
    },
    road: ['#F3E2C2', '#A87A4E'],
    build(ctx) {
      const { scene, P, k, anim, isl } = ctx;
      const water = waterSea(scene, { y: 0, color: '#0E6F86' });
      anim((t) => { water.material.bumpMap.offset.set(t * 0.01, t * 0.006); });
      // Höhlenwände
      [[-9, -9, 15, 5], [2, -15, 16, 6], [14, -14, 15, 5], [-12, 2, 12, 4], [20, -6, 13, 4]].forEach(([x, z, h, r], i) => island(scene, { ...ISLAND_LOOK.sand, rock: '#6B4630', rock2: '#3A2418', grass: '#5A3D2A', grass2: '#4A3222', x: x * k, z: z * k, top: h, depth: h + 2, radius: r * k, seed: 30 + i, strata: 0.7 }));
      // Wasserfall kommt aus einer Felswand mit Fluss obendrauf (nicht aus der Luft)
      const fx = 4.6 * k; const fz = -7.6 * k;
      island(scene, { ...ISLAND_LOOK.sand, x: fx, z: fz, top: 11.5, depth: 12.5, radius: 2.3 * k, outline: outlineFn(['box', 1.6 * k, 2.3 * k, 5]), seed: 50 });
      const river = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.2 * k), new THREE.MeshStandardMaterial({ color: '#38BDF8', emissive: '#0EA5E9', emissiveIntensity: 0.25, roughness: 0.15 }));
      river.rotation.x = -Math.PI / 2; river.position.set(fx, 11.55, fz - 0.2 * k); scene.add(river);
      const wf = waterfall(scene, V(fx, 11.5, fz + 2.1 * k), V(fx, 0.1, fz + 2.6 * k), { width: 1.7 });
      anim((t) => { wf.tex.offset.y = -t * 0.6; wf.foam.forEach((f, i) => f.scale.setScalar(0.9 + Math.sin(t * 4 + i) * 0.12)); });
      const bt = boat(scene, V(3.0 * k, -0.12, 12.8 * k), { rot: 0.8 });
      anim((t) => { bt.position.y = -0.12 + Math.sin(t * 1.2) * 0.06; bt.rotation.z = Math.sin(t * 0.9) * 0.04; bt.rotation.x = Math.sin(t * 0.7) * 0.03; });
      const lastI = isl.length - 2; // Rlow
      chest(scene, P(5, 14.6, 4.4), { rot: -0.6 });
      const crystals = [];
      [[0, -1.4, -3.4, '#F0ABFC', 1.2], [0, 2.4, -3.6, '#93C5FD', 1.0], [1, 9.9, -8.2, '#93C5FD', 1.3], [2, -3.4, 1.8, '#C4B5FD', 0.9], [3, 12.4, -4.6, '#F0ABFC', 1.0], [4, -4.4, 6.4, '#93C5FD', 0.8], [5, 12.7, 3.6, '#C4B5FD', 0.8], [3, 9.5, -4.8, '#93C5FD', 0.6]]
        .forEach(([i, x, z, c, sz], j) => crystals.push(crystal(scene, P(i, x, z), { color: c, size: sz, seed: j + 1 })));
      anim((t) => crystals.forEach((c, i) => { const v = 0.45 + Math.sin(t * 1.6 + i * 1.3) * 0.2; c.userData.mat.emissiveIntensity = v; c.userData.light.intensity = 0.8 + v; }));
      [[0, 2.6, -0.4], [2, 0.6, 4.4], [5, 14.8, -0.8]].forEach(([i, x, z], j) => { barrel(scene, P(i, x, z), { rot: j }); barrel(scene, P(i, x + 0.4, z + 0.1), { rot: j + 1 }); });
      const torches = [[3, 9.6, -4.5], [4, 0.9, 8.6], [1, 6.4, -7.6]].map(([i, x, z]) => torch(scene, P(i, x, z)));
      anim((t) => torches.forEach((tc, i) => { const f = 0.85 + Math.abs(Math.sin(t * 9 + i * 2)) * 0.2; tc.userData.flame.scale.setScalar(f); tc.userData.light.intensity = 1.8 + f; }));
      const R = rng(3); const fishSpots = [];
      for (let i = 0; i < 22; i++) {
        const x = R.range(-8, 20) * k; const z = R.range(-4, 18) * k;
        if (isl.some((d) => Math.hypot(x - d.x, z - d.z) < d.radius + 1.2)) continue;
        if (i % 3) rock(scene, V(x, -0.3, z), { size: R.range(0.3, 0.9), color: '#8A5A36', seed: i }); else fishSpots.push(V(x, 0, z));
      }
      anim(jumpingFish(scene, { spots: fishSpots, seed: 4 }));
      anim(particles(scene, { count: 60, area: [[-6 * k, 18 * k], [1, 10], [-8 * k, 14 * k]], color: '#C4F1F9', size: 0.22, rise: 0, wander: 0.8, seed: 8 }));
      anim(flock(scene, { center: V(6 * k, 0, 0), radius: 9 * k, height: 12, speed: 0.2, count: 4, seed: 9, color: '#F1F5F9' }));
      void lastI;
    },
  },
};

// ------------------------------------------------------------------ Figuren
function makeToken(p, { me = false } = {}) {
  const g = new THREE.Group();
  const c = p.color || '#3B82F6';
  addMesh(g, new THREE.CylinderGeometry(0.2, 0.26, 0.14, 24), std({ color: c, roughness: 0.35 })).position.y = 0.07;
  addMesh(g, new THREE.CylinderGeometry(0.12, 0.2, 0.36, 24), std({ color: c, roughness: 0.35 })).position.y = 0.32;
  addMesh(g, new THREE.SphereGeometry(0.26, 24, 16), std({ color: '#ffffff', roughness: 0.4 })).position.y = 0.72;
  const s = iconSprite(p.avatar || '🙂', null, 0.48); s.position.y = 0.74; s.material.depthTest = false; s.renderOrder = 20; g.add(s);
  if (me) {
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 32), new THREE.MeshBasicMaterial({ color: '#FACC15', transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.03; g.add(halo); g.userData.halo = halo;
    const tex = canvasTex(256, 128, (x) => { x.fillStyle = '#FACC15'; x.beginPath(); x.roundRect(8, 8, 240, 112, 56); x.fill(); x.font = '900 72px Outfit, sans-serif'; x.fillStyle = '#1f2937'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DU', 128, 68); });
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }));
    lab.scale.set(0.5, 0.25, 1); lab.position.y = 1.25; lab.renderOrder = 21; g.add(lab);
  }
  g.scale.setScalar(1.35);
  return g;
}

// ------------------------------------------------------------------ Szene
export function createMapScene({ canvas, width, height, mapId, fields, pixelRatio = Math.min(2, window.devicePixelRatio || 1), lowPower = false }) {
  const map = buildMap(mapId, fields.length);
  const world = WORLDS[map.id];
  const st = world.stage;
  const S = stage({
    canvas, width, height, pixelRatio: lowPower ? Math.min(pixelRatio, 1.5) : pixelRatio,
    bg: gradientBg(st.bg.map((c, i) => [i / (st.bg.length - 1), c])),
    fog: new THREE.Fog(st.fog[0], st.fog[1] * map.k, st.fog[2] * map.k),
    sun: st.sun.map((v) => v * map.k), sunColor: st.sunColor, sunI: st.sunI, hemi: st.hemi,
    bloom: lowPower ? 0 : st.bloom, bloomThreshold: st.bloomThreshold, exposure: st.exposure,
    camPos: map.camera.pos, target: map.camera.target, fov: map.camera.fov, shadowSize: lowPower ? 1024 : 2048,
  });
  const { scene, camera } = S;
  const k = map.k;
  const isl = map.islands;
  const updates = [];
  const anim = (fn) => updates.push(fn);
  const P = (i, x, z) => V(x * k, surfaceY(isl[i], x * k, z * k), z * k);

  // Inseln
  isl.forEach((d) => island(scene, { ...ISLAND_LOOK[d.style], x: d.x, z: d.z, top: d.top, radius: d.radius, depth: d.depth, seed: d.seed, outline: outlineFn(d.outline), bump: BUMP[d.style] }));

  // Weg-Abschnitte
  const [roadC, roadE] = world.road;
  const gapPlanksByPart = {};
  map.parts.forEach((part, i) => {
    if (part.type === 'path') pathStrip(scene, fromPolyline(part.line), { color: roadC, edge: roadE, seed: i + 3 });
    if (part.type === 'bridge') gapPlanksByPart[i] = ropeBridge(scene, V(...part.a), V(...part.b), { sag: part.sag, broken: part.broken, stone: part.stone, ...(part.stone ? { plank: '#6B625A' } : {}) }).gapPlanks;
    if (part.type === 'stairs') stairs(scene, V(...part.a), V(...part.b), { color: '#C2B39B', steps: 8 });
    if (part.type === 'ladder') ladder(scene, V(...part.a), V(...part.b));
    if (part.type === 'steps') {
      part.stones.forEach((q, j) => island(scene, { ...ISLAND_LOOK.grass, grass: '#9BD27A', grass2: '#86C266', rock: '#B4AFA8', rock2: '#827C76', x: q[0], z: q[2], top: q[1] - 0.05, radius: 0.5, depth: 0.55, seed: 40 + j, strata: 0, tip: 0.55 }));
      pathStrip(scene, fromPolyline(part.line), { color: roadC, edge: roadE, seed: i + 3 });
    }
  });

  // Felder (Hindernisse ohne Schild – sie zeigen sich erst, wenn man dort ankommt).
  // Pro Feld merken, was weg kann: benutzte Sonderfelder & bewältigte Hindernisse verschwinden.
  const fieldScale = Math.min(1, map.spacing / 0.8);
  const fieldPos = map.fields.map((f) => V(...f.p));
  const fieldObjs = [];
  map.fields.forEach((f, i) => {
    const type = fields[i] ?? 'normal';
    const p = fieldPos[i]; const tan = V(...f.tan);
    const side = V(-tan.z, 0, tan.x).normalize();
    const o = { type, extra: [] };
    fieldObjs[i] = o;
    if (type === 'boulder') { o.disc = fieldDisc(scene, p, 'normal', fieldScale); o.extra.push(boulderBlock(scene, p.clone().addScaledVector(tan, 0.05), tan)); return; }
    if (type === 'duck') { o.disc = fieldDisc(scene, p, 'normal', fieldScale); o.extra.push(duckGate(scene, p, tan)); return; }
    if (type === 'jump') { o.disc = fieldDisc(scene, p, 'normal', fieldScale); o.planks = gapPlanksByPart[f.part] || []; return; }
    const info = FIELD[type] ?? FIELD.normal;
    o.disc = fieldDisc(scene, p, FIELD[type] ? type : 'normal', fieldScale);
    if (type !== 'normal' && info.icon) {
      o.extra.push(sign(scene, p.clone().addScaledVector(side, 0.62 * Math.max(0.8, fieldScale)), { icon: info.icon, color: info.ring ?? info.c, height: type === 'goal' || type === 'start' ? 1.25 : 0.95, size: type === 'goal' ? 0.95 : 0.72 }));
    }
  });
  const removing = [];
  const clearedSet = new Set();
  function setCleared(list) {
    const now = performance.now();
    for (const i of list || []) {
      const o = fieldObjs[i];
      if (!o || clearedSet.has(i) || o.type === 'normal' || o.type === 'start' || o.type === 'goal') continue;
      clearedSet.add(i);
      // weg-schrumpfen (Fels zerbröselt, Balken & Schild verschwinden), Feld wird normal
      o.extra.forEach((g) => removing.push({ g, t0: now, s0: g.scale.clone() }));
      if (o.type !== 'boulder' && o.type !== 'duck' && o.type !== 'jump') {
        const p = o.disc.position.clone(); p.y -= 0.05;
        removing.push({ g: o.disc, t0: now, s0: o.disc.scale.clone() });
        const n = fieldDisc(scene, p, 'normal', fieldScale); n.scale.setScalar(0.01); removing.push({ g: n, t0: now, grow: true });
      }
      (o.planks || []).forEach((m, j) => { m.visible = true; m.scale.setScalar(0.01); removing.push({ g: m, t0: now + j * 70, grow: true }); });
    }
  }
  anim(() => {
    const now = performance.now();
    for (let k2 = removing.length - 1; k2 >= 0; k2--) {
      const r = removing[k2]; const u = Math.min(1, Math.max(0, (now - r.t0) / 600));
      if (r.grow) { r.g.scale.setScalar(Math.max(0.01, u)); if (u >= 1) removing.splice(k2, 1); continue; }
      r.g.scale.copy(r.s0).multiplyScalar(Math.max(0.001, 1 - u));
      r.g.rotation.y += 0.08;
      if (u >= 1) { r.g.visible = false; removing.splice(k2, 1); }
    }
  });

  world.build({ scene, map, P, k, anim, isl });

  // ---------------------------------------------------------------- Figuren
  const tokens = new Map(); // id → { g, to, field, queue, seg }
  const STEP_MS = 330; // etwas länger als ein Animationsschritt (320 ms) → durchgehende Laufbewegung

  let tokenData = [];
  function placeTokens(players, positions, meId) {
    const byField = {};
    players.forEach((p) => { (byField[positions[p.id] ?? 0] ||= []).push(p.id); });
    const now = performance.now();
    players.forEach((p) => {
      let tk = tokens.get(p.id);
      if (!tk) { const g = makeToken(p, { me: p.id === meId }); scene.add(g); tk = { g, field: -1, from: null, to: null, t0: 0 }; tokens.set(p.id, tk); }
      const fi = Math.max(0, Math.min(fieldPos.length - 1, positions[p.id] ?? 0));
      const list = byField[positions[p.id] ?? 0] || [p.id];
      const n = list.length; const idx = list.indexOf(p.id);
      const off = n > 1 ? V(Math.cos((idx / n) * Math.PI * 2) * 0.28 * fieldScale, 0, Math.sin((idx / n) * Math.PI * 2) * 0.28 * fieldScale) : V(0, 0, 0);
      const target = fieldPos[fi].clone().add(off).add(V(0, 0.08, 0));
      if (!tk.to) { tk.g.position.copy(target); tk.to = target; tk.field = fi; tk.queue = []; tk.seg = null; return; }
      if (tk.to.distanceTo(target) > 1e-3) {
        // Schritte in eine Warteschlange: die Figur läuft sie ohne Pause hintereinander ab
        const far = Math.abs(fi - tk.field) > 1;
        tk.queue.push({ to: target, jump: far ? 1.2 : 0.3, dur: far ? 650 : STEP_MS });
        tk.to = target; tk.field = fi;
      }
    });
    for (const [id, tk] of tokens) if (!players.some((p) => p.id === id)) { scene.remove(tk.g); tokens.delete(id); }
    tokenData = players;
  }
  anim((t) => {
    const now = performance.now();
    for (const tk of tokens.values()) {
      if (!tk.to) continue;
      // nächstes Teilstück starten – nahtlos am Ende des vorigen
      while (tk.queue.length && (!tk.seg || now - tk.seg.t0 >= tk.seg.dur)) {
        const next = tk.queue.shift();
        const from = tk.seg ? tk.seg.to : tk.g.position.clone().setY(next.to.y);
        const t0 = tk.seg ? Math.max(tk.seg.t0 + tk.seg.dur, now - 60) : now;
        const dur = tk.queue.length > 2 ? next.dur * 0.6 : next.dur; // Rückstand aufholen
        tk.seg = { from, to: next.to, t0, dur, jump: next.jump };
      }
      const sg = tk.seg;
      if (sg) {
        const u = Math.min(1, Math.max(0, (now - sg.t0) / sg.dur));
        tk.g.position.lerpVectors(sg.from, sg.to, u);
        tk.g.position.y += Math.sin(u * Math.PI) * sg.jump;
        tk.g.rotation.z = Math.sin(u * Math.PI * 2) * 0.06; // leichtes Wackeln beim Laufen
        if (u >= 1 && !tk.queue.length) { tk.g.position.copy(sg.to); tk.g.rotation.z = 0; tk.seg = null; }
      }
      if (tk.g.userData.halo) tk.g.userData.halo.scale.setScalar(1 + Math.sin(t * 4) * 0.1);
    }
  });

  // ---------------------------------------------------------------- Kamera
  const home = { pos: V(...map.camera.pos), target: V(...map.camera.target) };
  const dir = home.pos.clone().sub(home.target).normalize();
  let mode = 'overview';
  let focusField = 0;
  const pan = V(0, 0, 0);
  const cur = { pos: home.pos.clone(), target: home.target.clone() };
  const followDist = () => (camera.aspect > 1.2 ? 11.5 : 14);
  const homeOffset = home.pos.clone().sub(home.target);
  function goal() {
    if (mode === 'overview') {
      const f = camera.aspect > 1.4 ? 0.72 : camera.aspect > 1 ? 0.82 : 1; // breite Fenster: näher ran
      return { pos: home.target.clone().addScaledVector(homeOffset, f).add(pan), target: home.target.clone().add(pan) };
    }
    const tg = fieldPos[focusField].clone().add(pan);
    return { pos: tg.clone().addScaledVector(dir, followDist()), target: tg };
  }
  anim((t, dt) => {
    const g = goal();
    const a = 1 - Math.exp(-dt * 3.2);
    cur.pos.lerp(g.pos, a); cur.target.lerp(g.target, a);
    camera.position.copy(cur.pos); camera.lookAt(cur.target);
  });

  // Wischen verschiebt die Kamera
  let drag = null;
  const onDown = (e) => { drag = { x: e.clientX, y: e.clientY, pan: pan.clone() }; };
  const onMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
    const right = V(dir.z, 0, -dir.x).normalize(); const fwd = V(-dir.x, 0, -dir.z).normalize();
    const s = (mode === 'overview' ? 0.05 : 0.025) * k;
    pan.copy(drag.pan).addScaledVector(right, -dx * s).addScaledVector(fwd, dy * s);
  };
  const onUp = () => { drag = null; };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // ---------------------------------------------------------------- Schleife
  let raf = 0; let last = performance.now(); let alive = true; const t0 = last;
  const minFrame = lowPower ? 1000 / 30 : 0;
  const loop = (now) => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (now - last < minFrame) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    for (const fn of updates) fn(t, dt);
    S.render();
  };
  raf = requestAnimationFrame(loop);

  return {
    map,
    setPlayers: (players, positions, meId) => placeTokens(players, positions, meId),
    setCleared,
    setFocus: (field) => { if (field != null) { focusField = Math.max(0, Math.min(fieldPos.length - 1, field)); pan.set(0, 0, 0); } },
    setMode: (m) => { mode = m; pan.set(0, 0, 0); },
    resize: (w, h) => S.setSize(w, h),
    dispose: () => {
      alive = false; cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      S.dispose();
    },
    get players() { return tokenData; },
  };
}
