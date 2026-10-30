import { GAMES, CATEGORIES, resultComplete } from '../../game/gameLibrary.js';
import { RANK_POINTS, FINAL_MULTIPLIER } from '../../game/group.js';
import { submitGroupResult } from '../../game/groupEngine.js';
import { MINIGAMES } from '../../minigames/index.js';
import { GROUP_GAMES } from '../../minigames/Group.jsx';
import { FORMAT_RESULT, revealOf } from '../../minigames/format.js';
import { Rules, Waiting } from '../../minigames/shared.jsx';
import { t } from '../../i18n/index.js';
import { useSecondsLeft } from '../../hooks/useCountdown.js';

const MEDAL = ['🥇', '🥈', '🥉'];

/** Punkte-Vergabe dieser Runde (sortiert). */
function PointsList({ round, byId, meId }) {
  const game = GAMES[round.gameId];
  const fmt = FORMAT_RESULT[round.gameId];
  const ids = [...round.participants].sort((a, b) => (round.points?.[b] ?? 0) - (round.points?.[a] ?? 0)
    || (round.ranks?.[a] ?? 99) - (round.ranks?.[b] ?? 99));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {ids.map((id) => {
        const rank = round.ranks?.[id];
        const res = round.results?.[id];
        return (
          <div key={id} className={`player-row ${id === meId ? 'me' : ''}`}>
            {rank && <span style={{ fontSize: 22, width: 30, textAlign: 'center' }}>{rank > round.participants.length ? '–' : MEDAL[rank - 1] ?? `${rank}.`}</span>}
            <div className="avatar">{byId[id]?.avatar}</div>
            <div className="grow">
              <b>{byId[id]?.name}</b>
              {fmt && game.judge === 'auto' && !game.groupOnly && <div className="small muted">{res ? fmt(res, round, id) : t('kein Ergebnis')}</div>}
            </div>
            <span className={`pill ${round.points?.[id] ? 'good' : ''}`}>+{round.points?.[id] ?? 0}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Eine Gruppen-Runde. me = Spieler auf diesem Handy (null auf dem Hauptbildschirm).
 */
export function GroupRound({ code, round, byId, me, big = false, run, isHost = false }) {
  const game = GAMES[round.gameId];
  const social = GROUP_GAMES[round.gameId];
  const mg = MINIGAMES[round.gameId];
  const shownGame = { ...game, rules: game.groupRules ?? game.rules };
  const final = round.phase === 'suddenDeath';
  const startsIn = useSecondsLeft(round.stage === 'intro' ? round.introEndsAt : null);

  const header = (
    <div className="game-title">
      <div className="icon">{game.icon}</div>
      <div>
        <div className="kicker">{t('Runde')} {round.round} · {t(CATEGORIES[game.kind]?.label)} · {t('alle gleichzeitig')}{final ? ` · ${t('Punkte')} ×${FINAL_MULTIPLIER}` : ''}</div>
        <h2 style={{ fontSize: big ? 34 : 24 }}>{t(game.name)}</h2>
      </div>
    </div>
  );

  let body;
  if (round.stage === 'intro') {
    body = (
      <>
        <Rules game={shownGame} />
        {!social && <div className="card small">🥇 +{RANK_POINTS[0]} · 🥈 +{RANK_POINTS[1]} · 🥉 +{RANK_POINTS[2]} {t('Punkte')}{final ? ` ${t('(im Finale ×{n})', { n: FINAL_MULTIPLIER })}` : ''}</div>}
        {round.introEndsAt
          ? <div className="card tinted center"><b style={{ fontSize: big ? 28 : 20 }}>⏳ {startsIn > 0 ? t('Start in {n} s', { n: startsIn }) : t("Los geht's!")}</b></div>
          : !big && <Waiting text={t("Gleich geht's los…")} />}
      </>
    );
  } else if (round.stage === 'playing') {
    if (social) {
      body = me && round.participants.includes(me.id)
        ? <social.Play code={code} round={round} me={me} byId={byId} run={run} />
        : <social.Stage round={round} byId={byId} big={big} />;
    } else {
      const done = (id) => resultComplete(round.gameId, round.results?.[id]);
      const progress = game.judge === 'auto' && (
        <div className="row wrap" style={{ gap: 6 }}>
          {round.participants.map((id) => <span key={id} className={`pill ${done(id) ? 'good' : ''}`}>{byId[id]?.avatar} {byId[id]?.name} {done(id) ? '✓' : '…'}</span>)}
        </div>
      );
      if (me && game.judge === 'auto' && round.participants.includes(me.id)) {
        const Play = mg.GroupPlay ?? mg.Play;
        body = done(me.id)
          ? <><Waiting text={`✓ ${t('Abgegeben – warte auf die anderen…')}`} />{progress}</>
          : <Play duel={round} me={me} byId={byId} submit={(k, data) => run(() => submitGroupResult(code, round.id, k ?? me.id, data))} />;
      } else {
        body = (
          <>
            {mg.GroupStage ? <mg.GroupStage duel={round} byId={byId} big={big} /> : <Rules game={shownGame} />}
            {game.judge === 'auto' ? progress : <p className="center muted" style={{ fontWeight: 700, margin: 0 }}>{t('Der Host trägt die Platzierung ein.')}</p>}
          </>
        );
      }
    }
  } else {
    const reveal = !social && revealOf(round);
    body = (
      <>
        {social?.Result && <social.Result round={round} byId={byId} isHost={isHost} />}
        {reveal && <div className="card tinted center"><b>{reveal}</b></div>}
        <h3>{t('Punkte dieser Runde')}{round.multiplier > 1 ? ` (×${round.multiplier})` : ''}</h3>
        <PointsList round={round} byId={byId} meId={me?.id} />
      </>
    );
  }
  return <div className="stack slide-up">{header}{body}</div>;
}

/** Gesamtpunktestand. */
export function PointsBoard({ players, meId }) {
  const sorted = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const max = Math.max(1, ...players.map((p) => p.points ?? 0));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {sorted.map((p, i) => (
        <div key={p.id} className={`player-row ${p.id === meId ? 'me' : ''}`}>
          <span className="faint" style={{ width: 22 }}>#{i + 1}</span>
          <div className="avatar" style={{ background: `color-mix(in srgb, ${p.color} 22%, var(--card))` }}>{p.avatar}</div>
          <div className="grow">
            <b>{p.name}</b>
            <div className="bar" style={{ marginTop: 4 }}><div style={{ width: `${((p.points ?? 0) / max) * 100}%` }} /></div>
          </div>
          <span className="balance">{p.points ?? 0} P</span>
        </div>
      ))}
    </div>
  );
}
