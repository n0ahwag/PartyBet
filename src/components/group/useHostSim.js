import { useEffect, useRef } from 'react';
import { setRoundState } from '../../game/groupEngine.js';
import {
  makeRiver, raftStart, raftStep, raftInputs, raftResult, makeShaft, shaftStart, shaftStep, shaftX, shaftResult, teamsOfRound, SHAFT,
} from '../../game/teams.js';

/*
 * Host simuliert die gemeinsam gesteuerten Spiele (Rafting, Touch-Parcours): liest die Eingaben
 * aller Handys aus der Runde, rechnet 10× pro Sekunde und schreibt den Zustand 5× pro Sekunde zurück.
 * So sehen alle Geräte dasselbe Boot bzw. dieselben Kugeln.
 */
export const SIM_GAMES = ['rafting', 'touchParcours'];
const COUNT_MS = 3000;

export function useHostSim({ code, round, active, finish }) {
  const ref = useRef(round);
  ref.current = round;
  useEffect(() => {
    if (!active || round?.stage !== 'playing' || !SIM_GAMES.includes(round.gameId)) return undefined;
    const raft = round.gameId === 'rafting';
    const rocks = raft ? makeRiver(round.game.seed) : null;
    const gates = raft ? null : makeShaft(round.game.seed);
    let state = raft ? raftStart() : shaftStart();
    const t0 = performance.now();
    let lastWrite = 0; let ended = false;
    const write = (patch) => setRoundState(code, ref.current.id, { sim: patch }).catch(() => {});
    const iv = setInterval(() => {
      const now = performance.now(); const el = now - t0; const r = ref.current;
      if (el < COUNT_MS) {
        if (now - lastWrite > 400) { lastWrite = now; write({ phase: 'count', left: Math.round(COUNT_MS - el), ...(raft ? { raft: state } : { balls: state }) }); }
        return;
      }
      const t = (el - COUNT_MS) / 1000;
      if (raft) state = raftStep(state, raftInputs(r), rocks, 0.1);
      else { const teams = teamsOfRound(r); state = shaftStep(state, teams.map((ids) => shaftX(r, ids)), gates, 0.1, t); }
      const done = raft ? state.done : (state.every((b) => !b.alive || b.finishedAt != null) || t * 1000 >= SHAFT.timeMs);
      if (now - lastWrite > 200 || done) { lastWrite = now; write({ phase: done ? 'done' : 'run', t, ...(raft ? { raft: state } : { balls: state }) }); }
      if (done && !ended) {
        ended = true; clearInterval(iv);
        const final = state;
        setTimeout(() => finish(raft ? raftResult(ref.current, final) : shaftResult(ref.current, { balls: final })), 1500);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [active, round?.id, round?.stage]); // eslint-disable-line react-hooks/exhaustive-deps
}
