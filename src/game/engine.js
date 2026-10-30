import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, runTransaction,
  serverTimestamp, increment, deleteDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import {
  START_BALANCE, BETTING_SECONDS, POWERUPS, POWERUP_IDS, SABOTAGE_RULES, RESCUE_OPTIONS,
  LOAN_INTEREST, EMERGENCY_TASKS, VIDEO_PROMPTS, PLAYER_COLORS, AVATARS, phaseForRound,
} from './constants.js';
import { filterLibrary, planDuel } from './gameLibrary.js';
import { lockDuel, settleDuel, applyRepayments } from './economy.js';
import { createLiveEvent, shouldTriggerLiveEvent } from './liveEvents.js';
import { makeRng, makeRoomCode } from '../lib/random.js';

/*
 * Autoritäts-Modell: Spieler schreiben nur "Absichten" (Wetten, Power-ups,
 * Spiel-Eingaben, Rettungsanfragen). Alle Kontostände ändert ausschließlich
 * das Host-Gerät in Transaktionen. Siehe docs/DATABASE.md.
 */

const roomRef = (code) => doc(db, 'rooms', code);
const playersCol = (code) => collection(db, 'rooms', code, 'players');
const playerRef = (code, uid) => doc(db, 'rooms', code, 'players', uid);
const duelRef = (code, duelId) => doc(db, 'rooms', code, 'duels', duelId);
const rescueRef = (code, id) => doc(db, 'rooms', code, 'rescues', id);
const eventsCol = (code) => collection(db, 'rooms', code, 'events');

export const EMPTY_STATS = {
  eventLosses: 0, duelsWon: 0, duelsLost: 0, betsWon: 0, betsLost: 0, betProfit: 0,
  sipsDrunk: 0, sipsDistributed: 0, sabotages: 0, sabotaged: 0, bankruptcies: 0,
  biggestBet: 0, powerupsUsed: 0, shieldSaves: 0, rescues: 0, loansGiven: 0,
};

const randomPowerup = (rng) => rng.pick(POWERUP_IDS);
const stripNulls = (obj = {}) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));

// ------------------------------------------------------------------ Lobby

export async function createRoom({ hostId, mode, expectedPlayers, equipment, totalRounds, liveEvents = true }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode();
    const ref = roomRef(code);
    const created = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return false;
      tx.set(ref, {
        code,
        hostId,
        mode, // 'screen' | 'mobile'
        status: 'lobby', // lobby | playing | finished
        expectedPlayers,
        equipment,
        library: filterLibrary({ playerCount: expectedPlayers, equipment }).map((g) => g.id),
        totalRounds: Math.min(totalRounds, filterLibrary({ playerCount: expectedPlayers, equipment }).length),
        round: 0,
        phase: 'warmup',
        currentDuelId: null,
        lastGameId: null,
        lastDuelists: [],
        playedGames: [], // jedes Spiel nur einmal pro Party
        liveEvents,
        liveEvent: null,
        lastEventRound: -1,
        createdAt: serverTimestamp(),
      });
      return true;
    });
    if (created) return code;
  }
  throw new Error('Konnte keinen freien Raumcode finden.');
}

export async function updateLobby(code, { expectedPlayers, equipment, totalRounds }) {
  const library = filterLibrary({ playerCount: expectedPlayers, equipment }).map((g) => g.id);
  await updateDoc(roomRef(code), {
    expectedPlayers,
    equipment,
    totalRounds: Math.min(totalRounds, library.length), // jedes Spiel nur einmal
    library,
  });
}

