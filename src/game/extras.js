import { makeRng } from '../lib/random.js';

/*
 * Logik der Erweiterungs-Spiele (rein, testbar): Mikrofon, Zeichnen, Teams, Geschick, Wissen.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ Mikrofon
/** RMS (0…1) → Pegel 0…100 (−70 dBFS = 0, −10 dBFS = 100). */
export function levelFromRms(rms) {
  const db = 20 * Math.log10(Math.max(rms, 1e-6));
  return clamp(((db + 70) / 60) * 100, 0, 100);
}

/** Pegel-Treffer: Zielzone (Breite 16) und Messdauer. */
export const LEVEL = { durationMs: 8000, zoneWidth: 16 };
export function makeLevelZone(rng) {
  const lo = rng.int(30, 62);
  return { lo, hi: lo + LEVEL.zoneWidth };
}

/** Atem-Ballon: Ballon wächst beim Pusten; über der (geheimen) Platzgrenze knallt er. */
export const BALLOON = { timeMs: 15000, blowFrom: 30, growPerSec: 0.3 };
export const balloonGrowth = (level, dt) => (level <= BALLOON.blowFrom ? 0 : ((level - BALLOON.blowFrom) / (100 - BALLOON.blowFrom)) * BALLOON.growPerSec * dt);
export const makePopAt = (rng) => rng.int(70, 96) / 100;

// ------------------------------------------------------------------ Linie halten
export const SHAPES = ['circle', 'star', 'wave', 'heart', 'spiral', 'zigzag'];
export const SHAPE_LABELS = { circle: 'Kreis', star: 'Stern', wave: 'Welle', heart: 'Herz', spiral: 'Spirale', zigzag: 'Zickzack' };

/** Punkte der Vorlage im Feld 0…300 (ein durchgehender Strich). */
export function shapePoints(kind, n = 240) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    let x;
    let y;
    if (kind === 'circle') { const a = -Math.PI / 2 + u * Math.PI * 2; x = 150 + 110 * Math.cos(a); y = 150 + 110 * Math.sin(a); }
    else if (kind === 'star') {
      const k = u * 10; const seg = Math.min(9, Math.floor(k)); const f = k - seg;
      const corner = (j) => { const r = j % 2 ? 50 : 125; const a = -Math.PI / 2 + (j * Math.PI) / 5; return [150 + r * Math.cos(a), 155 + r * Math.sin(a)]; };
      const [x1, y1] = corner(seg); const [x2, y2] = corner(seg + 1);
      x = x1 + (x2 - x1) * f; y = y1 + (y2 - y1) * f;
    } else if (kind === 'wave') { x = 25 + u * 250; y = 150 + 75 * Math.sin(u * Math.PI * 4); }
    else if (kind === 'heart') {
      const a = u * Math.PI * 2;
      x = 150 + 7.2 * 16 * Math.sin(a) ** 3;
      y = 140 - 7.2 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    } else if (kind === 'spiral') { const a = u * Math.PI * 5; const r = 15 + u * 115; x = 150 + r * Math.cos(a); y = 150 + r * Math.sin(a); }
    else { const k = u * 6; const seg = Math.floor(Math.min(5.999, k)); const f = k - seg; x = 25 + u * 250; y = seg % 2 ? 245 - 190 * f : 55 + 190 * f; }
    pts.push([x, y]);
  }
  return pts;
}

function distToSegment(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = dx * dx + dy * dy;
  const t = l ? clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Kleinster Abstand eines Punkts zur Linie (Polylinie). */
export function distToPath(path, x, y) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) best = Math.min(best, distToSegment(x, y, path[i - 1], path[i]));
  return best;
}

/**
 * Bewertung des nachgefahrenen Strichs (Feld 0…300).
 * err = mittlere Abweichung (px), coverage = Anteil der Vorlage, der getroffen wurde (≤ 22 px).
 * score: kleiner ist besser – nicht abgefahrene Teile kosten bis zu 60 Punkte.
 */
export function traceScore(path, trace) {
  if (trace.length < 5) return { err: 999, coverage: 0, score: 999 };
  const err = trace.reduce((s, [x, y]) => s + distToPath(path, x, y), 0) / trace.length;
  const samples = path.filter((_, i) => i % 4 === 0);
  const hit = samples.filter(([x, y]) => trace.some(([tx, ty]) => Math.hypot(tx - x, ty - y) <= 22)).length;
  const coverage = hit / samples.length;
  return { err: Math.round(err * 10) / 10, coverage: Math.round(coverage * 100) / 100, score: Math.round((err + (1 - coverage) * 60) * 10) / 10 };
}

