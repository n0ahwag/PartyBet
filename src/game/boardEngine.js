import {
  collection, doc, getDocs, updateDoc, runTransaction, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { GAMES, groupPlayable, pickGame } from './gameLibrary.js';
import { applyRound, boardPhase, CHAOS_PENALTY } from './board.js';
import { triggerLiveEvent } from './engine.js';
import { makeRng } from '../lib/random.js';

/*
 * Spielfeld-Modus: Firestore-Schreibvorgänge. Wie im Party-Modus gilt:
 * Spieler schreiben nur ihr eigenes Ergebnis, Positionen ändert nur der Host.
 *
 * Ablauf einer Runde (rooms/{code}/rounds/{id}.stage):
 *   intro → playing → review (Platzierungen) → resolved (gezogen)
 */

const roomRef = (code) => doc(db, 'rooms', code);
const roundRef = (code, id) => doc(db, 'rooms', code, 'rounds', id);
const playerRef = (code, uid) => doc(db, 'rooms', code, 'players', uid);

async function playerRefs(code) {
  return (await getDocs(collection(db, 'rooms', code, 'players'))).docs.map((d) => d.ref);
}

export async function startBoardGame(code) {
  await updateDoc(roomRef(code), { status: 'playing', startedAt: serverTimestamp() });
  return startChallenge(code);
}

/** Neue Gruppen-Challenge für alle Spieler. Jedes Spiel erst wieder, wenn alle durch sind. */
export async function startChallenge(code) {
  const refs = await playerRefs(code);
  return runTransaction(db, async (tx) => {
    const room = (await tx.get(roomRef(code))).data();
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const players = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));
    const round = room.round + 1;
    const seed = `${code}:board:${round}:${Date.now()}`;
    const rng = makeRng(seed);

    const playable = groupPlayable(room.library || [], players);
    let played = room.playedGames || [];
    let candidates = playable.filter((g) => !played.includes(g.id));
    if (!candidates.length) {
      played = []; // alle Spiele durch → Pool neu mischen
      candidates = playable;
    }
    const game = pickGame(candidates, room.lastGameId, seed);
    if (!game) throw new Error('Keine Gruppen-Spiele für diese Runde verfügbar.');

    const id = `r${String(round).padStart(2, '0')}`;
    tx.set(roundRef(code, id), {
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
      results: {},
      ranks: null,
      moves: null,
      chaos: false,
      chaosDone: false,
      createdAt: serverTimestamp(),
    });
    tx.update(roomRef(code), {
      round,
      currentRoundId: id,
      lastGameId: game.id,
      playedGames: [...played, game.id],
    });
    return id;
  });
}

export async function beginChallenge(code, id) {
  await updateDoc(roundRef(code, id), { stage: 'playing', playStartedAt: Date.now() });
}

export async function submitRoundResult(code, id, uid, data) {
  await updateDoc(roundRef(code, id), { [`results.${uid}`]: data });
}

/** ranks = { uid: Platz } – automatisch (Auto-Spiele) oder vom Host eingetragen. */
export async function setRanks(code, id, ranks) {
  await updateDoc(roundRef(code, id), { stage: 'review', ranks });
}

/** Würfeln & ziehen: Bewegung + Sonderfelder für alle, Phase und Sieger bestimmen. */
export async function moveTokens(code, id) {
  const refs = await playerRefs(code);
  return runTransaction(db, async (tx) => {
    const round = (await tx.get(roundRef(code, id))).data();
    if (round.stage !== 'review') return;
    const room = (await tx.get(roomRef(code))).data();
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const players = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));

    const result = applyRound({ players, ranks: round.ranks, fields: room.board.fields, seed: `${code}:${id}` });

    for (const p of players) {
      const st = result.stats[p.id] || {};
      const patch = {
        position: result.positions[p.id],
        skipNext: result.skipNext[p.id],
      };
      for (const key of ['firstPlaces', 'rockets', 'portals', 'stumbles', 'fieldsLost', 'fieldsMoved']) {
        if (st[key]) patch[`stats.${key}`] = increment(st[key]);
      }
      if (st.biggestMove > (p.stats?.biggestMove ?? 0)) patch['stats.biggestMove'] = st.biggestMove;
      tx.update(playerRef(code, p.id), patch);
    }

    const leaderPos = Math.max(...Object.values(result.positions));
    const phase = boardPhase(leaderPos, room.board.fields.length);
    tx.update(roundRef(code, id), {
      stage: 'resolved',
      moves: result.moves,
      chaos: result.chaos && !result.winnerId,
      winnerId: result.winnerId,
    });
    tx.update(roomRef(code), {
      phase,
      ...(phase !== room.phase ? { phaseChangedAt: Date.now() } : {}),
      ...(result.winnerId ? { winnerId: result.winnerId } : {}),
    });
    tx.set(doc(collection(db, 'rooms', code, 'events')), {
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
