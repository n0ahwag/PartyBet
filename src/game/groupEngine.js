import {
  collection, doc, getDocs, updateDoc, runTransaction, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { groupPlayable, pickGame } from './gameLibrary.js';
import { phaseForRound } from './constants.js';
import { FINAL_MULTIPLIER, confessionOrder } from './group.js';
import { makeRng } from '../lib/random.js';

/*
 * Gruppen-Modus: Firestore-Ablauf. Nutzt dieselbe rounds-Sammlung (und damit
 * dieselben Sicherheitsregeln) wie der Spielfeld-Modus.
 *
 *   intro → playing (mit game-spezifischem `step`) → resolved (Punkte vergeben)
 */

const roomRef = (code) => doc(db, 'rooms', code);
const roundRef = (code, id) => doc(db, 'rooms', code, 'rounds', id);
const playerRef = (code, uid) => doc(db, 'rooms', code, 'players', uid);

export async function startGroupGame(code) {
  await updateDoc(roomRef(code), { status: 'playing', startedAt: serverTimestamp() });
  return startGroupRound(code);
}

export async function startGroupRound(code) {
  const refs = (await getDocs(collection(db, 'rooms', code, 'players'))).docs.map((d) => d.ref);
  return runTransaction(db, async (tx) => {
    const room = (await tx.get(roomRef(code))).data();
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const players = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));
    const round = room.round + 1;
    if (round > room.totalRounds) {
      tx.update(roomRef(code), { status: 'finished', finishedAt: serverTimestamp() });
      return null;
    }
    const phase = phaseForRound(round, room.totalRounds);
    const seed = `${code}:group:${round}:${Date.now()}`;
    const rng = makeRng(seed);

    const playable = groupPlayable(room.library || [], players).filter((g) => players.length >= g.minPlayers);
    let played = room.playedGames || [];
    let candidates = playable.filter((g) => !played.includes(g.id));
    if (!candidates.length) { played = []; candidates = playable; }
    // Die sozialen Gruppen-Spiele bevorzugen, solange noch welche offen sind
    const social = candidates.filter((g) => g.groupOnly);
    const game = pickGame(social.length && rng.next() < 0.6 ? social : candidates, room.lastGameId, seed);
    if (!game) throw new Error('Keine Gruppen-Spiele verfügbar.');

    const id = `r${String(round).padStart(2, '0')}`;
    tx.set(roundRef(code, id), {
      round,
      phase,
      gameId: game.id,
      game: game.createState(rng, { phase }),
      participants: players.map((p) => p.id),
      playerA: game.id === 'truthBluff' ? rng.pick(players).id : null,
      playerB: null,
      sabotage: null,
      stage: 'intro',
      step: game.id === 'confession' ? 'collect' : null,
      results: {},
      ranks: null,
      points: null,
      createdAt: serverTimestamp(),
    });
    tx.update(roomRef(code), {
      round,
      phase,
      ...(phase !== room.phase ? { phaseChangedAt: Date.now() } : {}),
      currentRoundId: id,
      lastGameId: game.id,
      playedGames: [...played, game.id],
    });
    return id;
  });
}

export async function beginGroupRound(code, id) {
  await updateDoc(roundRef(code, id), { stage: 'playing', playStartedAt: Date.now() });
}

/** Host schaltet Zwischenschritte (Beicht-Quiz: collect → quiz, nächstes Geheimnis, auflösen). */
export async function setRoundState(code, id, patch) {
  await updateDoc(roundRef(code, id), patch);
}

export async function startConfessionQuiz(code, round) {
  const rng = makeRng(`${round.id}:confess`);
  await updateDoc(roundRef(code, round.id), { step: 'quiz', order: confessionOrder(round, rng.shuffle), quizIndex: 0, revealed: false });
}

/** Sync-Test: Tap mit Server-Zeitstempel – misst echte Gleichzeitigkeit im Raum. */
export async function submitSyncTap(code, id, uid) {
  await updateDoc(roundRef(code, id), { [`results.${uid}`]: { at: serverTimestamp() } });
}

/**
 * Runde abschließen: Punkte (im Finale ×2) und Statistiken gutschreiben.
 * @param points { uid: n }   @param stats { uid: { key: n } }   @param extra Felder für die Anzeige
 */
export async function finishGroupRound(code, id, { points = {}, stats = {}, ranks = null, extra = {} }) {
  return runTransaction(db, async (tx) => {
    const round = (await tx.get(roundRef(code, id))).data();
    if (round.stage === 'resolved') return;
    const mult = round.phase === 'suddenDeath' ? FINAL_MULTIPLIER : 1;
    const final = Object.fromEntries(Object.entries(points).filter(([, n]) => n > 0).map(([uid, n]) => [uid, n * mult]));
    const ids = new Set([...Object.keys(final), ...Object.keys(stats)]);
    for (const uid of ids) {
      const patch = {};
      if (final[uid]) patch.points = increment(final[uid]);
      for (const [k, n] of Object.entries(stats[uid] || {})) patch[`stats.${k}`] = increment(n);
      if (ranks?.[uid] === 1) patch['stats.firstPlaces'] = increment(1);
      tx.update(playerRef(code, uid), patch);
    }
    for (const [uid, r] of Object.entries(ranks || {})) {
      if (r === 1 && !ids.has(uid)) tx.update(playerRef(code, uid), { 'stats.firstPlaces': increment(1) });
    }
    tx.update(roundRef(code, id), { stage: 'resolved', points: final, multiplier: mult, ranks, ...extra });
    tx.set(doc(collection(db, 'rooms', code, 'events')), {
      type: 'groupRound', round: round.round, gameId: round.gameId, points: final, ...extra, at: serverTimestamp(),
    });
  });
}


/** Beicht-Quiz: Tipp für Geheimnis Nr. idx (nur der eigene Eintrag wird geändert). */
export async function submitConfessionGuess(code, id, uid, idx, target) {
  await updateDoc(roundRef(code, id), { [`results.${uid}.guesses.${idx}`]: target });
}

export async function submitConfessionFact(code, id, uid, fact) {
  await updateDoc(roundRef(code, id), { [`results.${uid}.fact`]: fact });
}

/** Ketten-Story: Wort an Position idx (nur wer dran ist, schreibt). */
export async function submitStoryWord(code, id, uid, idx, word) {
  await updateDoc(roundRef(code, id), { [`results.${uid}.words.${idx}`]: word });
}

export async function submitGroupResult(code, id, uid, data) {
  await updateDoc(roundRef(code, id), { [`results.${uid}`]: data });
}
