import { useEffect, useRef, useState } from 'react';
import { GAMES, rankGroupRound, resultComplete, ESTIMATE_QUESTIONS } from '../../game/gameLibrary.js';
import { tugResult, teamEstimateResult, sketchResult } from '../../game/extras.js';
import {
  pointsForRanks, tallyVotes, syncResult, hivemindResult, confessionResult, storyState, storyResult,
} from '../../game/group.js';
import { beginGroupRound, finishGroupRound, setRoundState, startConfessionQuiz } from '../../game/groupEngine.js';
import { nextStep, triggerLiveEvent, finishGame } from '../../game/engine.js';
import { RankingInput, BracketInput } from '../board/BoardHostControls.jsx';
import { sfx } from '../../lib/sound.js';
import { t } from '../../i18n/index.js';

/** Hivemind: Host markiert, wer das häufigste Wort gerufen hat. */
function HivemindInput({ round, byId, onConfirm, busy }) {
  const [sel, setSel] = useState([]);
  const [word, setWord] = useState('');
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div className="stack" style={{ gap: 8 }}>
      <h3>{t('Wer hat das häufigste Wort gerufen?')}</h3>
      <input className="input" placeholder={t('Das Wort (optional)')} value={word} onChange={(e) => setWord(e.target.value)} />
      <div className="row wrap" style={{ gap: 6 }}>
        {round.participants.map((id) => (
          <button key={id} className={`chip ${sel.includes(id) ? 'on' : ''}`} onClick={() => toggle(id)}>{byId[id]?.avatar} {byId[id]?.name}</button>
        ))}
      </div>
      <button className="btn primary" disabled={busy} onClick={() => onConfirm(sel, word.trim())}>
        {sel.length ? t('{n} bekommen Punkte – bestätigen', { n: sel.length }) : t('Keine Mehrheit – bestätigen')}
      </button>
    </div>
  );
}

/**
 * Host-Steuerung einer Gruppen-Runde. In der Bibliotheks-Lobby (room.gameMode 'library')
 * läuft alles automatisch: Start nach Countdown, Auswertung, Beicht-Quiz-Schritte. Sichtbar
 * bleibt dort nur, was ein Mensch eintragen muss (Platzierungen) – der Rest steckt im ⚙️-Menü.
 */
/** Ergebnis der Erweiterungs-Gruppenspiele (Team-Tauziehen, Team-Schätzen, Blind-Skizze). */
function extraResult(round) {
  if (round.gameId === 'tugOfWar') return tugResult(round);
  if (round.gameId === 'teamEstimate') return teamEstimateResult(round, ESTIMATE_QUESTIONS[round.game.qIdx].a);
  if (round.gameId === 'blindSketch') { const r = sketchResult(round); return { points: r.points, stats: r.stats, ranks: r.ranks, extra: r.extra }; }
  return null;
}

