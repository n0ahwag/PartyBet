import { makeRng } from '../lib/random.js';
import { teamsOf } from './extras.js';
import { makeMathTask, normalizeAnswer } from './gameLibrary.js';

/*
 * Team-Spiele (Team vs. Team & kooperativ): reine Logik, testbar.
 * Teams kommen immer aus teamsOf(participants, game.seed) – auf allen Geräten gleich.
 * Bei ungleich großen Teams zählt der Schnitt pro Kopf.
 */

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const teamsOfRound = (round) => teamsOf(round.participants, round.game.seed);
export const teamOf = (round, uid) => (teamsOfRound(round)[0].includes(uid) ? 0 : 1);

/** Siegerteam je 2 Punkte, Gleichstand je 1. */
export function teamPoints(teams, winner) {
  const points = {};
  if (winner == null) teams.flat().forEach((id) => { points[id] = 1; });
  else teams[winner].forEach((id) => { points[id] = 2; });
  return points;
}

/**
 * Allgemeine Team-Auswertung: value(id) je Spieler → Teamwert (Schnitt oder eigene Funktion).
 * higher = true: größerer Wert gewinnt.
 */
export function teamResult(round, { value, teamValue = null, higher = true }) {
  const teams = teamsOfRound(round);
  const vals = teams.map((ids) => (teamValue ? teamValue(ids) : mean(ids.map((id) => value(id) ?? 0))));
  const r = vals.map((v) => Math.round(v * 100) / 100);
  const winner = r[0] === r[1] ? null : (r[0] > r[1]) === higher ? 0 : 1;
  const stats = winner == null ? {} : Object.fromEntries(teams[winner].map((id) => [id, { teamWins: 1 }]));
  return { points: teamPoints(teams, winner), stats, extra: { winnerTeam: winner, teamValues: r } };
}

// ------------------------------------------------------------------ Schüttel-Marathon, Kompass-Riesenrad, Wippe, Licht
export const SHAKE_MS = 5000;
export const shakeResult = (round) => teamResult(round, { value: (id) => round.results?.[id]?.shakes });

export const WHEEL_MS = 30000;
export const WHEEL_PER_PERSON = 900; // 2,5 Umdrehungen pro Person = Team-Ziel
/** Fortschritt eines Teams (0…1): summierte Drehung / (Ziel × Teamgröße). */
export const wheelProgress = (round, ids) => clamp(ids.reduce((s, id) => s + Math.max(0, round.results?.[id]?.deg ?? 0), 0) / (WHEEL_PER_PERSON * ids.length), 0, 1);
export const wheelResult = (round) => teamResult(round, { teamValue: (ids) => wheelProgress(round, ids) });

export const SEESAW_MS = 20000;
export const SEESAW_TOL = 7; // ± Grad gelten als „im Gleichgewicht“
/** Wellen, die die Brücke kippen (Grad) – für alle gleich (Seed). */
export function seesawWave(seed, t) {
  const r = makeRng(`wave:${seed}`);
  const a = r.int(8, 13); const b = r.int(5, 9); const p = r.next() * 6;
  return Math.sin(t * 1.15 + p) * a + Math.sin(t * 0.47 + p * 2) * b;
}
export const seesawResult = (round) => teamResult(round, { value: (id) => round.results?.[id]?.balancedMs });

export const FLASH_FAIL_MS = 1500; // Frühstart / zu spät zählt wie 1,5 s
export const flashMs = (r) => (!r || r.jumpStart || r.ms == null ? FLASH_FAIL_MS : r.ms);
export const flashResult = (round) => teamResult(round, { value: (id) => flashMs(round.results?.[id]), higher: false });