export async function joinRoom(code, uid, { name, avatar, caps }) {
  const room = await getDoc(roomRef(code));
  if (!room.exists()) throw new Error('Raum nicht gefunden.');
  const existing = await getDoc(playerRef(code, uid));
  if (existing.exists()) {
    await updateDoc(playerRef(code, uid), { name, avatar, caps });
    return;
  }
  if (room.data().status !== 'lobby') throw new Error('Das Spiel läuft schon.');
  const count = (await getDocs(playersCol(code))).size;
  if (count >= room.data().expectedPlayers) throw new Error('Der Raum ist voll.');
  const rng = makeRng(`${code}:${uid}`);
  await setDoc(playerRef(code, uid), {
    name: name.trim().slice(0, 16),
    avatar: avatar || AVATARS[count % AVATARS.length],
    color: PLAYER_COLORS[count % PLAYER_COLORS.length],
    balance: START_BALANCE,
    inventory: { shield: 0, doubleDown: 0, sabotage: 0, joker: 0, [randomPowerup(rng)]: 1 },
    debts: [],
    caps: caps || {},
    bankrupt: false,
    isHost: uid === room.data().hostId,
    stats: EMPTY_STATS,
    joinedAt: serverTimestamp(),
  });
}

export async function kickPlayer(code, uid) {
  await deleteDoc(playerRef(code, uid));
}

export async function startGame(code) {
  await updateDoc(roomRef(code), { status: 'playing', startedAt: serverTimestamp() });
  return drawDuel(code);
}

// ------------------------------------------------------------------ Duell-Zyklus

async function playerRefs(code) {
  return (await getDocs(playersCol(code))).docs.map((d) => d.ref);
}

/** Lost die nächsten Duellanten + Spiel aus und legt das Duell-Dokument an. */
export async function drawDuel(code) {
  const refs = await playerRefs(code);
  return runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef(code));
    const room = roomSnap.data();
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const players = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));

    const round = room.round + 1;
    if (round > room.totalRounds) {
      tx.update(roomRef(code), { status: 'finished', finishedAt: serverTimestamp() });
      return null;
    }
    const phase = phaseForRound(round, room.totalRounds);
    const seed = `${code}:${round}:${Date.now()}`;
    const rng = makeRng(seed);

    const solvent = players.filter((p) => p.balance > 0);
    if (solvent.length < 2) {
      throw new Error('Zu wenige Spieler mit Schlücken – erst Pleite-Rettungen abschließen!');
    }

    // Wunschreihenfolge: Sudden Death = die Führenden, sonst Ausgeruhte zuerst
    const ordered = phase === 'suddenDeath'
      ? [...solvent].sort((a, b) => b.balance - a.balance)
      : [
        ...rng.shuffle(solvent.filter((p) => !room.lastDuelists.includes(p.id))),
        ...rng.shuffle(solvent.filter((p) => room.lastDuelists.includes(p.id))),
      ];
    const playedGames = room.playedGames || [];
    const plan = planDuel({ orderedPlayers: ordered, libraryIds: room.library, playedIds: playedGames, seed });
    if (!plan) {
      // Alle passenden Spiele wurden schon gespielt → Party ist vorbei
      tx.update(roomRef(code), { status: 'finished', finishedAt: serverTimestamp(), endedEarly: 'noGamesLeft' });
      return null;
    }
    const { duelists, game } = plan;

    const duelId = `r${String(round).padStart(2, '0')}`;
    tx.set(duelRef(code, duelId), {
      round,
      phase,
      gameId: game.id,
      game: game.createState(rng, { phase }),
      playerA: duelists[0].id,
      playerB: duelists[1].id,
      stage: 'intro', // intro | betting | playing | review | resolved
      bets: {},
      powerups: {},
      activePowerups: {},
      results: {},
      sabotage: null,
      winnerId: null,
      createdAt: serverTimestamp(),
    });
    tx.update(roomRef(code), {
      round,
      phase,
      currentDuelId: duelId,
      lastGameId: game.id,
      playedGames: [...playedGames, game.id],
      lastDuelists: duelists.map((d) => d.id),
      ...(phase !== room.phase ? { phaseChangedAt: Date.now() } : {}),
    });
    return duelId;
  });
}

