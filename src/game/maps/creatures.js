import { THREE, std, addMesh, rng, noise3 } from './lib3d.js';

/*
 * Bewegte Deko: jede Funktion legt Objekte an und liefert update(t, dt) für die Animationsschleife.
 * Alles läuft in Endlosschleifen (Kreise, Hin-und-her, wiederkehrende Sprünge).
 */

// ------------------------------------------------------------------ Vögel & Fledermäuse
function birdMesh(color, { bat = false } = {}) {
  const g = new THREE.Group();
  const body = addMesh(g, new THREE.SphereGeometry(0.11, 10, 8), std({ color, roughness: 0.7 }), { recv: false });
  body.scale.set(1, 0.8, 1.9);
  if (!bat) { const beak = addMesh(g, new THREE.ConeGeometry(0.03, 0.09, 6), std({ color: '#F59E0B' }), { recv: false }); beak.rotation.x = Math.PI / 2; beak.position.z = 0.24; }
  const wingGeo = new THREE.BoxGeometry(bat ? 0.36 : 0.32, 0.015, bat ? 0.2 : 0.14);
  wingGeo.translate((bat ? 0.36 : 0.32) / 2, 0, 0);
  const wm = std({ color: bat ? '#1F1A24' : color, roughness: 0.8, side: THREE.DoubleSide });
  const l = addMesh(g, wingGeo, wm, { recv: false }); const r = addMesh(g, wingGeo, wm, { recv: false });
  r.rotation.y = Math.PI;
  g.userData = { l, r };
  return g;
}

/** Schwarm, der in einem Kreis (mit leichtem Auf und Ab) um ein Zentrum fliegt. */
export function flock(parent, { center, radius = 8, height = 6, speed = 0.18, count = 4, color = '#F8FAFC', bat = false, seed = 1 }) {
  const R = rng(seed);
  const birds = Array.from({ length: count }, (_, i) => {
    const b = birdMesh(color, { bat }); parent.add(b);
    return { b, off: [R.range(-0.8, 0.8), R.range(-0.4, 0.4), R.range(-0.8, 0.8)], ph: R.range(0, 6), lag: i * 0.06 };
  });
  return (t) => {
    birds.forEach(({ b, off, ph, lag }) => {
      const a = (t - lag * 10) * speed + seed;
      const x = center.x + Math.cos(a) * radius + off[0];
      const z = center.z + Math.sin(a) * radius + off[2];
      const y = height + Math.sin(t * 0.7 + ph) * 0.5 + off[1];
      b.position.set(x, y, z);
      b.rotation.y = -a + (speed > 0 ? 0 : Math.PI);
      const flap = Math.sin(t * (bat ? 16 : 11) + ph) * (bat ? 0.9 : 0.7);
      b.userData.l.rotation.z = flap; b.userData.r.rotation.z = -flap;
    });
  };
}

// ------------------------------------------------------------------ Schmetterlinge
export function butterflies(parent, { centers, colors = ['#F472B6', '#FACC15', '#A78BFA', '#60A5FA'], seed = 1 }) {
  const R = rng(seed);
  const items = centers.map((c, i) => {
    const g = new THREE.Group();
    const col = colors[i % colors.length];
    const wg = new THREE.CircleGeometry(0.08, 10); wg.translate(0.07, 0, 0);
    const m = std({ color: col, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.25 });
    const l = addMesh(g, wg, m, { cast: false }); const r = addMesh(g, wg, m, { cast: false }); r.rotation.y = Math.PI;
    l.rotation.x = r.rotation.x = -Math.PI / 2;
    parent.add(g);
    return { g, l, r, c, ph: R.range(0, 10) };
  });
  return (t) => items.forEach(({ g, l, r, c, ph }) => {
    const x = c.x + noise3(t * 0.25, ph, 0) * 1.2; const z = c.z + noise3(ph, t * 0.25, 1) * 1.2;
    g.position.set(x, c.y + 0.5 + Math.abs(Math.sin(t * 1.3 + ph)) * 0.4, z);
    g.rotation.y = noise3(t * 0.3, ph, 2) * 3;
    const f = Math.sin(t * 18 + ph) * 1.1; l.rotation.z = f; r.rotation.z = -f;
  });
}

