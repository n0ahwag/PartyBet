import { collection, doc, getDocs, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { GAMES } from './gameLibrary.js';
import { FORMAT_RESULT } from '../minigames/format.js';
import { crewId, nameKey, applyParty, applyRecords, applyWeekBoard, withBadges } from './crew.js';
import { weekKey } from './weekly.js';
import { createRoom } from './engine.js';

/*
 * Firestore-Teil von Crew, Rekorden & Revanche. Schreibt nur der Host.
 *   crews/{crewId}          ewige Tabelle, Rekorde, Abzeichen (siehe crew.js)
 *   weekRecords/{2026-W45}  games.{gameId} = Top 5 der Woche über alle Partys
 */
const roomRef = (code) => doc(db, 'rooms', code);
const roundRef = (code, id) => doc(db, 'rooms', code, 'rounds', id);
const crewRef = (id) => doc(db, 'crews', id);
const weekRef = (key) => doc(db, 'weekRecords', key);

async function playerSnaps(code) {
  return (await getDocs(collection(db, 'rooms', code, 'players'))).docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Party-Ende: Sieger, direkte Vergleiche, Serien, Abzeichen in die Crew übernehmen (einmal pro Party). */
export async function recordParty(code) {
  const players = await playerSnaps(code);
  return runTransaction(db, async (tx) => {
    const room = (await tx.get(roomRef(code))).data();
    if (!room || room.crewRecorded) return null;
    const id = crewId(players.map((p) => p.name));
    if (!id) { tx.update(roomRef(code), { crewRecorded: true }); return null; }
    const snap = await tx.get(crewRef(id));
    const prev = snap.exists() ? snap.data() : null;
    const { crew, newBadges, winner } = applyParty(prev, { players, room });
    tx.set(crewRef(id), { ...crew, updatedAt: serverTimestamp() });
    const byNk = Object.fromEntries(players.map((p) => [nameKey(p.name), p.id]));
    const badgesByUid = Object.fromEntries(Object.entries(newBadges).filter(([nk]) => byNk[nk]).map(([nk, b]) => [byNk[nk], b]));
    tx.update(roomRef(code), { crewRecorded: true, crew: { id, winner, newBadges: badgesByUid } });
    return id;
  });
}

/**
 * Nach einer gewerteten Runde: persönliche Rekorde (pro Crew-Mitglied) und Wochen-Bestenliste prüfen.
 * Ergebnis landet in round.records = { uid: { first, prev, week } } – die Geräte feiern das.
 */
export async function recordRoundRecords(code, roundId) {
  const players = await playerSnaps(code);
  const id = crewId(players.map((p) => p.name));
  return runTransaction(db, async (tx) => {
    const round = (await tx.get(roundRef(code, roundId))).data();
    const room = (await tx.get(roomRef(code))).data();
    const game = GAMES[round?.gameId];
    if (!round || round.records || !game?.groupScore || game.groupOnly || game.judge !== 'auto') return null;
    const key = room?.week?.key ?? weekKey();
    const crewSnap = id ? await tx.get(crewRef(id)) : null;
    const weekSnap = await tx.get(weekRef(key));
    const fmt = FORMAT_RESULT[round.gameId];
    const byId = Object.fromEntries(players.map((p) => [p.id, p]));
    const entries = round.participants.map((uid) => {
      const r = round.results?.[uid];
      if (!r || !byId[uid]) return null;
      const s = game.groupScore(r, uid, round);
      return Number.isFinite(s) ? { uid, nk: nameKey(byId[uid].name), name: byId[uid].name, s, txt: fmt ? fmt(r, round, uid) : '' } : null;
    }).filter(Boolean);
    if (!entries.length) { tx.update(roundRef(code, roundId), { records: {} }); return null; }

    const records = {};
    if (id) {
      const prevCrew = crewSnap.exists() ? crewSnap.data() : null;
      const { crew, records: pb } = applyRecords(prevCrew, { gameId: round.gameId, entries });
      Object.assign(records, Object.fromEntries(Object.entries(pb).map(([uid, v]) => [uid, { ...v }])));
      // Wochen-Bestenliste
      const week = weekSnap.exists() ? weekSnap.data() : { games: {} };
      const before = week.games?.[round.gameId] || [];
      const after = applyWeekBoard(before, entries);
      const topBefore = before[0]?.nk;
      for (const e of entries) {
        const pos = after.findIndex((x) => x.nk === e.nk && x.s === e.s);
        if (pos >= 0) records[e.uid] = { ...(records[e.uid] || {}), week: pos + 1 };
      }
      if (after[0] && after[0].nk !== topBefore && entries.some((e) => e.nk === after[0].nk)) {
        crew.totals = crew.totals || {};
        crew.totals[after[0].nk] = { ...(crew.totals[after[0].nk] || {}), weekTops: (crew.totals[after[0].nk]?.weekTops ?? 0) + 1 };
      }
      tx.set(crewRef(id), { ...withBadges(crew, prevCrew).crew, updatedAt: serverTimestamp() });
      tx.set(weekRef(key), { key, games: { ...(week.games || {}), [round.gameId]: after } });
    }
    tx.update(roundRef(code, roundId), { records });
    return records;
  });
}

/**
 * Revanche: gleiche Einstellungen, neuer Raum. Die Handys sehen room.rematch und treten
 * mit ihrem Namen & Avatar automatisch bei.
 */
export async function createRematch(code, hostId) {
  const players = await playerSnaps(code);
  const old = (await runTransaction(db, async (tx) => (await tx.get(roomRef(code))).data()));
  if (old.rematch) return old.rematch;
  const next = await createRoom({
    hostId,
    mode: old.mode,
    expectedPlayers: old.gameMode === 'library' ? old.expectedPlayers : Math.max(2, players.length),
    equipment: old.equipment || [],
    totalRounds: old.totalRounds,
    liveEvents: old.liveEvents !== false,
    gameMode: old.gameMode,
    boardLength: old.board?.length ?? 'normal',
    stealth: !!old.stealth,
  });
  await updateDoc(roomRef(code), { rematch: next });
  return next;
}