/** Host öffnet die Wetten. Vorher wird ein evtl. Joker-Tausch verarbeitet. */
export async function openBetting(code, duelId) {
  return runTransaction(db, async (tx) => {
    const dSnap = await tx.get(duelRef(code, duelId));
    const duel = dSnap.data();
    const update = { stage: 'betting', bettingEndsAt: Date.now() + BETTING_SECONDS * 1000 };

    for (const uid of [duel.playerA, duel.playerB]) {
      const pu = duel.powerups?.[uid];
      if (pu?.type !== 'joker' || !pu.target) continue;
      if (pu.target === duel.playerA || pu.target === duel.playerB) continue;
      const pRef = playerRef(code, uid);
      const tRef = playerRef(code, pu.target);
      const [p, t] = await Promise.all([tx.get(pRef), tx.get(tRef)]);
      if (!p.exists() || !t.exists() || (p.data().inventory?.joker ?? 0) < 1 || t.data().balance <= 0) continue;
      tx.update(pRef, { 'inventory.joker': increment(-1), 'stats.powerupsUsed': increment(1) });
      update[uid === duel.playerA ? 'playerA' : 'playerB'] = pu.target;
      update.jokerSwap = { from: uid, to: pu.target };
      update[`powerups.${uid}`] = null;
      break; // nur ein Tausch pro Duell
    }
    tx.update(duelRef(code, duelId), update);
  });
}

export async function placeBet(code, duelId, uid, on, amount) {
  await updateDoc(duelRef(code, duelId), { [`bets.${uid}`]: { on, amount: Math.floor(amount) } });
}

export async function cancelBet(code, duelId, uid) {
  await updateDoc(duelRef(code, duelId), { [`bets.${uid}`]: null });
}

export async function activatePowerup(code, duelId, uid, type, target = null) {
  if (!POWERUPS[type]) throw new Error('Unbekanntes Power-up');
  await updateDoc(duelRef(code, duelId), { [`powerups.${uid}`]: { type, target } });
}

/** Wetten schließen: Power-ups validieren, Einsätze abbuchen, Spiel starten. */
export async function lockBetsAndPlay(code, duelId) {
  const refs = await playerRefs(code);
  return runTransaction(db, async (tx) => {
    const dSnap = await tx.get(duelRef(code, duelId));
    const duel = dSnap.data();
    if (duel.stage !== 'betting') return;
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const players = Object.fromEntries(snaps.filter((s) => s.exists()).map((s) => [s.id, s.data()]));
    const balances = Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.balance]));
    const rng = makeRng(`${duelId}:lock:${Date.now()}`);

    // Power-ups prüfen (Inventar vorhanden, Ziel gültig)
    const activePowerups = {};
    let sabotage = null;
    const playerUpdates = {};
    const addUpdate = (uid, patch) => { playerUpdates[uid] = { ...(playerUpdates[uid] || {}), ...patch }; };
    for (const [uid, pu] of Object.entries(duel.powerups || {})) {
      if (!pu || pu.type === 'joker' || !players[uid]) continue;
      if ((players[uid].inventory?.[pu.type] ?? 0) < 1) continue;
      if (pu.type === 'sabotage') {
        if (sabotage || ![duel.playerA, duel.playerB].includes(pu.target) || pu.target === uid) continue;
        sabotage = { by: uid, target: pu.target, rule: rng.pick(SABOTAGE_RULES) };
        addUpdate(uid, { 'stats.sabotages': increment(1) });
        addUpdate(pu.target, { 'stats.sabotaged': increment(1) });
      }
      activePowerups[uid] = pu;
      addUpdate(uid, { [`inventory.${pu.type}`]: increment(-1), 'stats.powerupsUsed': increment(1) });
    }

    const { stakes, bets, odds, debits } = lockDuel({ ...duel, bets: stripNulls(duel.bets) }, balances);
    for (const [uid, amount] of Object.entries(debits)) {
      addUpdate(uid, { balance: increment(-amount) });
      if (bets[uid] && amount > (players[uid].stats?.biggestBet ?? 0)) addUpdate(uid, { 'stats.biggestBet': amount });
    }
    for (const [uid, patch] of Object.entries(playerUpdates)) tx.update(playerRef(code, uid), patch);

    tx.update(duelRef(code, duelId), {
      stage: 'playing',
      stakes, bets, odds,
      activePowerups,
      sabotage,
      playStartedAt: Date.now(),
    });
  });
}

export async function submitResult(code, duelId, key, data) {
  await updateDoc(duelRef(code, duelId), { [`results.${key}`]: data });
}