// ------------------------------------------------------------------ Schafe
function sheepMesh() {
  const g = new THREE.Group();
  const wool = std({ color: '#F8F7F2', roughness: 1, flatShading: true });
  [[0, 0.32, 0, 0.2], [0.13, 0.36, 0.05, 0.15], [-0.13, 0.36, -0.03, 0.15], [0, 0.42, 0.12, 0.14], [0, 0.4, -0.13, 0.14]].forEach(([x, y, z, r]) => {
    const m = addMesh(g, new THREE.IcosahedronGeometry(r, 1), wool); m.position.set(x, y, z);
  });
  const head = addMesh(g, new THREE.BoxGeometry(0.13, 0.13, 0.16), std({ color: '#2B2724' })); head.position.set(0, 0.42, 0.26);
  const legs = [[-0.08, 0.08], [0.08, 0.08], [-0.08, -0.1], [0.08, -0.1]].map(([x, z]) => {
    const l = addMesh(g, new THREE.BoxGeometry(0.05, 0.2, 0.05), std({ color: '#2B2724' })); l.position.set(x, 0.1, z); return l;
  });
  g.userData = { legs, head };
  return g;
}

/** Schaf läuft auf einer Insel im Kreis (Höhe über surface(x, z)). */
export function sheepWalk(parent, { center, radius = 1, speed = 0.25, surface, seed = 1, scale = 1 }) {
  const s = sheepMesh(); s.scale.setScalar(scale); parent.add(s);
  let ang = seed;
  let last = 0;
  return (t) => {
    const dt = Math.min(0.1, t - last); last = t;
    // läuft gemütlich im Kreis, bleibt zwischendurch stehen und grast
    const walk = Math.sin(t * 0.35 + seed * 3) > -0.35;
    if (walk) ang += dt * speed;
    const x = center.x + Math.cos(ang) * radius; const z = center.z + Math.sin(ang) * radius;
    s.position.set(x, surface(x, z), z);
    s.rotation.y = -ang;
    const step = walk ? Math.sin(t * 8) * 0.4 : 0;
    s.userData.legs.forEach((l, i) => { l.rotation.x = i % 2 ? step : -step; });
    s.userData.head.position.y = walk ? 0.42 : 0.3 + Math.abs(Math.sin(t * 2)) * 0.05;
  };
}

// ------------------------------------------------------------------ Heißluftballon & Windmühle
export function balloon(parent, { center, radius = 10, height = 9, speed = 0.04, colors = ['#EF4444', '#FACC15'] }) {
  const g = new THREE.Group();
  const env = new THREE.SphereGeometry(0.9, 20, 16);
  const pos = env.attributes.position; const cols = [];
  const c0 = new THREE.Color(colors[0]); const c1 = new THREE.Color(colors[1]);
  for (let i = 0; i < pos.count; i++) { const a = Math.atan2(pos.getZ(i), pos.getX(i)); const c = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 10) % 2 ? c0 : c1; cols.push(c.r, c.g, c.b); }
  env.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = addMesh(g, env, std({ vertexColors: true, roughness: 0.6 })); m.scale.y = 1.15; m.position.y = 1.3;
  addMesh(g, new THREE.CylinderGeometry(0.22, 0.18, 0.22, 10), std({ color: '#8B5A2B' })).position.y = 0;
  [[0.15, 0.15], [-0.15, 0.15], [0.15, -0.15], [-0.15, -0.15]].forEach(([x, z]) => { const r = addMesh(g, new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4), std({ color: '#3F3A36' })); r.position.set(x, 0.38, z); });
  parent.add(g);
  return (t) => { const a = t * speed + 1; g.position.set(center.x + Math.cos(a) * radius, height + Math.sin(t * 0.5) * 0.5, center.z + Math.sin(a) * radius); g.rotation.y = t * 0.05; };
}

export function windmill(parent, p, { size = 1 } = {}) {
  const g = new THREE.Group(); g.position.copy(p); g.scale.setScalar(size);
  addMesh(g, new THREE.CylinderGeometry(0.35, 0.5, 1.6, 10), std({ color: '#F5EFE3', roughness: 0.8 })).position.y = 0.8;
  addMesh(g, new THREE.ConeGeometry(0.45, 0.55, 10), std({ color: '#9A3412', flatShading: true })).position.y = 1.85;
  const hub = new THREE.Group(); hub.position.set(0, 1.45, 0.45); g.add(hub);
  for (let i = 0; i < 4; i++) {
    const blade = addMesh(hub, new THREE.BoxGeometry(0.16, 1.0, 0.03), std({ color: '#E7D9C1' }));
    blade.geometry.translate(0, 0.5, 0); blade.rotation.z = (i * Math.PI) / 2;
  }
  addMesh(hub, new THREE.SphereGeometry(0.08, 8, 6), std({ color: '#57534E' }));
  parent.add(g);
  return (t) => { hub.rotation.z = -t * 1.2; };
}