/** Genauigkeit in Prozent für die Anzeige (100 = perfekt). */
export const traceAccuracy = (score) => Math.max(0, Math.round(100 - score * 2));

// ------------------------------------------------------------------ Heißer Draht
export const WIRE = { w: 300, h: 420, half: 19, ball: 7, timeMs: 60000, penaltyMs: 2000, speed: 9 };

/** Mittellinie des Drahts: Zickzack von oben nach unten (Seed = gleicher Parcours für alle). */
export function makeWire(seed) {
  const rng = makeRng(`wire:${seed}`);
  const rows = 7;
  const pts = [[150, 26]];
  for (let i = 1; i <= rows; i++) {
    const y = 26 + (i * (WIRE.h - 52)) / rows;
    const prev = pts[i - 1][0];
    let x = rng.int(32, WIRE.w - 32);
    if (Math.abs(x - prev) < 70) x = prev > 150 ? prev - rng.int(80, 150) : prev + rng.int(80, 150);
    pts.push([clamp(x, 32, WIRE.w - 32), y]);
  }
  return pts;
}

/** Fortschritt entlang des Drahts (0…1) für einen Punkt – zählt, wie weit man gekommen ist. */
export function wireProgress(path, x, y) {
  let bestD = Infinity;
  let bestS = 0;
  let total = 0;
  const lens = [];
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); lens.push(l); total += l; }
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const [x1, y1] = path[i - 1];
    const [x2, y2] = path[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1) : 0;
    const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
    if (d < bestD) { bestD = d; bestS = acc + t * lens[i - 1]; }
    acc += lens[i - 1];
  }
  return { dist: bestD, progress: total ? bestS / total : 0, point: pointAt(path, total ? bestS / total : 0) };
}

/** Punkt auf der Mittellinie bei Fortschritt p (0…1). */
export function pointAt(path, p) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); lens.push(l); total += l; }
  let rest = clamp(p, 0, 1) * total;
  for (let i = 1; i < path.length; i++) {
    if (rest <= lens[i - 1] || i === path.length - 1) {
      const f = lens[i - 1] ? Math.min(1, rest / lens[i - 1]) : 0;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f];
    }
    rest -= lens[i - 1];
  }
  return path[path.length - 1];
}

// ------------------------------------------------------------------ Höher oder Tiefer
/** Themen mit eindeutig verschiedenen Werten (gerundet, Stand der allgemein bekannten Angaben). */
export const HIGHER_LOWER_SETS = [
  {
    topic: 'Höhe in Metern', unit: 'm',
    items: [
      ['Mount Everest', 8849], ['Kilimandscharo', 5895], ['Mont Blanc', 4806], ['Matterhorn', 4478], ['Zugspitze', 2962],
      ['Feldberg (Schwarzwald)', 1493], ['Brocken', 1141], ['Burj Khalifa', 828], ['Berliner Fernsehturm', 368],
      ['Eiffelturm', 330], ['Ulmer Münster', 162], ['Kölner Dom', 157], ['Freiheitsstatue (mit Sockel)', 93], ['Schiefer Turm von Pisa', 56],
    ],
  },
  {
    topic: 'Jahr', unit: '',
    items: [
      ['Untergang der Titanic', 1912], ['Erste Fußball-WM', 1930], ['Erste Mondlandung', 1969], ['Erfindung von Tetris', 1984],
      ['Fall der Berliner Mauer', 1989], ['Erste SMS verschickt', 1992], ['Erstes Harry-Potter-Buch', 1997], ['Gründung von Google', 1998],
      ['Start von Wikipedia', 2001], ['Euro-Bargeld eingeführt', 2002], ['Start von Facebook', 2004], ['Start von YouTube', 2005],
      ['Erstes iPhone', 2007], ['Start von WhatsApp', 2009], ['Start von Instagram', 2010],
    ],
  },
  {
    topic: 'Einwohner (Millionen)', unit: 'Mio.',
    items: [
      ['China', 1410], ['USA', 335], ['Brasilien', 216], ['Japan', 124], ['Deutschland', 84], ['Frankreich', 68], ['Italien', 59],
      ['Spanien', 48], ['Kanada', 40], ['Polen', 37], ['Australien', 27], ['Niederlande', 18], ['Schweden', 10.5], ['Österreich', 9.1], ['Island', 0.4],
    ],
  },
  {
    topic: 'Flusslänge in Kilometern', unit: 'km',
    items: [
      ['Nil', 6650], ['Jangtsekiang', 6300], ['Mississippi', 3730], ['Wolga', 3530], ['Donau', 2850], ['Rhein', 1233],
      ['Elbe', 1094], ['Seine', 777], ['Main', 527], ['Themse', 346],
    ],
  },
  {
    topic: 'Gewicht in Kilogramm (ausgewachsen, ca.)', unit: 'kg',
    items: [
      ['Blauwal', 150000], ['Afrikanischer Elefant', 6000], ['Flusspferd', 1500], ['Giraffe', 1000], ['Eisbär', 450], ['Gorilla', 160],
      ['Strauß', 120], ['Kaiserpinguin', 30], ['Hauskatze', 4.5], ['Goldhamster', 0.15],
    ],
  },
];
export const HIGHER_LOWER_STEPS = 10;

