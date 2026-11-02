import { GAMES, CATEGORIES, resultComplete } from '../../game/gameLibrary.js';
import { GameArt } from '../GameArt.jsx';
import { useEffect, useRef, useState } from 'react';
import { moveRule, bonusDice, FIELD_TYPES, rollDiceFor, rollersOf, rollOrder, hasRolled, challengesFor, ROLL_TURN_MS as TURN_MS } from '../../game/board.js';
import { submitRoundResult, rollDice } from '../../game/boardEngine.js';
import { Dice, ROLL_MS } from './Dice.jsx';
import { Placements } from '../Placements.jsx';
import { LiveBoard, LiveProvider } from '../../minigames/live.jsx';
import { sfx, vibrate } from '../../lib/sound.js';
import { DuckChallenge, JumpChallenge, BoulderChallenge } from './Obstacles.jsx';
import { MINIGAMES } from '../../minigames/index.js';
import { FORMAT_RESULT, revealOf } from '../../minigames/format.js';
import { Rules, Waiting } from '../../minigames/shared.jsx';
import { useSecondsLeft } from '../../hooks/useCountdown.js';
import { t } from '../../i18n/index.js';

const MEDAL = ['🥇', '🥈', '🥉'];

function MoveTable({ count }) {
  const bonus = bonusDice(count).length;
  const ranks = Array.from({ length: bonus + 1 }, (_, i) => i + 1);
  return (
    <div className="card stack" style={{ gap: 6, padding: 14 }}>
      <b className="small">🎲 {t('Platzierung → Würfel')} · {t('{n} Spieler', { n: count })}</b>
      <div className="row wrap" style={{ gap: 6 }}>
        {ranks.map((r) => (
          <span key={r} className="pill">
            {r === bonus + 1 ? (r === count ? `${t('Platz {n}', { n: r })}: ` : `${t('ab Platz {n}', { n: r })}: `) : `${t('Platz {n}', { n: r })}: `}{t(moveRule(r, count).label)}
          </span>
        ))}
      </div>
    </div>
  );
}

function moveText(m, byId) {
  if (!m) return '';
  if (m.skipped) return `⏸️ ${t('setzt aus')}`;
  const parts = [];
  if (m.dice?.length) parts.push(`🎲 ${m.dice.map((d) => d.value).join(' + ')}${m.dice.length > 1 ? ` = ${m.roll}` : ''}`);
  else if (m.roll != null) parts.push(`🎲 ${m.roll}`);
  parts.push(`→ ${m.landed ?? m.to}`);
  (m.obstacles || []).forEach((o) => {
    if (o.type === 'boulder') parts.push(o.ok ? `🪨 ${t('durchgebrochen')}` : `🪨 ${t('vom Felsen gestoppt')}`);
    if (o.type === 'duck') parts.push(o.ok ? `⬇️ ${t('geduckt')}` : `⬇️ ${t('am Balken hängen geblieben')}`);
    if (o.type === 'jump') parts.push(o.ok ? `🦘 ${t('gesprungen')}` : `🦘 ${t('abgestürzt')} → ${m.to}`);
  });
  const e = m.effect;
  if (e?.type === 'rocket') parts.push(`🚀 +${e.delta} → ${m.to}`);
  if (e?.type === 'portal') parts.push(e.with ? `🌀 ${t('Tausch mit {name}', { name: byId[e.with]?.name })} → ${m.to}` : `🌀 ${t('(schon vorne)')}`);
  if (e?.type === 'stumble') parts.push(e.kind === 'back' ? `🪨 −1 → ${m.to}` : `🪨 ${t('nächste Runde aussetzen')}`);
  if (e?.type === 'chaos') parts.push('💥 Chaos!');
  if (!m.steps && !e) return t('bleibt stehen');
  return parts.join(' ');
}

