import { GAMES, CATEGORIES, resultComplete } from '../../game/gameLibrary.js';
import { GameArt } from '../GameArt.jsx';
import { useState } from 'react';
import { moveRule, FIELD_TYPES, diceFor, rollersOf } from '../../game/board.js';
import { submitRoundResult, rollDice } from '../../game/boardEngine.js';
import { Dice } from './Dice.jsx';
import { MINIGAMES } from '../../minigames/index.js';
import { FORMAT_RESULT, revealOf } from '../../minigames/format.js';
import { Rules, Waiting } from '../../minigames/shared.jsx';
import { t } from '../../i18n/index.js';

const MEDAL = ['🥇', '🥈', '🥉'];

function MoveTable({ count }) {
  const ranks = Array.from({ length: Math.min(count, 4) }, (_, i) => i + 1);
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <h3>{t('Platzierung → Zug')}</h3>
      {ranks.map((r) => (
        <div key={r} className="row between">
          <b>{MEDAL[r - 1] ?? `${r}.`} {r === 4 ? t('ab Platz 4') : t('{n}. Platz', { n: r })}</b>
          <span>{t(moveRule(r, count).label)}</span>
        </div>
      ))}
    </div>
  );
}

function moveText(m, byId) {
  if (!m) return '';
  if (m.skipped) return `⏸️ ${t('setzt aus')}`;
  const parts = [];
  if (m.roll != null) parts.push(`🎲 ${m.roll}${m.steps > m.roll ? ` +${m.steps - m.roll}` : ''}`);
  else if (m.steps) parts.push(`+${m.steps}`);
  parts.push(`→ ${m.landed ?? m.to}`);
  const e = m.effect;
  if (e?.type === 'rocket') parts.push(`🚀 +${e.delta} → ${m.to}`);
  if (e?.type === 'portal') parts.push(e.with ? `🌀 ${t('Tausch mit {name}', { name: byId[e.with]?.name })} → ${m.to}` : `🌀 ${t('(schon vorne)')}`);
  if (e?.type === 'stumble') parts.push(e.kind === 'back' ? `🪨 −1 → ${m.to}` : `🪨 ${t('nächste Runde aussetzen')}`);
  if (e?.type === 'chaos') parts.push('💥 Chaos!');
  if (!m.steps && !e) return t('bleibt stehen');
  return parts.join(' ');
}

/** Platzierungen (review) bzw. gezogene Züge (resolved). */
function RankingList({ round, byId, meId }) {
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
      {round.stage === 'resolved' && round.winnerId && (
        <div className="card accent center pop"><h2>🏆 {t('{name} erreicht das Ziel!', { name: byId[round.winnerId]?.name })}</h2></div>
      )}
      {round.stage === 'resolved' && round.chaos && !round.chaosDone && (
        <div className="card center" style={{ borderColor: FIELD_TYPES.chaos.color }}>💥 {t("Jemand ist auf einem Chaos-Feld gelandet – gleich gibt's eine Challenge für alle!")}</div>
      )}
    </div>
  );
}

/**
 * Würfel-Phase: Wer würfeln darf, tippt auf seinem Handy auf den Würfel. Alle anderen
 * (und der Hauptbildschirm) sehen die Würfel der Mitspieler rollen.
 */
