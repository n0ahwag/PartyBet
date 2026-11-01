import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { mergeGeometries };
import { createNoise3D } from 'simplex-noise';

// ------------------------------------------------------------------ Zufall & Rauschen
export function rng(seed = 1) {
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, range: (a, b) => a + next() * (b - a), pick: (arr) => arr[Math.floor(next() * arr.length)] };
}
const R0 = rng(42);
export const noise3 = createNoise3D(R0.next);
export const fbm = (x, y, z, oct = 3) => { let a = 0; let f = 1; let amp = 1; let n = 0; for (let i = 0; i < oct; i++) { a += noise3(x * f, y * f, z * f) * amp; n += amp; f *= 2.03; amp *= 0.5; } return a / n; };

const col = (hex) => new THREE.Color(hex);
const lerpC = (a, b, t) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));

// ------------------------------------------------------------------ Bühne
export function stage({ canvas, width, height, pixelRatio = 1.5, bg, fog, sun = [8, 14, 6], sunColor = '#FFF1DC', sunI = 2.6, hemi = ['#DDEBFF', '#6B5B4B', 1.0], bloom = 0.25, bloomThreshold = 0.82, exposure = 1.0, camPos, target, fov = 26, shadowSize = 2048 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  const scene = new THREE.Scene();
  scene.background = bg;
  if (fog) scene.fog = fog;
  const pm = new THREE.PMREMGenerator(renderer);
  const envRT = pm.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.35;
  pm.dispose();
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.5, 600);
  camera.position.set(...camPos);
  camera.lookAt(new THREE.Vector3(...target));
  scene.add(new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]));
  const sunL = new THREE.DirectionalLight(sunColor, sunI);
  sunL.position.set(...sun);
  sunL.castShadow = true;
  sunL.shadow.mapSize.set(shadowSize, shadowSize);
  const sc = sunL.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
  sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03; sunL.shadow.radius = 4;
  sunL.target.position.set(...target);
  scene.add(sunL, sunL.target);
  let composer = null;
  if (bloom) {
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, { samples: 4, type: THREE.HalfFloatType }));
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(width / 2, height / 2), bloom, 0.55, bloomThreshold));
    composer.addPass(new OutputPass());
  }
  const setSize = (w, h) => {
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const render = () => (composer ? composer.render() : renderer.render(scene, camera));
  const dispose = () => {
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose(); });
    });
    envRT.dispose();
    composer?.dispose?.();
    renderer.dispose();
  };
  return { renderer, scene, camera, sun: sunL, composer, render, setSize, dispose };
}

/** Senkrechter Verlauf als Hintergrund. */
export function gradientBg(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d'); const lg = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([o, h]) => lg.addColorStop(o, h));
  g.fillStyle = lg; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
export function addMesh(parent, geo, mat, { cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m;
}

// ------------------------------------------------------------------ Schwebende Felsinsel
/**
 * Insel mit Wiese obendrauf und zerklüfteter, geschichteter Felswand darunter.
 * outline(angle) liefert den Radius → beliebige Formen (rund, oval, eckig).
 */
export function island(parent, { x = 0, z = 0, top = 0, radius = 3, depth = 6, seed = 1, tip = 0.12, grass = '#7CC35A', grass2 = '#5FA845', dirt = '#8A6A4A', rock = '#9AA0A8', rock2 = '#6E737C', strata = 0.55, outline = null, flat = true, shape = 'float', bump = 0.08 } = {}) {
  const segs = 72; const capRings = 9; const wallRings = 22;
  const rOf = (a) => (outline ? outline(a) : radius) * (1 + 0.07 * fbm(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3, seed * 0.7, 2));
  const pos = []; const colors = []; const idx = [];
  const G1 = col(grass); const G2 = col(grass2); const D = col(dirt); const K1 = col(rock); const K2 = col(rock2);
  const rows = [];
  // Deckel (Wiese), leicht gewölbt
  for (let k = 0; k <= capRings; k++) {
    const t = k / capRings; const row = [];
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2; const r = rOf(a) * t;
      const px = x + Math.cos(a) * r; const pz = z + Math.sin(a) * r;
      const py = top + bump * (1 - t * t) * 1.5 + fbm(px * 0.6, seed, pz * 0.6, 2) * bump * (t < 0.97 ? 1 : 0);
      row.push(pos.length / 3); pos.push(px, py, pz);
      const n = fbm(px * 0.45, 3 + seed, pz * 0.45, 3);
      const c = lerpC(G1, G2, 0.5 + n * 0.9);
      if (t > 0.93) c.lerp(D, 0.35);
      colors.push(c.r, c.g, c.b);
    }
    rows.push(row);
  }
  // Felswand mit Schichten, unten spitz zulaufend
  for (let k = 1; k <= wallRings; k++) {
    const t = k / wallRings; const row = [];
    const yy = top - t * depth;
    const layer = Math.floor(t * 6);
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const base = rOf(a);
      let prof = shape === 'column' ? 1 - t * 0.08 : Math.pow(1 - t, 0.85) * (1 - tip) + tip * (1 - t);
      if (k === 1) prof = 1.03;
      const nx = Math.cos(a); const nz = Math.sin(a);
      const n = fbm(nx * 1.7 + seed, yy * 0.55, nz * 1.7, 3);
      const step = (strata ? (Math.floor((yy + 50) / strata) % 2) * 0.05 : 0);
      const r = Math.max(0.05, base * prof * (1 + 0.14 * n + step));
      const px = x + nx * r; const pz = z + nz * r;
      row.push(pos.length / 3); pos.push(px, yy + n * 0.15, pz);
      let c;
      if (k <= 1) c = D.clone();
      else c = lerpC(K1, K2, 0.35 + n * 0.8 + t * 0.35);
      if (layer % 2) c.multiplyScalar(0.93);
      colors.push(c.r, c.g, c.b);
    }
    rows.push(row);
  }
  for (let k = 0; k < rows.length - 1; k++) {
    for (let j = 0; j < segs; j++) {
      const a = rows[k][j]; const b = rows[k][(j + 1) % segs]; const c = rows[k + 1][j]; const d = rows[k + 1][(j + 1) % segs];
      if (k === 0) { idx.push(a, d, c); continue; }
      idx.push(a, b, d, a, d, c);
    }
  }
  // Spitze schließen
  const tipI = pos.length / 3; pos.push(x, top - depth - 0.6, z); const tc = K2.clone().multiplyScalar(0.8); colors.push(tc.r, tc.g, tc.b);
  const last = rows[rows.length - 1];
  for (let j = 0; j < segs; j++) idx.push(last[j], last[(j + 1) % segs], tipI);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return addMesh(parent, g, std({ vertexColors: true, flatShading: flat, roughness: 0.95 }));
}

