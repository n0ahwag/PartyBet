import { useEffect, useRef, useState } from 'react';
import { GAMES, rankGroupRound, resultComplete, buildBracket, ranksFromBracket } from '../../game/gameLibrary.js';
import { beginChallenge, setRanks, moveTokens, triggerChaos, setBracketWinner } from '../../game/boardEngine.js';
import { nextStep, triggerLiveEvent, finishGame } from '../../game/engine.js';
import { sfx } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

/**
 * Host trägt bei Real-Life-Challenges die Reihenfolge ein.
 * elimination = true (z. B. Wortkette): wer rausfliegt, wird nacheinander angetippt;
 * wer am Ende übrig bleibt, gewinnt.
 */
export function RankingInput({ round, byId, onConfirm, busy, elimination = false }) {
  const [order, setOrder] = useState([]);
  const n = round.participants.length;
  const open = round.participants.filter((id) => !order.includes(id));
  const confirm = () => {
    const ranks = {};
    if (elimination) {
      order.forEach((id, i) => { ranks[id] = n - i; }); // zuerst raus = letzter Platz
      open.forEach((id) => { ranks[id] = 1; }); // wer übrig ist, teilt sich Platz 1
    } else {
      order.forEach((id, i) => { ranks[id] = i + 1; });
      open.forEach((id) => { ranks[id] = order.length + 1; }); // nicht eingetragen = gemeinsam Letzte
    }
    onConfirm(ranks);
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <h3>{elimination ? t('Wer fliegt raus? (der Reihe nach antippen)') : t('Reihenfolge antippen')}</h3>
      {order.map((id, i) => (
        <div key={id} className={`pill ${elimination ? 'bad' : 'accent'}`}>
          {elimination ? `❌ ${t('raus (Platz {n})', { n: n - i })}` : `${i + 1}.`} {byId[id]?.avatar} {byId[id]?.name}
        </div>
      ))}
      <div className="row wrap" style={{ gap: 6 }}>
        {open.map((id) => (
          <button key={id} className="chip" onClick={() => setOrder((o) => [...o, id])}>{byId[id]?.avatar} {byId[id]?.name}</button>
        ))}
      </div>
      <div className="row">
        <button className="btn ghost sm" disabled={!order.length} onClick={() => setOrder((o) => o.slice(0, -1))}>↩︎ {t('Zurück')}</button>
        <button className="btn primary grow" disabled={busy || !order.length || (elimination && open.length > 1)} onClick={confirm}>
          {elimination && open.length === 1 ? `🏆 ${t('{name} gewinnt – bestätigen', { name: byId[open[0]]?.name })}` : t('Platzierung bestätigen')}
        </button>
      </div>
    </div>
  );
}

/** Schere-Stein-Papier: Host bestätigt jedes Match des ausgelosten Turniers. */
export function BracketInput({ code, round, byId, run, busy, onConfirm }) {
  const bracket = buildBracket(round.participants, round.id, round.bracketWinners || {});
  const open = bracket.rounds.flat().filter((m) => !m.winner);
  if (bracket.champion) {
    return (
      <button className="btn primary lg block" disabled={busy}
        onClick={() => {
          const ranks = ranksFromBracket(round.participants, bracket);
          return onConfirm ? onConfirm(ranks) : run(() => setRanks(code, round.id, ranks));
        }}>
        🏆 {t('{name} gewinnt – Platzierung übernehmen', { name: byId[bracket.champion]?.name })}
      </button>
    );
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <h3>{t('Wer hat gewonnen?')}</h3>
      {open.map((m) => (
        <div key={m.key} className="grid-2">
          {[m.a, m.b].map((id) => (
            <button key={id} className="btn soft" disabled={busy} onClick={() => run(() => setBracketWinner(code, round.id, m.key, id))}>
              {byId[id]?.avatar} {byId[id]?.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function BoardHostControls({ code, room, round, byId, run, busy }) {
  const fired = useRef({});
  const game = round && GAMES[round.gameId];

  // Auto-Spiele: sobald alle abgegeben haben, Platzierung berechnen
  useEffect(() => {
    if (round?.stage !== 'playing' || game?.judge !== 'auto') return;
    const all = round.participants.every((id) => resultComplete(round.gameId, round.results?.[id]));
    if (!all || fired.current[round.id]) return;
    fired.current[round.id] = true;
    run(() => setRanks(code, round.id, rankGroupRound(round, round.participants)));
  }, [round, game, code, run]);

  useEffect(() => {
    if (round?.stage === 'intro') sfx.gong();
    if (round?.stage === 'review') sfx.tusch();
  }, [round?.stage, round?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  let main;
  if (room.winnerId && round?.stage === 'resolved') {
    main = <button className="btn primary lg block" disabled={busy} onClick={() => run(() => finishGame(code))}>🏆 {t('Siegerehrung & Wrapped')}</button>;
  } else if (!round || round.stage === 'resolved') {
    main = round?.chaos && !round.chaosDone ? (
      <button className="btn primary lg block" style={{ background: '#F97316' }} disabled={busy || !!room.liveEvent}
        onClick={() => run(() => triggerChaos(code, round.id))}>💥 {t('Chaos-Challenge starten')}</button>
    ) : (
      <>
        <button className="btn primary lg block" disabled={busy || !!room.liveEvent} onClick={() => run(() => nextStep(code))}>▶️ {t('Nächste Challenge')}</button>
        {room.liveEvents !== false && (
          <button className="btn soft block" disabled={busy || !!room.liveEvent} onClick={() => run(() => triggerLiveEvent(code))}>⚡ {t('Live-Event jetzt auslösen')}</button>
        )}
      </>
    );
  } else if (round.stage === 'intro') {
    main = <button className="btn primary lg block" disabled={busy} onClick={() => run(() => beginChallenge(code, round.id))}>🚦 {t("Los geht's!")}</button>;
  } else if (round.stage === 'playing') {
    if (game.bracket) {
      main = <BracketInput code={code} round={round} byId={byId} run={run} busy={busy} />;
    } else if (game.judge === 'host') {
      main = (
        <RankingInput key={round.id} round={round} byId={byId} busy={busy} elimination={game.rankBy === 'elimination'}
          onConfirm={(ranks) => run(() => setRanks(code, round.id, ranks))} />
      );
    } else {
      const n = round.participants.filter((id) => resultComplete(round.gameId, round.results?.[id])).length;
      main = (
        <>
          <p className="muted small" style={{ margin: 0 }}>{t('{a}/{b} haben abgegeben – die App wertet automatisch aus.', { a: n, b: round.participants.length })}</p>
          <button className="btn ghost sm" disabled={busy} onClick={() => run(() => setRanks(code, round.id, rankGroupRound(round, round.participants)))}>
            {t('Jetzt auswerten (Fehlende werden Letzte)')}
          </button>
        </>
      );
    }
  } else if (round.stage === 'review') {
    main = <button className="btn primary lg block" disabled={busy} onClick={() => run(() => moveTokens(code, round.id))}>🎲 {t('Würfeln & ziehen')}</button>;
  }

  return (
    <div className="card stack">
      <div className="row between">
        <h3>{t('Host-Steuerung')}</h3>
        <span className="pill">{t('Runde')} {room.round}</span>
      </div>
      {main}
    </div>
  );
}
