/*
 * Crew-Rivalität, Rekorde & Abzeichen – ohne Anmeldung.
 * Eine „Crew“ ist eine Gruppe mit denselben Spielernamen (Groß-/Kleinschreibung egal).
 * Spielt ihr wieder zusammen, findet die App eure ewige Tabelle, eure Rekorde und Abzeichen.
 *
 * Dokument crews/{crewId}:
 *   names    { nk: Anzeigename }
 *   parties  Anzahl Partys
 *   wins     { nk: Siege }
 *   h2h      { "a|b": { a: n, b: n } }  wer lag im direkten Vergleich vorne
 *   streak   { nk, n }                   aktuelle Siegesserie
 *   history  [{ at, winner, mode }]      letzte 12 Partys
 *   totals   { nk: { parties, wins, bestStreak, rockets, portals, obstaclesPassed, firstPlaces, duelsWon, betsWon, records, weekTops } }
 *   badges   { nk: [badgeId…] }
 *   records  { nk: { gameId: { s, txt } } }   persönliche Bestwerte (s: kleiner = besser)
 */

/** Stabiler Schlüssel für einen Namen (auch als Firestore-Map-Schlüssel geeignet). */
export function nameKey(name) {
  return String(name ?? '').trim().toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'spieler';
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/** Crew-Id aus den Namen aller Spieler (Reihenfolge egal). Mindestens 2 verschiedene Namen. */
export function crewId(names) {
  const keys = [...new Set(names.map(nameKey))].sort();
  return keys.length >= 2 ? `c_${hash(keys.join('|'))}` : null;
}

export const pairKey = (a, b) => [a, b].sort().join('|');

/** Endstand einer Party: [{ id, name, nk, score }] – bester zuerst. */
export function finalRanking(players, room) {
  const goal = room?.board?.fields?.length ? room.board.fields.length - 1 : 0;
  const score = (p) => {
    if (room?.gameMode === 'board') return (p.id === room.winnerId ? goal + 1000 : 0) + (p.position ?? 0);
    if (room?.gameMode === 'group' || room?.gameMode === 'library') return p.points ?? 0;
    return p.balance ?? 0; // Party-Modus: Schlücke
  };
  return players.map((p) => ({ id: p.id, name: p.name, nk: nameKey(p.name), score: score(p) }))
    .sort((a, b) => b.score - a.score);
}

// ------------------------------------------------------------------ Abzeichen
const T = (key) => (t) => t[key] ?? 0;
export const BADGES = [
  { id: 'firstWin', icon: '🏆', name: 'Erster Sieg', desc: 'Eine Party gewonnen', value: T('wins'), goal: 1 },
  { id: 'champion', icon: '👑', name: 'Champion', desc: '5 Partys gewonnen', value: T('wins'), goal: 5 },
  { id: 'legend', icon: '🌟', name: 'Legende', desc: '15 Partys gewonnen', value: T('wins'), goal: 15 },
  { id: 'hattrick', icon: '🎩', name: 'Hattrick', desc: '3 Partys in Folge gewonnen', value: T('bestStreak'), goal: 3 },
  { id: 'regular', icon: '🎉', name: 'Stammgast', desc: '5 Partys mit der Crew', value: T('parties'), goal: 5 },
  { id: 'veteran', icon: '🏛️', name: 'Party-Urgestein', desc: '20 Partys mit der Crew', value: T('parties'), goal: 20 },
  { id: 'roundWinner', icon: '🥇', name: 'Seriensieger', desc: '10 Runden auf Platz 1', value: T('firstPlaces'), goal: 10 },
  { id: 'rocket', icon: '🚀', name: 'Raketenpilot', desc: '5 Raketen gezündet', value: T('rockets'), goal: 5 },
  { id: 'portal', icon: '🌀', name: 'Portal-Pirat', desc: '3× per Portal den Platz getauscht', value: T('portals'), goal: 3 },
  { id: 'obstacle', icon: '🪨', name: 'Hindernis-Profi', desc: '10 Hindernisse gemeistert', value: T('obstaclesPassed'), goal: 10 },
  { id: 'duelist', icon: '🤺', name: 'Duell-Meister', desc: '10 Duelle gewonnen', value: T('duelsWon'), goal: 10 },
  { id: 'gambler', icon: '💰', name: 'Zocker', desc: '10 Wetten gewonnen', value: T('betsWon'), goal: 10 },
  { id: 'recordHunter', icon: '🔥', name: 'Rekordjäger', desc: '5 persönliche Rekorde', value: T('records'), goal: 5 },
  { id: 'weekKing', icon: '📅', name: 'Wochenkönig', desc: 'Platz 1 einer Wochen-Bestenliste', value: T('weekTops'), goal: 1 },
  { id: 'allrounder', icon: '🎮', name: 'Allrounder', desc: 'Rekorde in 15 verschiedenen Spielen', value: (t, extra) => extra.games ?? 0, goal: 15 },
  { id: 'nemesis', icon: '⚔️', name: 'Erzrivale', desc: '5× im direkten Vergleich vor derselben Person', value: (t, extra) => extra.bestH2h ?? 0, goal: 5 },
];
export const BADGE = Object.fromEntries(BADGES.map((b) => [b.id, b]));

function badgeExtra(crew, nk) {
  const games = Object.keys(crew.records?.[nk] || {}).length;
  const bestH2h = Math.max(0, ...Object.entries(crew.h2h || {}).filter(([k]) => k.split('|').includes(nk)).map(([, v]) => v[nk] ?? 0));
  return { games, bestH2h };
}

/** Alle Abzeichen, die ein Spieler laut Crew-Daten verdient hat. */
export function earnedBadges(crew, nk) {
  const tot = crew.totals?.[nk] || {};
  const extra = badgeExtra(crew, nk);
  return BADGES.filter((b) => b.value(tot, extra) >= b.goal).map((b) => b.id);
}

/** Nächstes erreichbares Abzeichen mit Fortschritt (für „Noch 1 Sieg bis …“). */
export function nextBadge(crew, nk) {
  const tot = crew.totals?.[nk] || {};
  const extra = badgeExtra(crew, nk);
  const have = new Set(crew.badges?.[nk] || []);
  return BADGES.filter((b) => !have.has(b.id))
    .map((b) => ({ badge: b, value: b.value(tot, extra), missing: b.goal - b.value(tot, extra) }))
    .filter((x) => x.value > 0 && x.missing > 0)
    .sort((a, b) => a.missing / a.badge.goal - b.missing / b.badge.goal)[0] ?? null;
}

const STAT_KEYS = ['rockets', 'portals', 'obstaclesPassed', 'firstPlaces', 'duelsWon', 'betsWon'];

/**
 * Party in die Crew-Daten eintragen (rein, ohne Firebase).
 * @returns { crew, newBadges: { nk: [ids] }, winner: nk }
 */
export function applyParty(prev, { players, room, at = Date.now() }) {
  const ranking = finalRanking(players, room);
  const crew = JSON.parse(JSON.stringify(prev || {}));
  crew.names = { ...(crew.names || {}) };
  crew.wins = { ...(crew.wins || {}) };
  crew.h2h = { ...(crew.h2h || {}) };
  crew.totals = { ...(crew.totals || {}) };
  crew.badges = { ...(crew.badges || {}) };
  crew.parties = (crew.parties ?? 0) + 1;
  const winner = ranking[0] && (ranking.length < 2 || ranking[0].score > ranking[1].score) ? ranking[0].nk : null;

  for (const p of players) {
    const nk = nameKey(p.name);
    crew.names[nk] = p.name;
    const tot = { ...(crew.totals[nk] || {}) };
    tot.parties = (tot.parties ?? 0) + 1;
    for (const k of STAT_KEYS) tot[k] = (tot[k] ?? 0) + (p.stats?.[k] ?? 0);
    crew.totals[nk] = tot;
  }
  if (winner) {
    crew.wins[winner] = (crew.wins[winner] ?? 0) + 1;
    crew.totals[winner].wins = (crew.totals[winner].wins ?? 0) + 1;
    crew.streak = crew.streak?.nk === winner ? { nk: winner, n: crew.streak.n + 1 } : { nk: winner, n: 1 };
    crew.totals[winner].bestStreak = Math.max(crew.totals[winner].bestStreak ?? 0, crew.streak.n);
  } else crew.streak = null;

  // Direkter Vergleich: wer stand am Ende vor wem?
  for (let i = 0; i < ranking.length; i++) {
    for (let j = i + 1; j < ranking.length; j++) {
      const a = ranking[i]; const b = ranking[j];
      if (a.nk === b.nk || a.score === b.score) continue;
      const k = pairKey(a.nk, b.nk);
      crew.h2h[k] = { ...(crew.h2h[k] || {}), [a.nk]: (crew.h2h[k]?.[a.nk] ?? 0) + 1 };
    }
  }
  crew.history = [...(crew.history || []), { at, winner, mode: room?.gameMode ?? 'party' }].slice(-12);
  const done = withBadges(crew, prev);
  return { crew: done.crew, newBadges: done.newBadges, winner };
}

/** Abzeichen neu berechnen; liefert die neu verdienten. */
export function withBadges(crew, prev) {
  const newBadges = {};
  const out = { ...crew, badges: { ...(crew.badges || {}) } };
  for (const nk of Object.keys(crew.names || {})) {
    const before = new Set(prev?.badges?.[nk] || []);
    const now = earnedBadges(out, nk);
    out.badges[nk] = now;
    const fresh = now.filter((b) => !before.has(b));
    if (fresh.length) newBadges[nk] = fresh;
  }
  return { crew: out, newBadges };
}

// ------------------------------------------------------------------ Rekorde
/**
 * Rekorde einer Runde prüfen. score(uid) → kleiner = besser, txt(uid) → Anzeige.
 * @returns { crew, records: { uid: { prev } } }  prev = alter Bestwert-Text (null = erster Eintrag)
 */
export function applyRecords(prev, { gameId, entries }) {
  const crew = JSON.parse(JSON.stringify(prev || {}));
  crew.records = crew.records || {};
  crew.totals = crew.totals || {};
  crew.names = crew.names || {};
  crew.parties = crew.parties ?? 0;
  const records = {};
  for (const e of entries) {
    if (!Number.isFinite(e.s)) continue;
    const mine = crew.records[e.nk] || {};
    const old = mine[gameId];
    if (old && old.s <= e.s) continue;
    crew.records[e.nk] = { ...mine, [gameId]: { s: e.s, txt: e.txt ?? '' } };
    crew.names[e.nk] = crew.names[e.nk] ?? e.name;
    if (old) { // erster Eintrag zählt nicht als „gebrochener Rekord“
      crew.totals[e.nk] = { ...(crew.totals[e.nk] || {}), records: (crew.totals[e.nk]?.records ?? 0) + 1 };
      records[e.uid] = { prev: old.txt ?? null, first: false };
    } else records[e.uid] = { prev: null, first: true };
  }
  return { crew, records };
}

export const WEEK_TOP = 5;

/** Wochen-Bestenliste eines Spiels aktualisieren: [{ nk, name, s, txt }] (kleiner = besser, je Name nur der Beste). */
export function applyWeekBoard(list = [], entries) {
  const best = new Map(list.map((x) => [x.nk, x]));
  for (const e of entries) {
    if (!Number.isFinite(e.s)) continue;
    const old = best.get(e.nk);
    if (!old || e.s < old.s) best.set(e.nk, { nk: e.nk, name: e.name, s: e.s, txt: e.txt ?? '' });
  }
  return [...best.values()].sort((a, b) => a.s - b.s).slice(0, WEEK_TOP);
}

// ------------------------------------------------------------------ Haken für „noch eine Runde!“
/**
 * Kurze Sätze für den Endbildschirm aus Sicht eines Spielers (nk) bzw. der Gruppe (nk = null).
 * Liefert Datenobjekte, die Oberfläche übersetzt sie.
 */
export function crewHooks(crew, nk = null) {
  if (!crew?.parties) return [];
  const hooks = [];
  const table = Object.entries(crew.wins || {}).sort((a, b) => b[1] - a[1]);
  const leader = table[0];
  if (crew.streak?.n >= 2) hooks.push({ type: 'streak', nk: crew.streak.nk, n: crew.streak.n });
  if (nk && leader && leader[0] !== nk) {
    const gap = leader[1] - (crew.wins?.[nk] ?? 0);
    if (gap > 0) hooks.push({ type: 'gap', nk, leader: leader[0], n: gap });
  }
  // knappster direkter Vergleich mit Rückstand
  const pairs = Object.entries(crew.h2h || {})
    .filter(([k]) => !nk || k.split('|').includes(nk))
    .map(([k, v]) => {
      const [a, b] = k.split('|');
      return { a, b, va: v[a] ?? 0, vb: v[b] ?? 0 };
    })
    .filter((p) => p.va + p.vb >= 2)
    .sort((x, y) => Math.abs(x.va - x.vb) - Math.abs(y.va - y.vb));
  const close = pairs[0];
  if (close) {
    const me = nk && close.b === nk ? 'b' : 'a';
    const [mine, other] = me === 'a' ? [close.a, close.b] : [close.b, close.a];
    hooks.push({ type: 'h2h', a: mine, b: other, va: me === 'a' ? close.va : close.vb, vb: me === 'a' ? close.vb : close.va });
  }
  if (nk) {
    const nb = nextBadge(crew, nk);
    if (nb) hooks.push({ type: 'badge', nk, badge: nb.badge.id, missing: nb.missing });
  }
  return hooks;
}