// ------------------------------------------------------------------ Weg, Felder, Schilder
/** Polylinie aus defs.js → Kurven-Schnittstelle wie bei THREE.Curve. */
export const fromPolyline = (poly) => ({
  getLength: () => poly.length,
  getPointAt: (u) => new THREE.Vector3(...poly.at(u).p),
  getTangentAt: (u) => new THREE.Vector3(...poly.at(u).tan),
});

/** Weg-Kurve über Wegpunkte [x, y, z]. */
export const curve = (pts, tension = 0.5) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', tension);

/** Pflasterweg als Band mit Randsteinen. */
export function pathStrip(parent, crv, { width = 0.85, color = '#E9D9B8', edge = '#B9A27E', seed = 3, lift = 0.03 } = {}) {
  const n = Math.max(20, Math.round(crv.getLength() * 12));
  const pos = []; const colors = []; const idx = [];
  const C1 = col(color); const C2 = col(edge);
  const R = rng(seed);
  const stones = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const p = crv.getPointAt(t); const tan = crv.getTangentAt(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    for (const s of [-1, -0.55, 0, 0.55, 1]) {
      const q = p.clone().addScaledVector(side, (s * width) / 2);
      pos.push(q.x, q.y + lift + (Math.abs(s) < 0.9 ? 0.015 : 0), q.z);
      const c = lerpC(C1, C2, Math.abs(s) > 0.9 ? 0.85 : R.next() * 0.25);
      colors.push(c.r, c.g, c.b);
    }
    if (i % 2 === 0) for (const s of [-1, 1]) stones.push(p.clone().addScaledVector(side, (s * width) / 2 + s * 0.03));
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { const a = i * 5 + k; idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx); g.computeVertexNormals();
  addMesh(parent, g, std({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), { cast: false });
  // Randsteine
  const sg = new THREE.DodecahedronGeometry(0.075, 0);
  const inst = new THREE.InstancedMesh(sg, std({ color: edge, flatShading: true }), stones.length);
  const m = new THREE.Matrix4();
  stones.forEach((s, i) => { const sc = 0.7 + R.next() * 0.6; m.compose(new THREE.Vector3(s.x, s.y + 0.04, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(R.next() * 3, R.next() * 3, 0)), new THREE.Vector3(sc, sc * 0.7, sc)); inst.setMatrixAt(i, m); });
  inst.castShadow = true; inst.receiveShadow = true; parent.add(inst);
}

export const FIELD = {
  normal: { c: '#1D6BF3' },
  rocket: { c: '#16A34A', icon: '🚀' },
  portal: { c: '#8B5CF6', icon: '🌀' },
  chaos: { c: '#F97316', icon: '💥' },
  stumble: { c: '#64748B', icon: '🪨' },
  start: { c: '#F1F5F9', icon: '🏁', ring: '#64748B' },
  goal: { c: '#F5B70A', icon: '🏆' },
  boulder: { c: '#57534E', icon: '🎲' },
  jump: { c: '#DC2626', icon: '🦘' },
  duck: { c: '#0EA5E9', icon: '⬇️' },
};

const discGeo = (() => {
  const prof = [[0, -0.05], [0.94, -0.05], [1, 0], [1, 0.05], [0.94, 0.09], [0, 0.09]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(prof, 40);
})();
const ringGeo = new THREE.TorusGeometry(0.8, 0.07, 10, 40);

/** Feld-Plakette: Scheibe mit weißem Ring, Spezialfelder größer und leicht leuchtend. scale passt die Größe an den Feldabstand an. */
export function fieldDisc(parent, p, type = 'normal', scale = 1) {
  const info = FIELD[type] ?? FIELD.normal;
  const big = type !== 'normal';
  const r = (big ? 0.42 : 0.31) * scale;
  const g = new THREE.Group(); g.position.copy(p); g.position.y += 0.05;
  const m = addMesh(g, discGeo, std({ color: info.c, roughness: 0.3, metalness: 0.05, emissive: info.c, emissiveIntensity: big ? 0.3 : 0.12 }));
  m.scale.set(r, 1, r);
  const ring = addMesh(g, ringGeo, std({ color: info.ring ?? '#FFFFFF', roughness: 0.4 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.095; ring.scale.setScalar(r);
  if (big && info.icon) { const flat = iconDecal(info.icon, r); flat.position.y = 0.1; g.add(flat); }
  parent.add(g);
  return g;
}

/** Symbol flach auf dem Feld. */
function iconDecal(icon, r) {
  const tex = canvasTex(256, 256, (g) => { g.font = '170px "Noto Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 128, 140); });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.25, r * 1.25), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function iconSprite(icon, bgc, scale) {
  const tex = canvasTex(256, 256, (g) => { g.font = '180px "Noto Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 128, 140); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false, fog: false })); s.scale.setScalar(scale); return s;
}

/** Schild über einem Feld: Plakette (Symbol oder Text) an einem Pfosten. */
export function sign(parent, p, { icon = null, text = null, color = '#2F7DF6', height = 1.15, size = 0.78 } = {}) {
  const g = new THREE.Group(); g.position.copy(p);
  addMesh(g, new THREE.CylinderGeometry(0.025, 0.03, height, 8), std({ color: '#5B4636' })).position.y = height / 2;
  const w = text ? 512 : 256;
  const tex = canvasTex(w, 256, (c) => {
    c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    c.fillStyle = '#ffffff';
    c.beginPath(); c.roundRect(14, 14, w - 28, 214, 107); c.fill();
    c.shadowColor = 'transparent';
    c.lineWidth = 18; c.strokeStyle = color; c.beginPath(); c.roundRect(23, 23, w - 46, 196, 98); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (text) { c.font = '900 92px Outfit, sans-serif'; c.fillStyle = '#1f2937'; c.fillText(text, w / 2, 126); }
    else { c.font = '140px "Noto Color Emoji", sans-serif'; c.fillText(icon, w / 2, 134); }
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, toneMapped: false, fog: false, color: new THREE.Color(0.9, 0.9, 0.9) }));
  s.scale.set(size * (w / 256), size, 1); s.position.y = height + size * 0.35;
  s.renderOrder = 10;
  g.add(s);
  parent.add(g);
  return g;
}

/** Felder gleichmäßig entlang einer Kurvenliste verteilen. */
export function distribute(curves, spacing = 0.78) {
  const total = curves.reduce((s, c) => s + c.getLength(), 0);
  const n = Math.round(total / spacing);
  const out = [];
  let acc = 0; let ci = 0; let cStart = 0;
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * total;
    while (ci < curves.length - 1 && d > cStart + curves[ci].getLength()) { cStart += curves[ci].getLength(); ci += 1; }
    const t = Math.min(1, (d - cStart) / curves[ci].getLength());
    out.push({ p: curves[ci].getPointAt(t), tan: curves[ci].getTangentAt(t), curve: ci, t });
    acc += 1;
  }
  return out;
}

/** Feldtypen (~12 % Spezialfelder), Start/Ziel fest. */
export function fieldTypes(n, seed = 7) {
  const R = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return 'start';
    if (i === n - 1) return 'goal';
    const r = R.next();
    if (r < 0.04) return 'rocket'; if (r < 0.07) return 'portal'; if (r < 0.1) return 'chaos'; if (r < 0.12) return 'stumble';
    return 'normal';
  });
}

// ------------------------------------------------------------------ Brücken, Treppen
/** Hängebrücke zwischen a und b (Vector3). broken: Lücke in der Mitte. Gibt die Lauf-Kurve zurück. */
export function ropeBridge(parent, a, b, { width = 0.9, sag = 0.35, broken = false, plank = '#B98250', rope = '#6B4423', post = '#5B3A20', stone = false } = {}) {
  const pts = []; const n = 24;
  for (let i = 0; i <= n; i++) { const t = i / n; const p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * sag; pts.push(p); }
  const crv = new THREE.CatmullRomCurve3(pts);
  const len = crv.getLength(); const count = Math.round(len / 0.24);
  const R = rng(11);
  const plankGeo = new THREE.BoxGeometry(0.18, 0.06, width);
  const pm = std({ color: plank, roughness: 0.8 });
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    if (broken && t > 0.4 && t < 0.62) continue;
    const p = crv.getPointAt(t); const tan = crv.getTangentAt(t);
    const m = addMesh(parent, plankGeo, stone ? std({ color: plank, roughness: 0.9, flatShading: true }) : pm);
    m.position.copy(p);
    m.lookAt(p.clone().add(new THREE.Vector3(-tan.z, 0, tan.x)));
    m.rotateZ((R.next() - 0.5) * 0.12);
    m.rotateX((R.next() - 0.5) * 0.06);
    m.material = pm.clone(); m.material.color.offsetHSL(0, 0, (R.next() - 0.5) * 0.08);
  }
  if (broken) {
    // herabfallende Bretter
    [[0.47, -1.0, 0.6], [0.53, -1.9, -0.9], [0.5, -2.8, 1.4]].forEach(([t, dy, rot]) => {
      const p = crv.getPointAt(t); const m = addMesh(parent, plankGeo, pm);
      m.position.set(p.x + (R.next() - 0.5) * 0.4, p.y + dy, p.z + (R.next() - 0.5) * 0.4); m.rotation.set(rot, rot * 0.7, rot * 1.3);
    });
  }
  if (!stone) {
    const side = new THREE.Vector3().subVectors(b, a); side.y = 0; side.normalize(); const nrm = new THREE.Vector3(-side.z, 0, side.x);
    for (const s of [-1, 1]) {
      const rp = pts.map((p) => p.clone().addScaledVector(nrm, (s * width) / 2).add(new THREE.Vector3(0, 0.42 + (p.y - a.clone().lerp(b, 0.5).y) * 0, 0)));
      const segsR = broken ? [rp.slice(0, 11), rp.slice(15)] : [rp];
      segsR.forEach((seg) => { if (seg.length > 1) addMesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seg), 40, 0.025, 6), std({ color: rope })); });
      [0, n].forEach((i) => {
        const q = pts[i].clone().addScaledVector(nrm, (s * width) / 2);
        const m = addMesh(parent, new THREE.CylinderGeometry(0.06, 0.07, 0.75, 8), std({ color: post }));
        m.position.set(q.x, q.y + 0.3, q.z);
      });
    }
  } else {
    const side = new THREE.Vector3().subVectors(b, a); side.y = 0; side.normalize(); const nrm = new THREE.Vector3(-side.z, 0, side.x);
    for (const s of [-1, 1]) for (let i = 0; i <= n; i += 3) {
      if (broken && i > 8 && i < 16) continue;
      const q = pts[i].clone().addScaledVector(nrm, (s * width) / 2);
      const m = addMesh(parent, new THREE.BoxGeometry(0.16, 0.32, 0.16), std({ color: '#4B4540', flatShading: true }));
      m.position.set(q.x, q.y + 0.16, q.z);
    }
  }
  return crv;
}

/** Steintreppe von a nach b. */
export function stairs(parent, a, b, { width = 0.9, color = '#D8CBB4', steps = 10 } = {}) {
  const R = rng(5);
  const dir = new THREE.Vector3().subVectors(b, a); const flat = dir.clone(); flat.y = 0;
  const ang = Math.atan2(flat.x, flat.z);
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps; const t1 = (i + 1) / steps;
    const p0 = a.clone().lerp(b, t0); const p1 = a.clone().lerp(b, t1);
    const h = p1.y - (a.y - 0.6) ;
    const m = addMesh(parent, new THREE.BoxGeometry(width, Math.max(0.1, p1.y - p0.y + 0.6), flat.length() / steps + 0.02), std({ color, flatShading: true }));
    m.material.color.offsetHSL(0, 0, (R.next() - 0.5) * 0.06);
    m.position.set((p0.x + p1.x) / 2, p1.y - (p1.y - p0.y + 0.6) / 2, (p0.z + p1.z) / 2);
    m.rotation.y = ang;
    void h;
  }
  return curve([[a.x, a.y, a.z], [b.x, b.y, b.z]]);
}

// ------------------------------------------------------------------ Natur & Deko
const leafMats = {};
const leafMat = (c) => (leafMats[c] ??= std({ color: c, flatShading: true, roughness: 0.8 }));

export function tree(parent, p, { leaf = '#4FA34A', size = 1, seed = 1 } = {}) {
  const R = rng(seed * 97 + 3);
  const g = new THREE.Group(); g.position.copy(p); g.scale.setScalar(size);
  const trunk = addMesh(g, new THREE.CylinderGeometry(0.07, 0.12, 0.8, 7), std({ color: '#7A5233', flatShading: true }));
  trunk.position.y = 0.4;
  const blobs = [[0, 1.05, 0, 0.5], [0.28, 0.85, 0.12, 0.36], [-0.25, 0.9, -0.1, 0.38], [0.05, 1.35, -0.05, 0.34]];
  blobs.forEach(([x, y, z, r], i) => {
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const pa = geo.attributes.position;
    for (let k = 0; k < pa.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(pa, k); v.multiplyScalar(1 + noise3(v.x * 3 + seed, v.y * 3, v.z * 3 + i) * 0.12); pa.setXYZ(k, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    const c = col(leaf).offsetHSL((R.next() - 0.5) * 0.03, 0, (R.next() - 0.5) * 0.1);
    const m = addMesh(g, geo, leafMat(`#${c.getHexString()}`)); m.position.set(x, y, z);
  });
  parent.add(g); return g;
}

export function pine(parent, p, { leaf = '#2E7D4F', size = 1 } = {}) {
  const g = new THREE.Group(); g.position.copy(p); g.scale.setScalar(size);
  addMesh(g, new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6), std({ color: '#6B4429' })).position.y = 0.2;
  [[0.55, 0.62, 0.45], [0.43, 0.55, 0.85], [0.3, 0.45, 1.2]].forEach(([r, h, y], i) => {
    const c = col(leaf).offsetHSL(0, 0, i * 0.03);
    addMesh(g, new THREE.ConeGeometry(r, h, 8), leafMat(`#${c.getHexString()}`)).position.y = y;
  });
  parent.add(g); return g;
}

export function bush(parent, p, { color = '#5DAE4B', size = 0.35, flowers = null } = {}) {
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const m = addMesh(parent, geo, leafMat(color)); m.position.copy(p); m.position.y += size * 0.5; m.scale.y = 0.75;
  if (flowers) for (let i = 0; i < 5; i++) {
    const a = i * 1.3; const f = addMesh(parent, new THREE.SphereGeometry(0.045, 8, 6), std({ color: flowers, emissive: flowers, emissiveIntensity: 0.15 }), { cast: false });
    f.position.set(p.x + Math.cos(a) * size * 0.8, p.y + size * 0.75, p.z + Math.sin(a) * size * 0.8);
  }
}

/** Unregelmäßiger Felsbrocken (verformtes Ikosaeder). */
export function rock(parent, p, { size = 0.5, color = '#8C8580', seed = 1, squash = 0.75 } = {}) {
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const pa = geo.attributes.position;
  for (let k = 0; k < pa.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(pa, k); v.multiplyScalar(1 + fbm(v.x * 2 + seed, v.y * 2, v.z * 2, 2) * 0.35); v.y *= squash; pa.setXYZ(k, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const m = addMesh(parent, geo, std({ color, flatShading: true, roughness: 0.95 }));
  m.position.copy(p); m.position.y += size * squash * 0.6; m.rotation.y = seed;
  return m;
}

/** Hindernis: Felsblockade – nur mit 4–6 durch. */
export function boulderBlock(parent, p, tan, { color = '#8D8378' } = {}) {
  const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  rock(parent, p.clone().addScaledVector(side, 0.0), { size: 0.46, color, seed: 3 });
  rock(parent, p.clone().addScaledVector(side, 0.42).addScaledVector(tan, 0.1), { size: 0.32, color: '#7E766C', seed: 8 });
  rock(parent, p.clone().addScaledVector(side, -0.4).addScaledVector(tan, -0.08), { size: 0.3, color: '#9A9187', seed: 13 });
  for (let i = 0; i < 6; i++) rock(parent, p.clone().addScaledVector(side, (i - 2.5) * 0.18).addScaledVector(tan, 0.45 + (i % 2) * 0.1), { size: 0.07, color: '#867D73', seed: 20 + i });
}

/** Hindernis: niedriger Holzbalken mit Ranken – ducken. */
export function duckGate(parent, p, tan) {
  const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  const g = new THREE.Group(); g.position.copy(p);
  const wood = std({ color: '#7B4F2C', flatShading: true });
  for (const s of [-1, 1]) { const m = addMesh(g, new THREE.CylinderGeometry(0.08, 0.1, 0.95, 8), wood); m.position.copy(side.clone().multiplyScalar(s * 0.62)); m.position.y = 0.47; }
  const log = addMesh(g, new THREE.CylinderGeometry(0.11, 0.11, 1.5, 10), std({ color: '#8B5A30', flatShading: true }));
  log.position.y = 0.92; log.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), side);
  for (let i = 0; i < 5; i++) {
    const v = addMesh(g, new THREE.ConeGeometry(0.06, 0.32 + (i % 2) * 0.12, 5), leafMat('#3F8F3A'));
    v.position.copy(side.clone().multiplyScalar(-0.5 + i * 0.25)); v.position.y = 0.72; v.rotation.x = Math.PI;
  }
  parent.add(g);
  return g;
}

/** Leuchtturm (Ziel). */
export function lighthouse(parent, p, { h = 2.8 } = {}) {
  const g = new THREE.Group(); g.position.copy(p);
  const prof = [[0, 0], [0.6, 0], [0.62, 0.15], [0.48, h], [0, h]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = addMesh(g, new THREE.LatheGeometry(prof, 32), std({ color: '#F8F5EE', roughness: 0.6 }));
  void body;
  for (let i = 0; i < 3; i++) { const band = addMesh(g, new THREE.CylinderGeometry(0.585 - i * 0.045 - 0.02, 0.6 - i * 0.045 - 0.02, 0.32, 32, 1, true), std({ color: '#E11D48', roughness: 0.5, side: THREE.DoubleSide })); band.position.y = 0.55 + i * 0.8; band.scale.setScalar(1.02); }
  addMesh(g, new THREE.CylinderGeometry(0.68, 0.68, 0.07, 32), std({ color: '#334155' })).position.y = h;
  const glass = addMesh(g, new THREE.CylinderGeometry(0.36, 0.36, 0.45, 16), std({ color: '#FEF3C7', emissive: '#FDE68A', emissiveIntensity: 1.6, roughness: 0.2 }));
  glass.position.y = h + 0.26;
  addMesh(g, new THREE.ConeGeometry(0.48, 0.55, 16), std({ color: '#B91C1C', roughness: 0.5 })).position.y = h + 0.75;
  addMesh(g, new THREE.SphereGeometry(0.07, 10, 8), std({ color: '#FACC15', metalness: 0.6, roughness: 0.3 })).position.y = h + 1.07;
  const door = addMesh(g, new THREE.BoxGeometry(0.28, 0.42, 0.05), std({ color: '#7C4A1E' })); door.position.set(0.32, 0.21, 0.5); door.rotation.y = 0.6;
  const light = new THREE.PointLight('#FFE7A3', 6, 6, 1.5); light.position.y = h + 0.3; g.add(light);
  parent.add(g); return g;
}

/** Häuschen mit Satteldach. */
export function house(parent, p, { wall = '#FBF4E6', roof = '#E2683C', rot = 0, size = 1 } = {}) {
  const g = new THREE.Group(); g.position.copy(p); g.rotation.y = rot; g.scale.setScalar(size);
  addMesh(g, new THREE.BoxGeometry(1, 0.7, 0.8), std({ color: wall, roughness: 0.8 })).position.y = 0.35;
  const shape = new THREE.Shape(); shape.moveTo(-0.6, 0); shape.lineTo(0, 0.5); shape.lineTo(0.6, 0); shape.lineTo(-0.6, 0);
  const roofG = new THREE.ExtrudeGeometry(shape, { depth: 0.95, bevelEnabled: false }); roofG.translate(0, 0, -0.475);
  const r = addMesh(g, roofG, std({ color: roof, roughness: 0.7, flatShading: true })); r.position.y = 0.7;
  const d = addMesh(g, new THREE.BoxGeometry(0.22, 0.38, 0.04), std({ color: '#7C4A1E' })); d.position.set(0.15, 0.19, 0.41);
  [[-0.27, 0.42], [0.42, 0.42]].forEach(([x, y]) => { const w = addMesh(g, new THREE.BoxGeometry(0.18, 0.16, 0.03), std({ color: '#93C5FD', emissive: '#FDE68A', emissiveIntensity: 0.25 })); w.position.set(x, y, 0.41); });
  const ch = addMesh(g, new THREE.BoxGeometry(0.13, 0.3, 0.13), std({ color: '#9A3412' })); ch.position.set(-0.3, 1.0, -0.15);
  parent.add(g); return g;
}

/** Wolke aus weichen Kugeln. */
export function cloud(parent, p, { size = 1, seed = 1, color = '#FFFFFF', opacity = 1 } = {}) {
  const R = rng(seed);
  const geos = [];
  for (let i = 0; i < 7; i++) {
    const r = size * (0.45 + R.next() * 0.45);
    const geo = new THREE.IcosahedronGeometry(r, 3);
    geo.translate((R.next() - 0.5) * size * 2.4, R.next() * size * 0.35, (R.next() - 0.5) * size * 1.2);
    geo.scale(1, 0.62, 1);
    geos.push(geo);
  }
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: opacity < 1, opacity, emissive: color, emissiveIntensity: 0.08 }));
  m.position.copy(p); m.castShadow = false; m.receiveShadow = false; parent.add(m);
  return m;
}