/** Reihenfolge der Begriffe einer Runde (gleich für alle). */
export function makeHigherLower(rng) {
  const setIdx = rng.int(0, HIGHER_LOWER_SETS.length - 1);
  const n = HIGHER_LOWER_SETS[setIdx].items.length;
  const order = rng.shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, Math.min(n, HIGHER_LOWER_STEPS + 1));
  return { setIdx, order };
}

/** Richtig? guess: 'higher' | 'lower' – Vergleich Begriff i+1 mit Begriff i. */
export function higherLowerCorrect(game, i, guess) {
  const set = HIGHER_LOWER_SETS[game.setIdx];
  const a = set.items[game.order[i]][1];
  const b = set.items[game.order[i + 1]][1];
  return guess === (b > a ? 'higher' : 'lower');
}

// ------------------------------------------------------------------ Preisschild
/** Bekannte, feste Preise (Startpreise, Rekorde, amtliche Beträge). */
export const PRICE_ITEMS = [
  { q: 'PlayStation 5 (Standard) zum Marktstart 2020', a: 499.99, unit: '€' },
  { q: 'Nintendo Switch zum Marktstart 2017', a: 329.99, unit: '€' },
  { q: 'Erstes iPhone zum Start 2007 (USA, 4 GB)', a: 499, unit: '$' },
  { q: 'Game Boy zum Start in den USA 1989', a: 89.99, unit: '$' },
  { q: 'Apple Vision Pro zum Start 2024 (USA)', a: 3499, unit: '$' },
  { q: 'Briefmarke für einen Standardbrief in Deutschland (2025)', a: 0.95, unit: '€' },
  { q: 'Gesetzlicher Mindestlohn pro Stunde in Deutschland (2026)', a: 13.9, unit: '€' },
  { q: 'Transfer von Neymar zu Paris Saint-Germain (2017)', a: 222, unit: 'Mio. €' },
  { q: 'Gemälde „Salvator Mundi“ bei der Versteigerung 2017', a: 450, unit: 'Mio. $' },
  { q: '30-Sekunden-Werbespot beim Super Bowl 2024', a: 7, unit: 'Mio. $' },
  { q: 'Schlossallee bei Monopoly (Kaufpreis, deutsche Ausgabe)', a: 400, unit: 'Spielgeld' },
  { q: 'Erster VW Golf 1974 (Grundpreis)', a: 7995, unit: 'DM' },
];
export const PRICE_COUNT = 3;
export const makePriceRound = (rng) => ({ items: rng.shuffle(PRICE_ITEMS.map((_, i) => i)).slice(0, PRICE_COUNT) });

/** Abweichung in Prozent (0 = exakt). */
export const priceError = (guess, actual) => Math.round((Math.abs(guess - actual) / actual) * 1000) / 10;

/** „12,50“ / „12.5“ / „1.299“ → Zahl (oder NaN). */
export function parsePrice(text) {
  let s = String(text).trim().replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return Number(s);
}

// ------------------------------------------------------------------ Teams
/** Zwei Teams aus dem Seed – abwechselnd verteilt, damit sie gleich groß sind (±1). */
export function teamsOf(participants, seed) {
  const order = makeRng(`teams:${seed}`).shuffle(participants);
  return [order.filter((_, i) => i % 2 === 0), order.filter((_, i) => i % 2 === 1)];
}
export const TEAM_NAMES = ['Team Blau', 'Team Orange'];
export const TEAM_COLORS = ['#3B82F6', '#F97316'];

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** Punkte: Siegerteam je 2, Gleichstand je 1. winner = 0 | 1 | null */
function teamPoints(teams, winner) {
  const points = {};
  if (winner == null) teams.flat().forEach((id) => { points[id] = 1; });
  else teams[winner].forEach((id) => { points[id] = 2; });
  return points;
}

