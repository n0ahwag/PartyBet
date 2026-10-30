import { useEffect, useRef } from 'react';
import { GAMES } from '../game/gameLibrary.js';
import {
  drawDuel, openBetting, lockBetsAndPlay, declareWinner, settle, finishGame,
} from '../game/engine.js';
import { sfx } from '../lib/sound.js';
import { useSecondsLeft } from '../hooks/useCountdown.js';

/**
 * Automatik auf dem Host-Gerät: Wetten schließen bei Ablauf, digitale Spiele
 * auswerten, Sounds für Stage-Wechsel.
 */
function useHostAutomation(code, duel, run) {
  const left = useSecondsLeft(duel?.stage === 'betting' ? duel.bettingEndsAt : null);
  const fired = useRef({});

  useEffect(() => {
    // Zeit direkt prüfen: `left` kann beim Stage-Wechsel einen Render lang veraltet sein
    if (duel?.stage === 'betting' && left === 0 && Date.now() >= duel.bettingEndsAt
      && !fired.current[`lock:${duel.id}`]) {
      fired.current[`lock:${duel.id}`] = true;
      run(() => lockBetsAndPlay(code, duel.id));
    }
  }, [left, duel, code, run]);

  useEffect(() => {
    if (duel?.stage !== 'playing') return;
    const game = GAMES[duel.gameId];
    if (game.judge !== 'auto' || !game.decide) return;
    const winner = game.decide(duel);
    if (winner === undefined || fired.current[`judge:${duel.id}`]) return;
    fired.current[`judge:${duel.id}`] = true;
    run(() => declareWinner(code, duel.id, winner));
  }, [duel, code, run]);

  useEffect(() => {
    if (!duel) return;
    if (duel.stage === 'intro') sfx.gong();
    if (duel.stage === 'review') sfx.tusch();
    if (duel.stage === 'resolved') sfx.coins();
  }, [duel?.stage, duel?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function HostControls({ code, room, duel, byId, run, busy }) {
  useHostAutomation(code, duel, run);
  const isLast = room.round >= room.totalRounds;
  const game = duel && GAMES[duel.gameId];
  const a = duel && byId[duel.playerA];
  const b = duel && byId[duel.playerB];

  const winnerButtons = (
    <div className="stack" style={{ gap: 8 }}>
      <div className="grid-2">
        <button className="btn primary" disabled={busy} onClick={() => run(() => declareWinner(code, duel.id, duel.playerA))}>{a?.avatar} {a?.name}</button>
        <button className="btn primary" disabled={busy} onClick={() => run(() => declareWinner(code, duel.id, duel.playerB))}>{b?.avatar} {b?.name}</button>
      </div>
      <button className="btn ghost sm" disabled={busy} onClick={() => run(() => declareWinner(code, duel.id, null))}>Unentschieden (Einsätze zurück)</button>
    </div>
  );

  let main;
  if (!duel || duel.stage === 'resolved') {
    main = isLast
      ? <button className="btn primary lg block" disabled={busy} onClick={() => run(() => finishGame(code))}>🎉 Party-Wrapped zeigen</button>
      : <button className="btn primary lg block" disabled={busy} onClick={() => run(() => drawDuel(code))}>⚔️ Nächstes Duell auslosen</button>;
  } else if (duel.stage === 'intro') {
    main = <button className="btn primary lg block" disabled={busy} onClick={() => run(() => openBetting(code, duel.id))}>💰 Wetten öffnen</button>;
  } else if (duel.stage === 'betting') {
    main = <button className="btn primary lg block" disabled={busy} onClick={() => run(() => lockBetsAndPlay(code, duel.id))}>🔒 Wetten schließen & los!</button>;
  } else if (duel.stage === 'playing') {
    main = game.judge === 'host' ? (
      <><h3>Wer hat gewonnen?</h3>{winnerButtons}</>
    ) : (
      <>
        <p className="muted small" style={{ margin: 0 }}>Die App wertet automatisch aus. Notfalls manuell:</p>
        {winnerButtons}
      </>
    );
  } else if (duel.stage === 'review') {
    main = (
      <>
        <button className="btn primary lg block" disabled={busy} onClick={() => run(() => settle(code, duel.id))}>💸 Auszahlen</button>
        <details><summary className="small muted">Ergebnis korrigieren</summary><div style={{ marginTop: 8 }}>{winnerButtons}</div></details>
      </>
    );
  }

  return (
    <div className="card stack">
      <div className="row between">
        <h3>Host-Steuerung</h3>
        <span className="pill">Runde {room.round}/{room.totalRounds}</span>
      </div>
      {main}
      {!isLast && room.round > 0 && (
        <button className="btn ghost sm" disabled={busy} onClick={() => { if (confirm('Party jetzt beenden und Wrapped zeigen?')) run(() => finishGame(code)); }}>
          Party vorzeitig beenden
        </button>
      )}
    </div>
  );
}