/** Spielfigur: Sockel + Kugel mit Emoji. */
export function token(parent, p, emoji, color) {
  const g = new THREE.Group(); g.position.copy(p); g.position.y += 0.12;
  addMesh(g, new THREE.CylinderGeometry(0.16, 0.22, 0.12, 24), std({ color, roughness: 0.4 })).position.y = 0.06;
  addMesh(g, new THREE.CylinderGeometry(0.1, 0.16, 0.3, 24), std({ color, roughness: 0.4 })).position.y = 0.27;
  const head = addMesh(g, new THREE.SphereGeometry(0.22, 24, 16), std({ color, roughness: 0.35 })); head.position.y = 0.6;
  const s = iconSprite(emoji, null, 0.42); s.position.y = 0.62; s.material.depthTest = false; s.renderOrder = 20; g.add(s);
  parent.add(g); return g;
}


// ------------------------------------------------------------------ Vulkan, Höhle, Wasser
/** Lavasee: glühende Risse zwischen dunkler Kruste (prozedurale Textur). */
export function lavaSea(parent, { y = -1, size = 120 } = {}) {
  const N = 1024;
  const tex = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = i / N * 5; const v = j / N * 5;
      const n = fbm(u, v, 0.3, 4); const cr = Math.abs(fbm(u * 1.7 + 4, v * 1.7, 1.1, 3));
      const hot = Math.max(0, 1 - cr * 9) * 0.9 + Math.max(0, n - 0.15) * 0.45;
      const k = (i + j * N) * 4;
      img.data[k] = 40 + hot * 215; img.data[k + 1] = 8 + Math.pow(hot, 1.6) * 170; img.data[k + 2] = 4 + Math.pow(hot, 3) * 60; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 1.0, roughness: 0.6 }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; parent.add(m);
  return m;
}