/** Platzierungen (review) bzw. gezogene Züge (resolved). */
export function RankingList({ round, byId, meId }) {
  const game = GAMES[round.gameId];
  const fmt = FORMAT_RESULT[round.gameId];
  const ids = [...round.participants].sort((a, b) => (round.ranks?.[a] ?? 99) - (round.ranks?.[b] ?? 99));
  const reveal = revealOf(round);
  return (
    <div className="stack" style={{ gap: 8 }}>
      {reveal && <div className="card tinted center"><b>{reveal}</b></div>}
      {ids.map((id) => {
        const rank = round.ranks?.[id];
        const res = round.results?.[id];
        const m = round.moves?.[id];
        return (
          <div key={id} className={`player-row ${id === meId ? 'me' : ''}`}>
            <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{rank > round.participants.length ? '–' : MEDAL[rank - 1] ?? `${rank}.`}</span>
            <div className="avatar">{byId[id]?.avatar}</div>
            <div className="grow">
              <b>{byId[id]?.name}</b>
              {game.judge === 'auto' && <div className="small muted">{res ? fmt?.(res, round, id) : t('kein Ergebnis')}</div>}
            </div>
            <span className="small" style={{ fontWeight: 800, textAlign: 'right' }}>
              {round.stage === 'resolved' ? moveText(m, byId) : t(moveRule(rank, round.participants.length).label)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Hinweise nach dem Ziehen (Sieger, Chaos-Feld) – stehen über der Karte. */
export function RoundBanners({ round, byId }) {
  if (round?.stage !== 'resolved') return null;
  return (
    <>
      {round.winnerId && <div className="card accent center pop"><h2>🏆 {t('{name} erreicht das Ziel!', { name: byId[round.winnerId]?.name })}</h2></div>}
      {round.chaos && !round.chaosDone && (
        <div className="card center" style={{ borderColor: FIELD_TYPES.chaos.color }}>💥 {t("Jemand ist auf einem Chaos-Feld gelandet – gleich gibt's eine Challenge für alle!")}</div>
      )}
    </>
  );
}

/** Eingeklappte Liste der Züge dieser Runde (unter der Karte). */
export function RoundMoves({ round, byId, meId }) {
  if (round?.stage !== 'resolved') return null;
  return (
    <details className="card moves-details">
      <summary>📋 {t('Züge dieser Runde')}</summary>
      <div style={{ marginTop: 10 }}><RankingList round={round} byId={byId} meId={meId} /></div>
    </details>
  );
}

/** Sekunden, bis die App für den aktuellen Würfler automatisch würfelt (lokal ab Zugbeginn gezählt). */
function useTurnLeft(turnKey) {
  const [start, setStart] = useState(() => Date.now());
  const [, tick] = useState(0);
  useEffect(() => { setStart(Date.now()); }, [turnKey]);
  useEffect(() => {
    if (!turnKey) return undefined;
    const iv = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(iv);
  }, [turnKey]);
  return Math.max(0, Math.ceil((start + TURN_MS - Date.now()) / 1000));
}

/**
 * Würfel-Phase: Es wird der Reihe nach gewürfelt – erst Platz 1, dann Platz 2 usw.
 * Wer dran ist, tippt auf seinem Handy auf den Würfel; alle anderen (und der
 * Hauptbildschirm) sehen in der Warteschlange, wer gerade würfelt und was dabei herauskam.
 */
function DiceStage({ code, round, byId, me, big, run, fields }) {
  const [tapped, setTapped] = useState(false);
  const [queue, setQueue] = useState(null); // offene Proben [{ idx, type }]
  const [results, setResults] = useState({});
  const myRef = useRef(null);
  const seed = `${code}:${round.id}`;
  const n = round.participants.length;
  const rollers = rollersOf(round, Object.values(byId));
  const order = rollOrder(round, rollers);
  const skipped = round.participants.filter((id) => !rollers.includes(id));
  const rolled = (id) => hasRolled(round, id) || (me?.id === id && tapped);
  const current = order.find((id) => !hasRolled(round, id)) ?? null; // wer gerade dran ist (auch während der Proben)
  const mine = me && rollers.includes(me.id);
  const myTurn = mine && current === me.id && !tapped;
  const ahead = mine ? order.indexOf(me.id) - (current ? order.indexOf(current) : order.length) : 0;
  const turnLeft = useTurnLeft(current ? `${round.id}:${current}` : null);
  const diceOf = (id) => rollDiceFor(seed, id, round.ranks[id] ?? n, n);
  const sumOf = (id) => diceOf(id).reduce((a, x) => a + x.value, 0);
  const resultText = (id) => {
    const d = diceOf(id);
    return <b className="pop">🎲 {d.length > 1 ? `${d.map((x) => x.value).join(' + ')} = ` : ''}{t('{n} Felder', { n: sumOf(id) })}</b>;
  };
  // Hindernisse auf meinem Weg: man bleibt davor stehen und muss sie eigens bewältigen
  const myDice = mine ? diceOf(me.id) : [];
  const from = me?.position ?? 0;

  // Ich bin dran: kurz vibrieren und den Würfel ins Bild holen
  useEffect(() => {
    if (!myTurn) return;
    vibrate([60, 40, 60]);
    sfx.go?.();
    myRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [myTurn]);

  const tap = () => {
    if (!myTurn) return;
    setTapped(true);
    const ch = fields ? challengesFor(fields, from, myDice, seed, me.id) : [];
    if (!ch.length) { run(() => rollDice(code, round.id, me.id)); return; }
    setTimeout(() => setQueue(ch), ROLL_MS + 900); // erst die Würfel landen lassen, dann ankommen
  };
  const challengeDone = (ok) => {
    const [cur, ...rest] = queue;
    const next = cur.type === 'boulder' ? results : { ...results, [cur.idx]: ok };
    setResults(next);
    if (ok && rest.length) { setQueue(rest); return; }
    setQueue([]);
    run(() => rollDice(code, round.id, me.id, Object.keys(next).length ? next : null));
  };
  const challenge = queue?.[0];
  const kindText = (id) => t(moveRule(round.ranks[id] ?? n, n).label);
  const rankBadge = (id) => {
    const r = round.ranks[id];
    return r > n ? '–' : MEDAL[r - 1] ?? `${r}.`;
  };

  return (
    <div className="stack">
      {mine && (
        <div ref={myRef} className={`card center stack ${myTurn ? 'roll-now' : ''}`} style={{ gap: 8, borderColor: myTurn ? 'var(--accent)' : undefined }}>
          <div className="kicker">
            {rolled(me.id) ? t('Dein Wurf') : myTurn ? `👉 ${t('Du bist dran!')}` : t('Gleich bist du dran')}
          </div>
          <div className="small muted" style={{ fontWeight: 700 }}>{kindText(me.id)}</div>
          <Dice key={`${round.id}:${me.id}`} size={big ? 130 : myDice.length > 1 ? 84 : 96} dice={myDice} rolled={rolled(me.id)}
            onRoll={myTurn ? tap : null}
            label={!rolled(me.id) && (myTurn
              ? <b style={{ fontSize: 20 }}>👆 {t('Tippen zum Würfeln!')}</b>
              : <span className="small muted" style={{ fontWeight: 700 }}>
                ⏳ {current ? t('{name} würfelt gerade', { name: byId[current]?.name }) : ''}{ahead > 1 ? ` · ${t('noch {n} vor dir', { n: ahead })}` : ''}
              </span>)}
            result={resultText(me.id)} />
        </div>
      )}
      {challenge?.type === 'boulder' && <BoulderChallenge key={`b${challenge.idx}`} roll={challenge.roll} onDone={challengeDone} />}
      {challenge?.type === 'duck' && <DuckChallenge key={`d${challenge.idx}`} onDone={challengeDone} />}
      {challenge?.type === 'jump' && <JumpChallenge key={`j${challenge.idx}`} onDone={challengeDone} />}
      {(order.length > 0 || skipped.length > 0) && (
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row between">
            <h3 style={{ margin: 0 }}>🎲 {t('Würfel-Reihenfolge')}</h3>
            {current && <span className="pill">{t('{a}/{b} gewürfelt', { a: order.filter(rolled).length, b: order.length })}</span>}
          </div>
          <div className="roll-queue">
            {order.map((id) => {
              const isCur = id === current;
              const done = rolled(id);
              const p = byId[id];
              return (
                <div key={id} className={`roll-turn ${isCur ? 'current' : ''} ${!isCur && !done ? 'waiting' : ''}`}>
                  <span style={{ fontSize: big ? 30 : 22, width: big ? 40 : 30, textAlign: 'center', fontWeight: 900 }}>{rankBadge(id)}</span>
                  <span className="avatar" style={{ background: `color-mix(in srgb, ${p?.color ?? '#999'} 22%, var(--card))` }}>{p?.avatar}</span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <b style={{ fontSize: big ? 22 : 16 }}>{p?.name}{id === me?.id ? ` (${t('du')})` : ''}</b>
                    <div className="small muted" style={{ fontWeight: 700 }}>
                      {isCur && !done ? `🎲 ${t('würfelt …')}${turnLeft <= 10 ? ` (${t('automatisch in {n} s', { n: turnLeft })})` : ''}` : kindText(id)}
                    </div>
                  </div>
                  <div className="roll-dice">
                    {id === me?.id
                      ? (done && <span className="small">{resultText(id)}</span>)
                      : <Dice key={`${round.id}:${id}`} size={big ? 58 : 32} dice={diceOf(id)} rolled={done}
                        tint={`color-mix(in srgb, ${p?.color} 14%, #fff)`} result={<span className="small">{resultText(id)}</span>} />}
                  </div>
                </div>
              );
            })}
            {skipped.map((id) => (
              <div key={id} className="roll-turn waiting">
                <span style={{ width: big ? 40 : 30, textAlign: 'center' }}>⏸️</span>
                <span className="avatar">{byId[id]?.avatar}</span>
                <b className="grow">{byId[id]?.name}</b>
                <span className="small muted">{t('setzt aus')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="center muted" style={{ margin: 0, fontWeight: 700 }}>
        {!rollers.length ? t('Diesmal würfelt niemand – gleich wird gezogen.')
          : current ? t('{name} ist dran mit Würfeln.', { name: byId[current]?.name }) : `✅ ${t('Alle haben gewürfelt – gleich wird gezogen!')}`}
      </p>
    </div>
  );
}

/**
 * Eine Gruppen-Challenge im Spielfeld-Modus.
 * me = Spieler auf diesem Handy (null auf dem Hauptbildschirm).
 */
export function BoardRound({ code, round, byId, me, big = false, run, fields = null, live = false }) {
  const game = GAMES[round.gameId];
  const mg = MINIGAMES[round.gameId];
  const shownGame = { ...game, rules: game.groupRules ?? game.rules };
  const done = (id) => resultComplete(round.gameId, round.results?.[id]);
  const submitted = round.participants.filter(done);
  const startsIn = useSecondsLeft(round.stage === 'intro' ? round.introEndsAt : null);

  const header = (
    <div className="game-title">
      <GameArt game={game} size={56} />
      <div>
        <div className="kicker">Challenge {round.round} · {t(CATEGORIES[game.kind]?.label)} · {t('alle spielen')}</div>
        <h2 style={{ fontSize: big ? 34 : 24 }}>{t(game.name)}</h2>
      </div>
    </div>
  );

  let body;
  if (round.stage === 'intro') {
    body = (
      <>
        <Rules game={shownGame} />
        <MoveTable count={round.participants.length} />
        {round.introEndsAt
          ? <div className="card tinted center"><b style={{ fontSize: big ? 28 : 20 }}>⏳ {startsIn > 0 ? t('Start in {n} s', { n: startsIn }) : t("Los geht's!")}</b></div>
          : !big && <Waiting text={t("Gleich geht's los…")} />}
      </>
    );
  } else if (round.stage === 'playing') {
    const Play = mg.GroupPlay ?? mg.Play;
    const isAuto = game.judge === 'auto';
    const mine = me && done(me.id);
    const board = isAuto && <LiveBoard round={round} byId={byId} meId={me?.id} big={big} />;
    if (me && isAuto && round.participants.includes(me.id)) {
      body = mine
        ? <><Waiting text={`✓ ${t('Abgegeben – {a}/{b} fertig', { a: submitted.length, b: round.participants.length })}`} />{board}</>
        : (
          <LiveProvider code={code} id={round.id} uid={me.id} on={live}>
            <Play duel={round} me={me} byId={byId} submit={(k, data) => run(() => submitRoundResult(code, round.id, k ?? me.id, data))} />
          </LiveProvider>
        );
    } else {
      body = (
        <>
          {mg.GroupStage ? <mg.GroupStage duel={round} byId={byId} big={big} /> : !isAuto && <Rules game={shownGame} />}
          {isAuto ? board : <p className="center muted" style={{ fontWeight: 700, margin: 0 }}>{t('Der Host trägt die Platzierung ein.')}</p>}
        </>
      );
    }
  } else if (round.stage === 'review') {
    const n = round.participants.length;
    body = (
      <>
        <Placements round={round} byId={byId} meId={me?.id} big={big} showRest={false}
          extra={(id) => <span className="muted" style={{ fontWeight: 700 }}>{t(moveRule(round.ranks[id] ?? n, n).label)}</span>} />
        <DiceStage code={code} round={round} byId={byId} me={me} big={big} run={run} fields={fields} />
      </>
    );
  } else {
    body = <RankingList round={round} byId={byId} meId={me?.id} />;
  }

  return <div className="stack slide-up">{header}{body}</div>;
}
