import {
  collection, doc, getDocs, updateDoc, runTransaction, serverTimestamp, increment,
} from 'firebase/firestore';
import { db, expiry } from '../firebase.js';
import { GAMES, groupPlayable, chooseNextGame } from './gameLibrary.js';
import { cycleIds, rememberPlayed } from '../lib/playCycle.js';
import { roundMods, introMs } from './weekly.js';
import { applyRound, boardPhase, CHAOS_PENALTY } from './board.js';
import { triggerLiveEvent } from './engine.js';
import { makeRng } from '../lib/random.js';
import { weeklyCounts, recordPlay } from './gameStats.js';

/*
 * Spielfeld-Modus: Firestore-Schreibvorgänge. Wie im Party-Modus gilt:
 * Spieler schreiben nur ihr eigenes Ergebnis, Positionen ändert nur der Host.
 *
 * Ablauf einer Runde (rooms/{code}/rounds/{id}.stage):
 *   intro → playing → review (Platzierungen, Würfeln per Antippen) → resolved (gezogen)
 */

const roomRef = (code) => doc(db, 'rooms', code);
const roundRef = (code, id) => doc(db, 'rooms', code, 'rounds', id);
const playerRef = (code, uid) => doc(db, 'rooms', code, 'players', uid);

async function playerRefs(code) {
  return (await getDocs(collection(db, 'rooms', code, 'players'))).docs.map((d) => d.ref);
}

/** So lange stehen die Regeln, bevor die Challenge automatisch startet. */
export const BOARD_INTRO_MS = 10000;

export async function startBoardGame(code) {
  await updateDoc(roomRef(code), { status: 'playing', startedAt: serverTimestamp() });
  return startChallenge(code);
}

/** Neue Gruppen-Challenge für alle Spieler. Jedes Spiel erst wieder, wenn alle durch sind. */
export async function startChallenge(code) {
  const refs = await playerRefs(code);
  const counts = await weeklyCounts();
  let chosen = null;
  const result = await runTransaction(db, async (tx) => {
    const room = (await tx.get(roomRef(code))).data();
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const players = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));
    const round = room.round + 1;
    const seed = `${code}:board:${round}:${Date.now()}`;
    const rng = makeRng(seed);

    const playable = groupPlayable(room.library || [], players);
    // Jedes Spiel erst wieder, wenn alle einmal dran waren (auch partyübergreifend), Kategorien gemischt
    const pick = chooseNextGame({ playable, played: room.playedGames || [], cycle: cycleIds('board'), lastGameId: room.lastGameId, seed, counts, featured: room.week?.game });
    const { game } = pick;
    if (!game) throw new Error('Keine Gruppen-Spiele für diese Runde verfügbar.');
    chosen = pick;

    const id = `r${String(round).padStart(2, '0')}`;
    tx.set(roundRef(code, id), { ...expiry(),
      round,
      phase: room.phase,
      gameId: game.id,
      game: game.createState(rng, { phase: room.phase }),
      participants: players.map((p) => p.id),
      // Bei "Wahrheit oder Bluff" ist playerA der Erzähler
      playerA: game.id === 'truthBluff' ? rng.pick(players).id : null,
      playerB: null,
      sabotage: null,
      stage: 'intro',
      introEndsAt: Date.now() + introMs(room.week, BOARD_INTRO_MS), // Regeln lesen, dann startet die Challenge von selbst
      mods: roundMods(room.week, round, game.id), // Spiel der Woche / Wochen-Regel
      results: {},
      ranks: null,
      rolls: {}, // Spieler tippen zum Würfeln (der Reihe nach): rolls[uid] = true (Wert: diceFor)
      autoRolls: {},
      moves: null,
      chaos: false,
      chaosDone: false,
      createdAt: serverTimestamp(),
    });
    tx.update(roomRef(code), {
      round,
      currentRoundId: id,
      lastGameId: game.id,
      playedGames: pick.playedGames,
    });
    return id;
  });
  recordPlay(chosen?.game.id);
  rememberPlayed('board', chosen?.game.id, { reset: chosen?.cycleReset });
  return result;
}

export async function beginChallenge(code, id) {
  await updateDoc(roundRef(code, id), { stage: 'playing', playStartedAt: Date.now() });
}

export async function submitRoundResult(code, id, uid, data) {
  await updateDoc(roundRef(code, id), { [`results.${uid}`]: data });
}

/** ranks = { uid: Platz } – automatisch (Auto-Spiele) oder vom Host eingetragen. */
export async function setRanks(code, id, ranks) {
  await updateDoc(roundRef(code, id), { stage: 'review', ranks, rolls: {}, autoRolls: {}, moves: {}, shown: {}, reviewAt: Date.now() });
}

/**
 * Spieler hat gewürfelt (nur der eigene Eintrag; die Zahl steht über diceFor fest).
 * ch = Ergebnisse der Proben unterwegs: { [Feld]: true/false } (Ducken, Brücken-Sprung).
 */