/** Tauziehen: Durchschnitt der Taps je Team (gleich große Chance bei ungleichen Teams). */
export function tugState(round) {
  const teams = teamsOf(round.participants, round.game.seed);
  const avg = teams.map((ids) => mean(ids.map((id) => round.results?.[id]?.taps ?? 0)));
  const total = avg[0] + avg[1];
  const pos = total ? (avg[1] - avg[0]) / total : 0; // −1 = ganz bei Team Blau, +1 = Team Orange
  return { teams, avg: avg.map((a) => Math.round(a * 10) / 10), pos };
}
export const TUG_MS = 10000;

export function tugResult(round) {
  const { teams, avg } = tugState(round);
  const winner = avg[0] === avg[1] ? null : avg[0] > avg[1] ? 0 : 1;
  const points = teamPoints(teams, winner);
  const stats = winner == null ? {} : Object.fromEntries(teams[winner].map((id) => [id, { teamWins: 1 }]));
  return { points, stats, extra: { winnerTeam: winner, teamAvg: avg } };
}

/** Team-Schätzen: Mittelwert der Schätzungen je Team; näher dran gewinnt. */
export function teamEstimateState(round, answer) {
  const teams = teamsOf(round.participants, round.game.seed);
  const means = teams.map((ids) => {
    const g = ids.map((id) => round.results?.[id]?.guess).filter((x) => typeof x === 'number');
    return g.length ? Math.round(mean(g) * 100) / 100 : null;
  });
  const diffs = means.map((m) => (m == null ? Infinity : Math.abs(m - answer)));
  return { teams, means, diffs };
}

export function teamEstimateResult(round, answer) {
  const { teams, means, diffs } = teamEstimateState(round, answer);
  const winner = diffs[0] === diffs[1] ? null : diffs[0] < diffs[1] ? 0 : 1;
  const stats = winner == null ? {} : Object.fromEntries(teams[winner].map((id) => [id, { teamWins: 1 }]));
  return { points: teamPoints(teams, winner), stats, extra: { winnerTeam: winner, teamMeans: means } };
}

// ------------------------------------------------------------------ Blind-Skizze
export const SKETCH_PROMPTS = [
  'Katze', 'Fahrrad', 'Pizza', 'Haus mit Garten', 'Elefant', 'Leuchtturm', 'Schneemann', 'Gitarre', 'Dinosaurier',
  'Rakete', 'Kaffeetasse', 'Brille', 'Ein Schwein auf Skiern', 'Eiffelturm', 'Schildkröte', 'Hubschrauber',
  'Ein Hund mit Sonnenbrille', 'Weihnachtsbaum', 'Achterbahn', 'Kuh auf dem Mond',
];
export const SKETCH = { drawMs: 25000, maxPoints: 1600 };

/** Striche [[[x,y],…],…] (0…1000) ↔ kompakter Text „x,y x,y|x,y …“ (spart Platz in Firestore). */
export function encodeSketch(strokes) {
  let budget = SKETCH.maxPoints;
  const out = [];
  for (const s of strokes) {
    if (budget <= 0) break;
    const pts = s.slice(0, budget);
    budget -= pts.length;
    out.push(pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' '));
  }
  return out.join('|');
}
export function decodeSketch(text) {
  if (!text) return [];
  return text.split('|').map((s) => s.split(' ').map((p) => p.split(',').map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite)));
}

/** Stimmen zählen: jeder Spieler stimmt für eine fremde Zeichnung. */
export function sketchVotes(round) {
  const counts = Object.fromEntries(round.participants.filter((id) => round.results?.[id]?.sketch != null).map((id) => [id, 0]));
  for (const [uid, r] of Object.entries(round.results || {})) {
    if (r?.vote && r.vote !== uid && counts[r.vote] !== undefined) counts[r.vote] += 1;
  }
  return counts;
}

/** Platz 1/2/3 nach Stimmen → 3/2/1 Punkte (Gleichstand teilt den Platz); 0 Stimmen = 0 Punkte. */
export function sketchResult(round) {
  const counts = sketchVotes(round);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const ranks = {};
  const points = {};
  sorted.forEach(([id, c], i) => {
    ranks[id] = i > 0 && c === sorted[i - 1][1] ? ranks[sorted[i - 1][0]] : i + 1;
    if (c > 0) points[id] = [3, 2, 1][ranks[id] - 1] ?? 0;
  });
  const stats = Object.fromEntries(Object.entries(counts).filter(([, c]) => c).map(([id, c]) => [id, { sketchVotes: c }]));
  return { points, stats, ranks, extra: { votes: counts } };
}