/** Ruhiges Wasser mit Spiegelung. */
export function waterSea(parent, { y = 0, size = 120, color = '#1FA3C4' } = {}) {
  const N = 512;
  const tex = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const n = fbm(i / N * 14, j / N * 14, 2.2, 3);
      const k = (i + j * N) * 4; const v = 128 + n * 60;
      img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 6); tex.colorSpace = THREE.NoColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0.1, bumpMap: tex, bumpScale: 1.2, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; parent.add(m);
  return m;
}

/** Burgturm mit Zinnen, Dach und Fahne. */
export function castleTower(parent, p, { h = 2.6, r = 0.6, stone = '#B7A78F', roof = '#8E1B1B', flag = '#F97316' } = {}) {
  const g = new THREE.Group(); g.position.copy(p);
  const body = new THREE.CylinderGeometry(r * 0.92, r, h, 14, 6);
  const pa = body.attributes.position;
  for (let k = 0; k < pa.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(pa, k); const n = noise3(v.x * 3, v.y * 3, v.z * 3) * 0.04; pa.setXYZ(k, v.x * (1 + n), v.y, v.z * (1 + n)); }
  body.computeVertexNormals();
  addMesh(g, body, std({ color: stone, flatShading: true, roughness: 0.95 })).position.y = h / 2;
  addMesh(g, new THREE.CylinderGeometry(r * 1.12, r * 1.0, 0.2, 14), std({ color: shadeHex(stone, 0.9), flatShading: true })).position.y = h + 0.1;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const m = addMesh(g, new THREE.BoxGeometry(0.2, 0.24, 0.16), std({ color: stone, flatShading: true }));
    m.position.set(Math.cos(a) * r * 1.05, h + 0.32, Math.sin(a) * r * 1.05); m.rotation.y = -a;
  }
  addMesh(g, new THREE.ConeGeometry(r * 0.95, r * 1.6, 14), std({ color: roof, flatShading: true, roughness: 0.6 })).position.y = h + 0.2 + r * 0.8;
  addMesh(g, new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), std({ color: '#333' })).position.y = h + 0.2 + r * 1.6 + 0.3;
  const fl = addMesh(g, new THREE.PlaneGeometry(0.42, 0.24), std({ color: flag, side: THREE.DoubleSide, emissive: flag, emissiveIntensity: 0.2 }), { cast: false });
  fl.position.set(0.21, h + 0.2 + r * 1.6 + 0.48, 0);
  for (let i = 0; i < 2; i++) { const w = addMesh(g, new THREE.BoxGeometry(0.12, 0.26, 0.05), std({ color: '#FDBA74', emissive: '#FB923C', emissiveIntensity: 1.6 })); const a = 0.6 + i * 1.3; w.position.set(Math.cos(a) * r * 0.97, h * (0.45 + i * 0.25), Math.sin(a) * r * 0.97); w.rotation.y = -a + Math.PI / 2; }
  parent.add(g); return g;
}
const shadeHex = (hex, f) => `#${new THREE.Color(hex).multiplyScalar(f).getHexString()}`;