/** winnerId = UID oder null (Unentschieden → Einsätze zurück). */
export async function declareWinner(code, duelId, winnerId) {
  await updateDoc(duelRef(code, duelId), { stage: 'review', winnerId });
}

/** Auszahlung + Statistiken + Belohnung + Pleite-Erkennung. */
export async function settle(code, duelId) {
  const refs = await playerRefs(code);
  return runTransaction(db, async (tx) => {
    const dSnap = await tx.get(duelRef(code, duelId));
    const duel = dSnap.data();
    if (duel.stage !== 'review') return;
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const players = Object.fromEntries(snaps.filter((s) => s.exists()).map((s) => [s.id, s.data()]));
    const balances = Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.balance]));
    const debts = Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.debts || []]));

    const result = settleDuel(duel, duel.winnerId, balances, debts);
    const rng = makeRng(`${duelId}:reward`);
    const reward = duel.winnerId ? randomPowerup(rng) : null;

    const involved = new Set([...Object.keys(result.credits), ...Object.keys(result.net)]);
    for (const uid of involved) {
      const p = players[uid];
      if (!p) continue;
      const credit = result.credits[uid] ?? 0;
      const net = result.net[uid] ?? 0;
      const isDuelist = uid === duel.playerA || uid === duel.playerB;
      const newBalance = Math.max(0, p.balance + credit);
      const patch = { balance: newBalance };
      const out = result.outcome[uid];
      if (out === 'won') {
        patch[isDuelist ? 'stats.duelsWon' : 'stats.betsWon'] = increment(1);
        patch['stats.sipsDistributed'] = increment(result.distribute[uid] ?? 0);
        if (!isDuelist) patch['stats.betProfit'] = increment(result.profit[uid] ?? 0);
      } else if (out === 'lost' || out === 'shielded') {
        patch[isDuelist ? 'stats.duelsLost' : 'stats.betsLost'] = increment(1);
        if (out === 'shielded') patch['stats.shieldSaves'] = increment(1);
        patch['stats.sipsDrunk'] = increment(-net);
        if (!isDuelist) patch['stats.betProfit'] = increment(net);
      }
      if (uid === duel.winnerId && reward) patch[`inventory.${reward}`] = increment(1);
      if (result.repayments.some((r) => r.from === uid)) {
        patch.debts = applyRepayments(p.debts, result.repayments, uid);
      }
      if (newBalance === 0 && !p.bankrupt) {
        patch.bankrupt = true;
        patch['stats.bankruptcies'] = increment(1);
      } else if (newBalance > 0 && p.bankrupt) {
        patch.bankrupt = false;
      }
      tx.update(playerRef(code, uid), patch);
    }

    tx.update(duelRef(code, duelId), {
      stage: 'resolved',
      settlement: { ...result, reward },
    });
    tx.set(doc(eventsCol(code)), {
      type: 'duel',
      duelId,
      round: duel.round,
      phase: duel.phase,
      gameId: duel.gameId,
      playerA: duel.playerA,
      playerB: duel.playerB,
      winnerId: duel.winnerId,
      net: result.net,
      distribute: result.distribute,
      sabotage: duel.sabotage || null,
      at: serverTimestamp(),
    });
  });
}

export async function finishGame(code) {
  await updateDoc(roomRef(code), { status: 'finished', finishedAt: serverTimestamp() });
}

// ------------------------------------------------------------------ Pleite-Rettung