export async function rollDice(code, id, uid, ch = null) {
  await updateDoc(roundRef(code, id), { [`rolls.${uid}`]: ch ? { ch } : true });
}

/** Host: Wer nicht rechtzeitig tippt, für den würfelt die App (Proben unterwegs gelten dann als verpatzt). */
export async function autoRoll(code, id, uid) {
  await updateDoc(roundRef(code, id), { [`autoRolls.${uid}`]: true });
}

/**
 * Zug für Zug: Der Spieler, der gerade gewürfelt hat, zieht sofort (Bewegung, Hindernisse,
 * Sonderfelder). Erst wenn der Zug auf dem Hauptbildschirm zu Ende gelaufen ist (markShown),
 * darf der Nächste würfeln.
 */
export async function movePlayer(code, id, uid) {
  const refs = await playerRefs(code);
  return runTransaction(db, async (tx) => {
    const round = (await tx.get(roundRef(code, id))).data();
    if (round.stage !== 'review' || round.moves?.[uid]) return;
    const room = (await tx.get(roomRef(code))).data();
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const players = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));

    const r = round.rolls?.[uid];
    const challenges = { [uid]: (r && typeof r === 'object' && r.ch) || {} };
    const result = applyRound({
      players, ranks: round.ranks, fields: room.board.fields, seed: `${code}:${id}`, challenges,
      cleared: room.board.cleared || [], n: round.participants.length, only: uid, mods: round.mods || {},
    });
    const move = result.moves[uid];
    if (!move) return;

    for (const p of players) {
      const st = result.stats[p.id] || {};
      const moved = result.positions[p.id] !== (p.position ?? 0);
      if (p.id !== uid && !moved && !Object.keys(st).length) continue;
      const patch = { position: result.positions[p.id] };
      if (p.id === uid) patch.skipNext = result.skipNext[uid];
      for (const key of ['firstPlaces', 'rockets', 'portals', 'stumbles', 'fieldsLost', 'fieldsMoved', 'obstaclesPassed', 'obstaclesFailed']) {
        if (st[key]) patch[`stats.${key}`] = increment(st[key]);
      }
      if (st.biggestMove > (p.stats?.biggestMove ?? 0)) patch['stats.biggestMove'] = st.biggestMove;
      tx.update(playerRef(code, p.id), patch);
    }

    const leaderPos = Math.max(...Object.values(result.positions));
    const phase = boardPhase(leaderPos, room.board.fields.length);
    tx.update(roundRef(code, id), {
      [`moves.${uid}`]: move,
      ...(result.chaos ? { chaos: true } : {}),
      ...(result.winnerId ? { winnerId: result.winnerId } : {}),
      cleared: [...(round.cleared || []), ...result.cleared],
    });
    tx.update(roomRef(code), {
      'board.cleared': [...(room.board.cleared || []), ...result.cleared],
      phase,
      ...(phase !== room.phase ? { phaseChangedAt: Date.now() } : {}),
      ...(result.winnerId ? { winnerId: result.winnerId } : {}),
    });
  });
}

/** Der Zug ist auf dem Hauptbildschirm fertig gelaufen → der Nächste ist dran. */
export async function markShown(code, id, uid) {
  await updateDoc(roundRef(code, id), { [`shown.${uid}`]: true });
}

/** Alle sind gezogen (oder jemand ist im Ziel): Runde abschließen. */
export async function finishBoardRound(code, id) {
  const refs = await playerRefs(code);
  return runTransaction(db, async (tx) => {
    const round = (await tx.get(roundRef(code, id))).data();
    if (round.stage !== 'review') return;
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    // Wer diesmal aussetzen musste, ist nächste Runde wieder dabei
    snaps.filter((s) => s.exists() && s.data().skipNext && !round.moves?.[s.id]).forEach((s) => tx.update(s.ref, { skipNext: false }));
    tx.update(roundRef(code, id), {
      stage: 'resolved',
      moves: round.moves || {},
      chaos: !!round.chaos && !round.winnerId,
      resolvedAt: Date.now(),
    });
    tx.set(doc(collection(db, 'rooms', code, 'events')), { ...expiry(),
      type: 'boardRound', round: round.round, gameId: round.gameId, ranks: round.ranks, at: serverTimestamp(),
    });
  });
}

/** Chaos-Feld: spontane Challenge für alle, der Letzte geht 2 Felder zurück. */
export async function triggerChaos(code, id) {
  await updateDoc(roundRef(code, id), { chaosDone: true });
  await triggerLiveEvent(code, { penalty: CHAOS_PENALTY, source: 'chaos' });
}


/** Schere-Stein-Papier-Turnier: Host bestätigt den Sieger eines Matches. */
export async function setBracketWinner(code, id, matchKey, winnerId) {
  await updateDoc(roundRef(code, id), { [`bracketWinners.${matchKey}`]: winnerId });
}
