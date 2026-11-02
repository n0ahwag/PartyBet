import { useEffect, useRef } from 'react';
import { setRoundState } from '../../game/groupEngine.js';
import { DIRECTORS } from '../../game/screen/index.js';

/*
 * Regie der Hauptbildschirm-Spiele: läuft auf dem Host-Gerät (dem Hauptbildschirm).
 * 10× pro Sekunde: Eingaben der Handys (round.results) lesen → director.tick → neuer Zustand.
 * Geschrieben wird nur, wenn sich etwas geändert hat – Phasenwechsel sofort, laufende
 * Bewegungen (Rennen) höchstens 5× pro Sekunde. Nach einem Neuladen geht es mit round.sim weiter.
 */
const TICK_MS = 100;
const WRITE_MS = 200;
const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore mag kein undefined

export function useScreenDirector({ code, round, active, finish }) {
  const ref = useRef(round);
  ref.current = round;
  const director = active && round?.stage === 'playing' ? DIRECTORS[round.gameId] : null;

  useEffect(() => {
    if (!director) return undefined;
    const r0 = ref.current;
    let sim = r0.sim && r0.sim.phase !== 'done' && r0.sim.gameId === r0.gameId ? r0.sim : { ...director.start(r0, Date.now()), gameId: r0.gameId };
    let written = null;
    let lastWrite = 0;
    let ended = false;
    const write = (now) => {
      const json = JSON.stringify(sim);
      if (json === written) return;
      written = json;
      lastWrite = now;
      setRoundState(code, r0.id, { sim: clean(sim) }).catch(() => {});
    };
    write(Date.now());
    const iv = setInterval(() => {
      if (ended) return;
      const now = Date.now();
      const prevPhase = sim.phase;
      const { sim: next, done } = director.tick(sim, ref.current, now);
      sim = { ...next, gameId: r0.gameId };
      if (sim.phase !== prevPhase || done || now - lastWrite >= WRITE_MS) write(now);
      if (done) {
        ended = true;
        clearInterval(iv);
        setTimeout(() => finish(done), 2500); // Endstand kurz auf dem Bildschirm stehen lassen
      }
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [director, round?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