export async function requestRescue(code, uid, type, { lenderId, amount } = {}) {
  const rng = makeRng(`${uid}:${Date.now()}`);
  const prompt = type === 'task' ? rng.pick(EMERGENCY_TASKS) : type === 'video' ? rng.pick(VIDEO_PROMPTS) : null;
  await addDoc(collection(db, 'rooms', code, 'rescues'), {
    playerId: uid,
    type,
    prompt,
    lenderId: lenderId || null,
    amount: type === 'loan' ? Math.max(1, Math.floor(amount || 3)) : RESCUE_OPTIONS[type].reward,
    // loan: 'asked' → Kreditgeber 'accepted'/'declined' → Host 'approved'
    status: type === 'loan' ? 'asked' : 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function answerLoan(code, rescueId, accept) {
  await updateDoc(rescueRef(code, rescueId), { status: accept ? 'accepted' : 'declined' });
}

/** Host bestätigt (oder lehnt ab). Bei Krediten wird zwischen Spielern umgebucht. */
export async function resolveRescue(code, rescueId, approve) {
  return runTransaction(db, async (tx) => {
    const rSnap = await tx.get(rescueRef(code, rescueId));
    const r = rSnap.data();
    if (!r || r.status === 'approved' || r.status === 'rejected') return;
    if (!approve) {
      tx.update(rescueRef(code, rescueId), { status: 'rejected' });
      return;
    }
    const pRef = playerRef(code, r.playerId);
    const p = (await tx.get(pRef)).data();
    let amount = r.amount;
    let debt = null;
    if (r.type === 'loan') {
      if (r.status !== 'accepted') return;
      const lRef = playerRef(code, r.lenderId);
      const lender = (await tx.get(lRef)).data();
      amount = Math.min(amount, lender.balance);
      if (amount <= 0) {
        tx.update(rescueRef(code, rescueId), { status: 'rejected' });
        return;
      }
      tx.update(lRef, { balance: increment(-amount), 'stats.loansGiven': increment(1) });
      debt = { to: r.lenderId, amount: Math.ceil(amount * (1 + LOAN_INTEREST)) };
    } else if (r.type === 'borrow') {
      debt = { to: 'bank', amount };
    }
    tx.update(pRef, {
      balance: increment(amount),
      bankrupt: false,
      'stats.rescues': increment(1),
      ...(debt ? { debts: [...(p.debts || []), debt] } : {}),
    });
    tx.update(rescueRef(code, rescueId), { status: 'approved', amount });
  });
}

// ------------------------------------------------------------------ Live-Events

const liveEventRef = (code, id) => doc(db, 'rooms', code, 'liveEvents', id);

/** "Nächstes Duell": manchmal kommt stattdessen ein spontanes Live-Event. */
export async function nextStep(code) {
  const room = (await getDoc(roomRef(code))).data();
  if (shouldTriggerLiveEvent(room)) return triggerLiveEvent(code, { thenDraw: true });
  return drawDuel(code);
}

/** Startet ein Live-Event für alle Geräte gleichzeitig (über das Raum-Dokument). */
export async function triggerLiveEvent(code, { type, thenDraw = false } = {}) {
  const room = (await getDoc(roomRef(code))).data();
  const id = `e${Date.now()}`;
  const ev = createLiveEvent(makeRng(`${code}:${id}`), type);
  const batch = writeBatch(db);
  batch.set(liveEventRef(code, id), { ...ev, status: 'active', reactions: {}, createdAt: serverTimestamp() });
  batch.update(roomRef(code), {
    liveEvent: { id, ...ev, status: 'active', loserId: null, thenDraw, startedAt: Date.now() },
    lastEventRound: room.round,
  });
  await batch.commit();
}

/** Spieler meldet seine Sensor-Reaktion (z. B. bei "Statue!" bewegt nach X ms). */
export async function reactLiveEvent(code, id, uid, data) {
  await updateDoc(liveEventRef(code, id), { [`reactions.${uid}`]: data });
}

/** Host legt fest, wer trinkt (loserId null = niemand). */
export async function resolveLiveEvent(code, id, loserId) {
  const batch = writeBatch(db);
  batch.update(roomRef(code), { 'liveEvent.status': 'done', 'liveEvent.loserId': loserId });
  batch.update(liveEventRef(code, id), { status: 'done', loserId });
  if (loserId) batch.update(playerRef(code, loserId), { 'stats.eventLosses': increment(1) });
  await batch.commit();
}

/** Event schließen und – falls es "Nächstes Duell" ersetzt hat – direkt auslosen. */
export async function closeLiveEvent(code) {
  const room = (await getDoc(roomRef(code))).data();
  await updateDoc(roomRef(code), { liveEvent: null });
  if (room.liveEvent?.thenDraw) await drawDuel(code);
}