export function GroupHostControls({ code, room, round, byId, run, busy, children }) {
  const fired = useRef({});
  const game = round && GAMES[round.gameId];
  const n = round?.participants.length ?? 0;
  const finish = (payload) => run(() => finishGroupRound(code, round.id, payload));
  const finishRanks = (ranks) => finish({ ranks, points: pointsForRanks(ranks, n) });
  const once = (key, fn) => { if (!fired.current[key]) { fired.current[key] = true; fn(); } };

  // Automatik: abschließen, sobald alle fertig sind
  useEffect(() => {
    if (round?.stage !== 'playing') return;
    const all = (pred) => round.participants.every(pred);
    const id = round.gameId;
    if (id === 'whoMost' && all((u) => round.results?.[u]?.vote)) {
      once(`${round.id}:vote`, () => { const t = tallyVotes(round); finish({ points: t.points, stats: t.stats, extra: { top: t.top } }); });
    } else if (id === 'syncTest' && all((u) => round.results?.[u]?.at?.toMillis)) {
      once(`${round.id}:sync`, () => { const r = syncResult(round); finish({ points: r.points, stats: r.stats, extra: { spread: r.spread, success: r.success } }); });
    } else if (id === 'chainStory' && storyState(round).done) {
      once(`${round.id}:story`, () => { const r = storyResult(round); finish({ ...r, extra: { story: storyState(round).text } }); });
    } else if (id === 'confession' && round.step === 'collect' && all((u) => round.results?.[u]?.fact)) {
      once(`${round.id}:quiz`, () => run(() => startConfessionQuiz(code, round)));
    } else if (id === 'confession' && round.step === 'quiz' && !round.revealed) {
      const owner = round.order[round.quizIndex];
      if (round.participants.filter((u) => u !== owner).every((u) => round.results?.[u]?.guesses?.[round.quizIndex])) {
        once(`${round.id}:reveal:${round.quizIndex}`, () => { sfx.tusch(); run(() => setRoundState(code, round.id, { revealed: true })); });
      }
    } else if (id === 'tugOfWar' && all((u) => round.results?.[u]?.done)) {
      once(`${round.id}:tug`, () => finish(extraResult(round)));
    } else if (id === 'teamEstimate' && all((u) => round.results?.[u]?.guess != null)) {
      once(`${round.id}:est`, () => finish(extraResult(round)));
    } else if (id === 'blindSketch' && round.step === 'draw' && all((u) => round.results?.[u]?.sketch != null)) {
      once(`${round.id}:vote`, () => run(() => setRoundState(code, round.id, { step: 'vote' })));
    } else if (id === 'blindSketch' && round.step === 'vote' && all((u) => round.results?.[u]?.vote)) {
      once(`${round.id}:sketch`, () => finish(extraResult(round)));
    } else if (!game.groupOnly && game.judge === 'auto' && all((u) => resultComplete(id, round.results?.[u]))) {
      once(`${round.id}:rank`, () => finishRanks(rankGroupRound(round, round.participants)));
    }
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  const library = room.gameMode === 'library';

  // Bibliotheks-Lobby: Runde startet nach dem Regel-Countdown von selbst
  useEffect(() => {
    if (!library || round?.stage !== 'intro' || !round.introEndsAt) return undefined;
    const t = setTimeout(() => once(`${round.id}:begin`, () => run(() => beginGroupRound(code, round.id))),
      Math.max(0, round.introEndsAt - Date.now()));
    return () => clearTimeout(t);
  }, [library, round?.id, round?.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bibliotheks-Lobby: Beicht-Quiz nach dem Auflösen automatisch weiter
  useEffect(() => {
    if (!library || round?.gameId !== 'confession' || round.stage !== 'playing' || round.step !== 'quiz' || !round.revealed) return undefined;
    const t = setTimeout(() => once(`${round.id}:next:${round.quizIndex}`, () => (round.quizIndex + 1 < round.order.length
      ? run(() => setRoundState(code, round.id, { quizIndex: round.quizIndex + 1, revealed: false }))
      : finish(confessionResult(round)))), 5000);
    return () => clearTimeout(t);
  }, [library, round?.id, round?.stage, round?.revealed, round?.quizIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (round?.stage === 'intro') sfx.gong();
    if (round?.stage === 'resolved') sfx.coins();
  }, [round?.stage, round?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bibliotheks-Lobby: zwischen den Runden steuert LibraryLobby (Nochmal / anderes Spiel)
  if (library && (!round || round.stage === 'resolved')) return null;

  let main;
  const isLast = room.round >= room.totalRounds;
  if (!round || round.stage === 'resolved') {
    main = isLast ? (
      <button className="btn primary lg block" disabled={busy} onClick={() => run(() => finishGame(code))}>🏆 {t('Siegerehrung & Wrapped')}</button>
    ) : (
      <>
        <button className="btn primary lg block" disabled={busy || !!room.liveEvent} onClick={() => run(() => nextStep(code))}>▶️ {t('Nächste Runde')}</button>
        {room.liveEvents !== false && <button className="btn soft block" disabled={busy || !!room.liveEvent} onClick={() => run(() => triggerLiveEvent(code))}>⚡ {t('Live-Event jetzt auslösen')}</button>}
      </>
    );
  } else if (round.stage === 'intro') {
    main = <button className="btn primary lg block" disabled={busy} onClick={() => run(() => beginGroupRound(code, round.id))}>🚦 {t("Los geht's!")}</button>;
  } else if (round.gameId === 'hivemind') {
    main = <HivemindInput round={round} byId={byId} busy={busy} onConfirm={(sel, word) => finish({ ...hivemindResult(sel), extra: { majority: sel, word } })} />;
  } else if (round.gameId === 'confession') {
    if (round.step === 'collect') {
      const k = round.participants.filter((u) => round.results?.[u]?.fact).length;
      main = <button className="btn soft block" disabled={busy || k < 2} onClick={() => run(() => startConfessionQuiz(code, round))}>{t('Quiz starten ({k}/{n} Geheimnisse)', { k, n })}</button>;
    } else if (!round.revealed) {
      main = <button className="btn primary block" disabled={busy} onClick={() => run(() => setRoundState(code, round.id, { revealed: true }))}>🔍 {t('Auflösen')}</button>;
    } else if (round.quizIndex + 1 < round.order.length) {
      main = <button className="btn primary block" disabled={busy} onClick={() => run(() => setRoundState(code, round.id, { quizIndex: round.quizIndex + 1, revealed: false }))}>➡️ {t('Nächstes Geheimnis')}</button>;
    } else {
      main = <button className="btn primary block" disabled={busy} onClick={() => finish(confessionResult(round))}>🏁 {t('Punkte vergeben')}</button>;
    }
  } else if (game.bracket) {
    main = <BracketInput code={code} round={round} byId={byId} run={run} busy={busy} onConfirm={finishRanks} />;
  } else if (game.judge === 'host') {
    main = <RankingInput key={round.id} round={round} byId={byId} busy={busy} elimination={game.rankBy === 'elimination'} onConfirm={finishRanks} />;
  } else {
    const sketchDraw = round.gameId === 'blindSketch' && round.step === 'draw';
    const label = round.gameId === 'whoMost' ? t('Jetzt auszählen') : round.gameId === 'chainStory' ? t('Geschichte jetzt beenden')
      : sketchDraw ? t('Bilder jetzt aufdecken') : t('Jetzt auswerten');
    main = (
      <button className="btn ghost sm" disabled={busy} onClick={() => {
        if (round.gameId === 'whoMost') { const t = tallyVotes(round); return finish({ points: t.points, stats: t.stats, extra: { top: t.top } }); }
        if (round.gameId === 'syncTest') { const r = syncResult(round); return finish({ points: r.points, stats: r.stats, extra: { spread: r.spread, success: r.success } }); }
        if (round.gameId === 'chainStory') return finish({ ...storyResult(round), extra: { story: storyState(round).text } });
        if (sketchDraw) return run(() => setRoundState(code, round.id, { step: 'vote' }));
        if (extraResult(round)) return finish(extraResult(round));
        return finishRanks(rankGroupRound(round, round.participants));
      }}>{label}</button>
    );
  }

  if (library) {
    const needsInput = round.stage === 'playing' && (round.gameId === 'hivemind' || game.bracket || game.judge === 'host');
    return (
      <>
        {needsInput && <div className="card stack">{main}</div>}
        <details className="host-menu">
          <summary>⚙️ {t('Host-Optionen')}</summary>
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            {!needsInput && main}
            {children}
          </div>
        </details>
      </>
    );
  }

  return (
    <div className="card stack">
      <div className="row between">
        <h3>{t('Host-Steuerung')}</h3>
        <span className="pill">{t('Runde')} {room.round}{library ? '' : `/${room.totalRounds}`}</span>
      </div>
      {main}
    </div>
  );
}