// ------------------------------------------------------------------ Mathe-Staffel
export const RELAY_TASKS = 6;
export const RELAY_MS = 120000;
/** Aufgabe k – für beide Teams gleich. */
export const relayTask = (seed, k) => makeMathTask(makeRng(`relay:${seed}:${k}`), k < 2 ? 'warmup' : k < 4 ? 'chaos' : 'chaos');
/** Wer ist bei Aufgabe k dran? (der Reihe nach im Team, ggf. mehrmals) */
export const relayRunner = (ids, k) => ids[k % ids.length];
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : null);
/** Stand eines Teams: gelöste Aufgaben (der Reihe nach) und Zeitpunkt der letzten. */
export function relayState(round, ids) {
  let solved = 0; let lastAt = null;
  for (let k = 0; k < RELAY_TASKS; k++) {
    const at = ms(round.results?.[relayRunner(ids, k)]?.[`t${k}`]);
    if (at == null) break;
    solved += 1; lastAt = at;
  }
  return { solved, done: solved >= RELAY_TASKS, finishedAt: solved >= RELAY_TASKS ? lastAt : null };
}
export function relayResult(round) {
  const teams = teamsOfRound(round);
  const st = teams.map((ids) => relayState(round, ids));
  let winner = null;
  if (st[0].done && st[1].done) winner = st[0].finishedAt === st[1].finishedAt ? null : st[0].finishedAt < st[1].finishedAt ? 0 : 1;
  else if (st[0].done || st[1].done) winner = st[0].done ? 0 : 1;
  else winner = st[0].solved === st[1].solved ? null : st[0].solved > st[1].solved ? 0 : 1;
  const stats = winner == null ? {} : Object.fromEntries(teams[winner].map((id) => [id, { teamWins: 1 }]));
  return { points: teamPoints(teams, winner), stats, extra: { winnerTeam: winner, teamValues: st.map((s) => s.solved) } };
}

// ------------------------------------------------------------------ Team-Hivemind
/** Anteil der Teammitglieder mit exakt demselben (häufigsten) Begriff. */
export function hivemindTeam(round, ids) {
  const counts = {};
  ids.forEach((id) => { const w = normalizeAnswer(round.results?.[id]?.word ?? ''); if (w) counts[w] = (counts[w] ?? 0) + 1; });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { word: best?.[0] ?? null, count: best?.[1] ?? 0, share: best ? best[1] / ids.length : 0 };
}
export const teamHivemindResult = (round) => teamResult(round, { teamValue: (ids) => hivemindTeam(round, ids).share });

// ------------------------------------------------------------------ Wildwasser-Rafting (kooperativ, Host simuliert)
export const RIVER = { width: 10, length: 140, raftR: 0.9, timeMs: 80000, speed: 2.1, boost: 1.6, lateral: 3.4, lives: 3 };
export const RAFT_ROLES = ['left', 'right', 'speed'];
/** Rolle eines Spielers (Seed-Reihenfolge, gleichmäßig verteilt). */
export function raftRoles(round) {
  const order = makeRng(`roles:${round.game.seed}`).shuffle(round.participants);
  const n = order.length;
  const roles = n === 2 ? ['left', 'right'] : RAFT_ROLES;
  return Object.fromEntries(order.map((id, i) => [id, roles[i % roles.length]]));
}
/** Felsen im Fluss: [{ x, y, r }] – mit Abstand, immer umschiffbar. */
export function makeRiver(seed) {
  const r = makeRng(`river:${seed}`);
  const rocks = [];
  for (let y = 12; y < RIVER.length - 8; y += r.int(6, 9)) {
    const x = r.int(-34, 34) / 10;
    rocks.push({ x, y, r: r.int(5, 8) / 10 });
    // manchmal ein zweiter Felsen kurz dahinter – auf der anderen Seite (Slalom)
    if (r.next() < 0.35) rocks.push({ x: x > 0 ? r.int(-34, -12) / 10 : r.int(12, 34) / 10, y: y + 3.4, r: r.int(5, 8) / 10 });
  }
  return rocks;
}
export const raftStart = () => ({ x: 0, y: 0, hits: 0, hit: [], t: 0, done: false, ok: false });
/** Ein Simulationsschritt. inputs: { left: Anteil 0…1, right: 0…1, speed: 0…1 } */
export function raftStep(s, inputs, rocks, dt) {
  if (s.done) return s;
  const n = { ...s, hit: [...s.hit] };
  n.t += dt;
  n.x = clamp(n.x + (inputs.right - inputs.left) * RIVER.lateral * dt, -RIVER.width / 2 + RIVER.raftR, RIVER.width / 2 - RIVER.raftR);
  n.y += (RIVER.speed + inputs.speed * RIVER.boost) * dt;
  rocks.forEach((rk, i) => {
    if (n.hit.includes(i)) return;
    if (Math.hypot(n.x - rk.x, n.y - rk.y) < rk.r + RIVER.raftR) { n.hits += 1; n.hit.push(i); n.y -= 0.6; }
  });
  if (n.hits >= RIVER.lives) { n.done = true; n.ok = false; }
  if (n.y >= RIVER.length) { n.done = true; n.ok = true; n.y = RIVER.length; }
  if (n.t * 1000 >= RIVER.timeMs) n.done = true;
  return n;
}
/** Eingaben aus den Ergebnissen: Anteil der Spieler je Rolle, die gerade drücken. */
export function raftInputs(round) {
  const roles = raftRoles(round);
  const share = (role) => {
    const ids = Object.keys(roles).filter((id) => roles[id] === role);
    return ids.length ? ids.filter((id) => round.results?.[id]?.hold).length / ids.length : 0;
  };
  return { left: share('left'), right: share('right'), speed: share('speed') };
}
export function raftResult(round, sim) {
  const prog = clamp((sim?.y ?? 0) / RIVER.length, 0, 1);
  const pts = sim?.ok ? 3 : prog >= 0.5 ? 2 : prog >= 0.2 ? 1 : 0;
  const points = pts ? Object.fromEntries(round.participants.map((id) => [id, pts])) : {};
  return { points, stats: {}, extra: { raftOk: !!sim?.ok, raftProgress: Math.round(prog * 100), raftHits: sim?.hits ?? 0 } };
}