export function torch(parent, p, { light = true } = {}) {
  const g = new THREE.Group(); g.position.copy(p);
  addMesh(g, new THREE.CylinderGeometry(0.035, 0.05, 0.7, 6), std({ color: '#3F3A36' })).position.y = 0.35;
  addMesh(g, new THREE.CylinderGeometry(0.09, 0.06, 0.1, 8), std({ color: '#57534E', metalness: 0.4 })).position.y = 0.72;
  const f = addMesh(g, new THREE.ConeGeometry(0.08, 0.24, 8), std({ color: '#FDBA74', emissive: '#FB923C', emissiveIntensity: 3 }), { cast: false }); f.position.y = 0.88;
  const f2 = addMesh(g, new THREE.SphereGeometry(0.06, 8, 6), std({ color: '#FEF08A', emissive: '#FDE047', emissiveIntensity: 3 }), { cast: false }); f2.position.y = 0.8;
  if (light) { const l = new THREE.PointLight('#FF9A3C', 2.2, 3.5, 1.6); l.position.y = 1.0; g.add(l); g.userData.light = l; }
  g.userData.flame = f; parent.add(g); return g;
}

export function crystal(parent, p, { color = '#E879F9', size = 1, seed = 1 } = {}) {
  const R = rng(seed * 13 + 1);
  const g = new THREE.Group(); g.position.copy(p); g.scale.setScalar(size);
  const mat = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0, transmission: 0, clearcoat: 1, flatShading: true });
  for (let i = 0; i < 5; i++) {
    const h = 0.5 + R.next() * 0.7; const r = 0.09 + R.next() * 0.08;
    const geo = new THREE.CylinderGeometry(r * 0.15, r, h, 6); geo.translate(0, h / 2, 0);
    const tip = new THREE.ConeGeometry(r * 0.15, 0.001, 6);
    void tip;
    const m = addMesh(g, geo, mat); m.rotation.set((R.next() - 0.5) * 0.9, R.next() * 3, (R.next() - 0.5) * 0.9); m.position.set((R.next() - 0.5) * 0.3, 0, (R.next() - 0.5) * 0.3);
  }
  const l = new THREE.PointLight(color, 1.2, 2.5, 1.5); l.position.y = 0.6; g.add(l);
  g.userData = { mat, light: l };
  parent.add(g); return g;
}