function DiceStage({ code, round, byId, me, big, run }) {
  const [tapped, setTapped] = useState(false);
  const seed = `${code}:${round.id}`;
  const n = round.participants.length;
  const rollers = rollersOf(round, Object.values(byId));
  const rolled = (id) => !!round.rolls?.[id] || (me?.id === id && tapped);
  const open = rollers.filter((id) => !rolled(id));
  const mine = me && rollers.includes(me.id);
  const bonusOf = (id) => moveRule(round.ranks[id] ?? n, n).bonus;
  const resultText = (id) => {
    const v = diceFor(seed, id);
    const b = bonusOf(id);
    return <b className="pop">{b ? `🎲 ${v} + ${b} = ${t('{n} Felder', { n: v + b })}` : `🎲 ${t('{n} Felder', { n: v })}`}</b>;
  };

  return (
    <div className="stack">
      {mine && (
        <div className="card center stack" style={{ gap: 8 }}>
          <div className="kicker">{rolled(me.id) ? t('Dein Wurf') : t('Du darfst würfeln!')}</div>
          <Dice key={`${round.id}:${me.id}`} size={big ? 150 : 128} value={diceFor(seed, me.id)} rolled={rolled(me.id)}
            onRoll={() => { setTapped(true); run(() => rollDice(code, round.id, me.id)); }}
            label={!rolled(me.id) && <b style={{ fontSize: 20 }}>👆 {t('Tippen zum Würfeln!')}</b>}
            result={resultText(me.id)} />
        </div>
      )}
      {rollers.filter((id) => id !== me?.id).length > 0 && (
        <div className="card stack" style={{ gap: 10 }}>
          <h3>🎲 {t('Würfel der anderen')}</h3>
          <div className="row wrap" style={{ gap: 14, justifyContent: 'center' }}>
            {rollers.filter((id) => id !== me?.id).map((id) => (
              <Dice key={`${round.id}:${id}`} size={big ? 110 : 64} value={diceFor(seed, id)} rolled={rolled(id)} color={`color-mix(in srgb, ${byId[id]?.color} 14%, #fff)`}
                label={<span className="small" style={{ fontWeight: 800 }}>{byId[id]?.avatar} {byId[id]?.name}{!rolled(id) ? ' …' : ''}</span>}
                result={<span className="small">{resultText(id)}</span>} />
            ))}
          </div>
        </div>
      )}
      <p className="center muted" style={{ margin: 0, fontWeight: 700 }}>
        {!rollers.length ? t('Diesmal würfelt niemand – gleich wird gezogen.')
          : open.length ? t('Warte auf {n} Würfe…', { n: open.length }) : `✅ ${t('Alle haben gewürfelt – gleich wird gezogen!')}`}
      </p>
    </div>
  );
}

/**
 * Eine Gruppen-Challenge im Spielfeld-Modus.
 * me = Spieler auf diesem Handy (null auf dem Hauptbildschirm).
 */
export function BoardRound({ code, round, byId, me, big = false, run }) {
  const game = GAMES[round.gameId];
  const mg = MINIGAMES[round.gameId];
  const shownGame = { ...game, rules: game.groupRules ?? game.rules };
  const done = (id) => resultComplete(round.gameId, round.results?.[id]);
  const submitted = round.participants.filter(done);

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
        {!big && <Waiting text={t("Gleich geht's los…")} />}
      </>
    );
  } else if (round.stage === 'playing') {
    const Play = mg.GroupPlay ?? mg.Play;
    const isAuto = game.judge === 'auto';
    const mine = me && done(me.id);
    const progress = isAuto && (
      <div className="row wrap" style={{ gap: 6 }}>
        {round.participants.map((id) => (
          <span key={id} className={`pill ${done(id) ? 'good' : ''}`}>{byId[id]?.avatar} {byId[id]?.name} {done(id) ? '✓' : '…'}</span>
        ))}
      </div>
    );
    if (me && isAuto && round.participants.includes(me.id)) {
      body = mine
        ? <><Waiting text={`✓ ${t('Abgegeben – {a}/{b} fertig', { a: submitted.length, b: round.participants.length })}`} />{progress}</>
        : <Play duel={round} me={me} byId={byId} submit={(k, data) => run(() => submitRoundResult(code, round.id, k ?? me.id, data))} />;
    } else {
      body = (
        <>
          {mg.GroupStage ? <mg.GroupStage duel={round} byId={byId} big={big} /> : <Rules game={shownGame} />}
          {isAuto ? progress : <p className="center muted" style={{ fontWeight: 700, margin: 0 }}>{t('Der Host trägt die Platzierung ein.')}</p>}
        </>
      );
    }
  } else if (round.stage === 'review') {
    body = (
      <>
        <DiceStage code={code} round={round} byId={byId} me={me} big={big} run={run} />
        <RankingList round={round} byId={byId} meId={me?.id} />
      </>
    );
  } else {
    body = <RankingList round={round} byId={byId} meId={me?.id} />;
  }

  return <div className="stack slide-up">{header}{body}</div>;
}
