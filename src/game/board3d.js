import { makeRng } from '../lib/random.js';

/*
 * Geometrie der isometrischen 3D-Karte (rein, testbar).
 * Welt-Koordinaten X/Y in Feld-Einheiten, Z nach oben. Der Pfad läuft als
 * Serpentine mit runden Kehren und leichtem Schwung über die Insel.
 */

export const ISO_SCALE = 34; // px pro Welt-Einheit
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);

/** Welt → Bildschirm (isometrisch). */
export function iso(X, Y, Z = 0) {
  return { x: (X - Y) * COS * ISO_SCALE, y: (X + Y) * SIN * ISO_SCALE - Z * ISO_SCALE };
}

const SPACING = 1.3; // Abstand der Felder entlang des Pfads
const TURN_R = 1.25; // Radius der Kehren

/**
 * Anzahl Reihen je Spielfeld-Länge: so, dass die Insel ungefähr quadratisch bleibt
 * (Reihenlänge ≈ 1,5 × Reihenanzahl). 20 Felder → 3 Reihen, 90 → 7, 150 → 10.
 */
const rowsFor = (n) => {
  const total = (n - 1) * SPACING;
  const turn = Math.PI * TURN_R;
  return Math.max(2, Math.round((-turn + Math.sqrt(turn * turn + 6 * total)) / 3));
};

/**
 * Mittellinie als Funktion der Bogenlänge s.
 * Reihen laufen entlang X (hin und zurück), Kehren sind Halbkreise in Richtung +Y.
 */
function makeCenterline(n) {
  const rows = rowsFor(n);
  const total = (n - 1) * SPACING;
  const turn = Math.PI * TURN_R;
  const rowLen = (total - (rows - 1) * turn) / rows;
  const pointAt = (s) => {
    let rest = Math.max(0, Math.min(total, s));
    for (let r = 0; r < rows; r++) {
      const y0 = r * 2 * TURN_R;
      const dir = r % 2 === 0 ? 1 : -1;
      const x0 = dir === 1 ? 0 : rowLen;
      if (rest <= rowLen || r === rows - 1) {
        const u = Math.min(rest, rowLen);
        // sanfter Schwung in der Reihe (an den Enden 0, damit die Kehren sauber anschließen)
        const wave = 0.45 * Math.sin((u / rowLen) * Math.PI * 2) * (r % 2 ? -1 : 1);
        return { X: x0 + dir * u, Y: y0 + wave };
      }
      rest -= rowLen;
      if (rest <= turn) {
        const a = rest / TURN_R; // 0..π
        const cx = dir === 1 ? rowLen : 0;
        return { X: cx + dir * Math.sin(a) * TURN_R, Y: y0 + TURN_R - Math.cos(a) * TURN_R };
      }
      rest -= turn;
    }
    return { X: 0, Y: 0 };
  };
  return { pointAt, total, rows, rowLen };
}

/**
 * Komplettes Layout: Feld-Mittelpunkte, Straßen-Kurve, Inselgrenzen und Deko.
 * @param n Anzahl Felder  @param seed bestimmt die Deko-Verteilung
 */
export function layoutBoard(n, seed = 'board') {
  const line = makeCenterline(n);
  const fields = Array.from({ length: n }, (_, i) => line.pointAt(i * SPACING));
  const road = [];
  for (let s = 0; s <= line.total + 1e-6; s += 0.25) road.push(line.pointAt(s));

  const xs = fields.map((p) => p.X);
  const ys = fields.map((p) => p.Y);
  const pad = 1.6;
  const bounds = { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minY: Math.min(...ys) - pad, maxY: Math.max(...ys) + pad };

  // Deko: zufällige Plätze mit Abstand zur Straße und zueinander
  const rng = makeRng(`decor:${seed}`);
  const decor = [];
  const far = (X, Y, d, list) => list.every((p) => Math.hypot(p.X - X, p.Y - Y) >= d);
  const want = Math.round(n * 0.7);
  for (let tries = 0; decor.length < want && tries < want * 40; tries++) {
    const X = bounds.minX + 0.4 + rng.next() * (bounds.maxX - bounds.minX - 0.8);
    const Y = bounds.minY + 0.4 + rng.next() * (bounds.maxY - bounds.minY - 0.8);
    if (far(X, Y, 1.05, road) && far(X, Y, 0.95, decor)) decor.push({ X, Y, kind: rng.int(0, 2), size: 0.8 + rng.next() * 0.5 });
  }

  // Bildschirm-Ausdehnung (für die viewBox)
  const corners = [
    iso(bounds.minX, bounds.minY), iso(bounds.maxX, bounds.minY), iso(bounds.minX, bounds.maxY), iso(bounds.maxX, bounds.maxY),
  ];
  const view = {
    minX: Math.min(...corners.map((c) => c.x)) - 20,
    maxX: Math.max(...corners.map((c) => c.x)) + 20,
    minY: Math.min(...corners.map((c) => c.y)) - 110, // Platz nach oben für Figuren & Deko
    maxY: Math.max(...corners.map((c) => c.y)) + 50, // Insel-Kante
  };
  return { fields, road, decor, bounds, view };
}

/** Versatz mehrerer Figuren auf demselben Feld (im Kreis um die Mitte). */
export function tokenOffset(index, count) {
  if (count <= 1) return { X: 0, Y: 0 };
  const a = (index / count) * Math.PI * 2 - Math.PI / 4;
  const r = count <= 3 ? 0.22 : 0.3;
  return { X: Math.cos(a) * r, Y: Math.sin(a) * r };
}