export function barrel(parent, p, { rot = 0 } = {}) {
  const prof = [[0, 0], [0.16, 0], [0.19, 0.18], [0.16, 0.36], [0, 0.36]].map(([r, y]) => new THREE.Vector2(r, y));
  const m = addMesh(parent, new THREE.LatheGeometry(prof, 14), std({ color: '#9A5B2B', roughness: 0.8 }));
  m.position.copy(p); m.rotation.y = rot;
  [0.07, 0.29].forEach((y) => { const r = addMesh(parent, new THREE.TorusGeometry(0.175, 0.012, 6, 18), std({ color: '#3F3A36', metalness: 0.5 })); r.rotation.x = Math.PI / 2; r.position.set(p.x, p.y + y, p.z); });
}

/** Wasserfall: gebogene Fläche mit Streifen-Textur und Gischt unten. */
export function waterfall(parent, top, bottom, { width = 1.6 } = {}) {
  const tex = canvasTex(128, 512, (g) => {
    const lg = g.createLinearGradient(0, 0, 0, 512); lg.addColorStop(0, '#E0F7FF'); lg.addColorStop(1, '#5CC8F0');
    g.fillStyle = lg; g.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + (i % 4) * 0.12})`; const x = (i * 37) % 128; g.fillRect(x, (i * 91) % 512, 2 + (i % 3), 40 + (i % 5) * 26); }
  });
  const h = top.y - bottom.y;
  const geo = new THREE.PlaneGeometry(width, h, 8, 24);
  const pa = geo.attributes.position;
  for (let k = 0; k < pa.count; k++) { const y = pa.getY(k); const t = (h / 2 - y) / h; pa.setZ(k, Math.pow(t, 0.5) * 0.5 + Math.sin(pa.getX(k) * 3) * 0.04); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.93, roughness: 0.2, emissive: '#9BE3FF', emissiveIntensity: 0.25, side: THREE.DoubleSide }));
  m.position.set(top.x, (top.y + bottom.y) / 2, top.z);
  m.lookAt(new THREE.Vector3(top.x + 1, (top.y + bottom.y) / 2, top.z + 1));
  parent.add(m);
  tex.wrapT = THREE.RepeatWrapping;
  const foam = [];
  for (let i = 0; i < 9; i++) { const f = addMesh(parent, new THREE.IcosahedronGeometry(0.28 + (i % 3) * 0.1, 2), std({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.3 }), { cast: false }); f.position.set(bottom.x + Math.cos(i * 0.7) * (0.3 + i * 0.08), bottom.y + 0.1, bottom.z + Math.sin(i * 0.7) * (0.3 + i * 0.08)); f.scale.y = 0.6; foam.push(f); }
  return { mesh: m, tex, foam };
}

/** Kleines Segelboot. */
export function boat(parent, p, { rot = 0 } = {}) {
  const g = new THREE.Group(); g.position.copy(p); g.rotation.y = rot; g.userData.base = p.clone();
  const shape = new THREE.Shape(); shape.moveTo(-1.1, 0.25); shape.quadraticCurveTo(-0.9, -0.35, 0, -0.38); shape.quadraticCurveTo(0.9, -0.35, 1.3, 0.3); shape.lineTo(-1.1, 0.25);
  const hull = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }); hull.translate(0, 0, -0.45);
  addMesh(g, hull, std({ color: '#6B3518', roughness: 0.6 })).position.y = 0.3;
  addMesh(g, new THREE.BoxGeometry(2.2, 0.06, 0.82), std({ color: '#C8955E' })).position.y = 0.55;
  const stripe = addMesh(g, new THREE.BoxGeometry(2.3, 0.08, 0.96), std({ color: '#F5F0E6' })); stripe.position.y = 0.5;
  addMesh(g, new THREE.CylinderGeometry(0.04, 0.05, 2.2, 8), std({ color: '#5B3A20' })).position.set(0.1, 1.6, 0);
  const sail = new THREE.Shape(); sail.moveTo(0, 0); sail.lineTo(0, 1.6); sail.quadraticCurveTo(0.9, 0.9, 1.0, 0); sail.lineTo(0, 0);
  const sm = addMesh(g, new THREE.ShapeGeometry(sail), std({ color: '#FFF7ED', side: THREE.DoubleSide, roughness: 0.9 }));
  sm.position.set(0.15, 0.75, 0);
  const st = addMesh(g, new THREE.PlaneGeometry(0.9, 0.14), std({ color: '#EF4444', side: THREE.DoubleSide }), { cast: false }); st.position.set(0.6, 1.2, 0.01); st.rotation.z = -0.15;
  parent.add(g); return g;
}

/** Holzleiter von a nach b (gibt die Lauf-Kurve zurück). */
export function ladder(parent, a, b, { color = '#A86B32' } = {}) {
  const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length();
  const flat = dir.clone(); flat.y = 0; const side = new THREE.Vector3(-flat.z, 0, flat.x).normalize();
  const mat = std({ color, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const m = addMesh(parent, new THREE.CylinderGeometry(0.045, 0.045, len + 0.4, 8), mat);
    m.position.copy(a.clone().lerp(b, 0.5).addScaledVector(side, s * 0.3));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  }
  const n = Math.round(len / 0.32);
  for (let i = 1; i < n; i++) {
    const p = a.clone().lerp(b, i / n);
    const m = addMesh(parent, new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), mat);
    m.position.copy(p); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), side);
  }
  return curve([[a.x, a.y, a.z], [b.x, b.y, b.z]]);
}

/** Schatztruhe. */
export function chest(parent, p, { rot = 0 } = {}) {
  const g = new THREE.Group(); g.position.copy(p); g.rotation.y = rot;
  addMesh(g, new THREE.BoxGeometry(0.7, 0.38, 0.46), std({ color: '#8B4A1F', roughness: 0.7 })).position.y = 0.19;
  const lid = addMesh(g, new THREE.CylinderGeometry(0.23, 0.23, 0.7, 16, 1, false, 0, Math.PI), std({ color: '#9A5626', roughness: 0.7 }));
  lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2; lid.position.y = 0.38; lid.rotation.x = 0;
  [-0.25, 0.25].forEach((x) => { const b = addMesh(g, new THREE.BoxGeometry(0.06, 0.62, 0.48), std({ color: '#D4A017', metalness: 0.8, roughness: 0.3 })); b.position.set(x, 0.3, 0); });
  for (let i = 0; i < 9; i++) { const c = addMesh(g, new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), std({ color: '#FACC15', metalness: 0.9, roughness: 0.25, emissive: '#B45309', emissiveIntensity: 0.3 })); c.position.set(0.45 + (i % 3) * 0.1, 0.01 + Math.floor(i / 3) * 0.02, -0.1 + (i % 2) * 0.12); }
  parent.add(g); return g;
}

export { THREE };