// ------------------------------------------------------------------ Wasser: springende Fische
export function jumpingFish(parent, { spots, y = 0, seed = 1, color = '#F59E0B' }) {
  const R = rng(seed);
  const fish = spots.map((s, i) => {
    const g = new THREE.Group();
    const body = addMesh(g, new THREE.SphereGeometry(0.14, 10, 8), std({ color, roughness: 0.3, metalness: 0.3 }), { recv: false }); body.scale.set(0.6, 0.8, 1.6);
    const tail = addMesh(g, new THREE.ConeGeometry(0.1, 0.18, 4), std({ color, roughness: 0.3 }), { recv: false }); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.26;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: '#E0F7FF', transparent: true, opacity: 0 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(s.x, y + 0.03, s.z); parent.add(ring);
    g.visible = false; parent.add(g);
    return { g, ring, s, period: R.range(4, 8), ph: R.range(0, 8), dir: R.range(0, Math.PI * 2) };
  });
  return (t) => fish.forEach(({ g, ring, s, period, ph, dir }) => {
    const u = ((t + ph) % period) / 1.1; // Sprungdauer 1,1 s
    if (u <= 1) {
      g.visible = true;
      const d = (u - 0.5) * 1.2;
      g.position.set(s.x + Math.cos(dir) * d, y + Math.sin(u * Math.PI) * 0.9, s.z + Math.sin(dir) * d);
      g.rotation.set(-Math.cos(u * Math.PI) * 1.1, Math.PI / 2 - dir, 0);
    } else g.visible = false;
    const w = ((t + ph) % period) - 1.1; // Wellenring nach dem Eintauchen
    if (w > 0 && w < 1.2) { ring.material.opacity = 0.7 * (1 - w / 1.2); ring.scale.setScalar(0.5 + w * 1.6); ring.position.set(s.x + Math.cos(dir) * 0.6, y + 0.03, s.z + Math.sin(dir) * 0.6); } else ring.material.opacity = 0;
  });
}

// ------------------------------------------------------------------ Partikel: Glut, Glühwürmchen
function glowSprite(color) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.25, color); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Aufsteigende Teilchen (Glut über der Lava) oder schwebende Lichter (Glühwürmchen). */
export function particles(parent, { count = 120, area = [[-15, 15], [0, 8], [-15, 15]], color = '#FFB347', size = 0.25, rise = 0.6, wander = 0.4, seed = 1 }) {
  const R = rng(seed);
  const pos = new Float32Array(count * 3); const base = [];
  for (let i = 0; i < count; i++) {
    const p = [R.range(...area[0]), R.range(...area[1]), R.range(...area[2])];
    base.push({ p, ph: R.range(0, 100), sp: R.range(0.6, 1.4) });
    pos.set(p, i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: glowSprite(color), size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color, toneMapped: false });
  const pts = new THREE.Points(geo, mat); parent.add(pts);
  const h = area[1][1] - area[1][0];
  return (t) => {
    for (let i = 0; i < count; i++) {
      const b = base[i];
      const y = area[1][0] + ((b.p[1] - area[1][0] + t * rise * b.sp) % h);
      pos[i * 3] = b.p[0] + noise3(t * 0.3, b.ph, 0) * wander;
      pos[i * 3 + 1] = rise ? y : b.p[1] + Math.sin(t + b.ph) * wander;
      pos[i * 3 + 2] = b.p[2] + noise3(b.ph, t * 0.3, 1) * wander;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.75 + Math.sin(t * 3) * 0.2;
  };
}

/** Rauchwolken, die aus einem Krater aufsteigen und verblassen. */
export function smoke(parent, { at, count = 7, color = '#6B6560' }) {
  const puffs = Array.from({ length: count }, (_, i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false }));
    parent.add(m); return { m, ph: i / count };
  });
  return (t) => puffs.forEach(({ m, ph }) => {
    const u = (t * 0.12 + ph) % 1;
    m.position.set(at.x + Math.sin(u * 5 + ph * 9) * 0.5 + u * 1.2, at.y + u * 5, at.z + Math.cos(u * 4 + ph * 7) * 0.4);
    m.scale.setScalar(0.6 + u * 2.2);
    m.material.opacity = 0.55 * Math.sin(u * Math.PI);
  });
}

/** Lavablasen, die anschwellen und platzen. */
export function lavaBubbles(parent, { spots, y = -0.3 }) {
  const mat = new THREE.MeshStandardMaterial({ color: '#FF8A1F', emissive: '#FF6A00', emissiveIntensity: 1.6, roughness: 0.4 });
  const bubbles = spots.map((s, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat); m.position.set(s.x, y, s.z); parent.add(m); return { m, ph: i * 1.37 }; });
  return (t) => bubbles.forEach(({ m, ph }) => { const u = ((t * 0.5 + ph) % 2.2) / 2.2; const sc = u < 0.85 ? u / 0.85 : Math.max(0, 1 - (u - 0.85) * 8); m.scale.set(sc, sc * 0.9, sc); });
}