// ------------------------------------------------------------------ Touch-Parcours (Team, Host simuliert)
export const SHAFT = { width: 8, length: 90, ballR: 0.45, gap: 2.6, speed: 2.6, accel: 0.03, every: 7, timeMs: 60000, lives: 3 };
/** Tore im Schacht: [{ y, c }] – Lücke um c, Nachbar-Lücken nicht zu weit auseinander. */
export function makeShaft(seed) {
  const r = makeRng(`shaft:${seed}`);
  const gates = []; let c = 0;
  for (let y = 10; y < SHAFT.length; y += SHAFT.every) { c = clamp(c + r.int(-25, 25) / 10, -2.4, 2.4); gates.push({ y, c }); }
  return gates;
}
/** Position der Kugel: Schnitt der Schieberegler aller Teammitglieder (0…1). */
export const shaftX = (round, ids) => (mean(ids.map((id) => round.results?.[id]?.s ?? 0.5)) - 0.5) * (SHAFT.width - SHAFT.ballR * 2);
export const shaftStart = () => [0, 1].map(() => ({ y: 0, x: 0, alive: true, finishedAt: null, lives: SHAFT.lives, hitAt: null }));
export function shaftStep(state, xs, gates, dt, t) {
  return state.map((b, i) => {
    if (!b.alive || b.finishedAt != null) return b;
    const n = { ...b, x: xs[i] };
    const prevY = n.y;
    n.y += (SHAFT.speed + t * SHAFT.accel) * dt;
    for (const g of gates) {
      // Tor verfehlt: ein Leben weg (bei 0 ist das Team raus), sonst geht's weiter
      if (prevY < g.y && n.y >= g.y && Math.abs(n.x - g.c) > SHAFT.gap / 2 - SHAFT.ballR) {
        n.lives = (n.lives ?? SHAFT.lives) - 1; n.hitAt = t;
        if (n.lives <= 0) { n.alive = false; n.y = g.y - 0.01; }
        break;
      }
    }
    if (n.alive && n.y >= SHAFT.length) { n.y = SHAFT.length; n.finishedAt = t; }
    return n;
  });
}
export function shaftResult(round, sim) {
  const teams = teamsOfRound(round);
  const s = sim?.balls ?? shaftStart();
  const score = (b) => (b.finishedAt != null ? 1e6 - b.finishedAt + (b.lives ?? 0) * 1e3 : b.y);
  const a = score(s[0]); const b = score(s[1]);
  const winner = Math.abs(a - b) < 1e-6 ? null : a > b ? 0 : 1;
  const stats = winner == null ? {} : Object.fromEntries(teams[winner].map((id) => [id, { teamWins: 1 }]));
  return { points: teamPoints(teams, winner), stats, extra: { winnerTeam: winner, teamValues: s.map((x) => Math.round((x.y / SHAFT.length) * 100)) } };
}
