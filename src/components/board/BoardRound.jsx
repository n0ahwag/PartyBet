import { GAMES, CATEGORIES } from '../../game/gameLibrary.js';
import { moveRule, FIELD_TYPES } from '../../game/board.js';
import { submitRoundResult } from '../../game/boardEngine.js';
import { MINIGAMES } from '../../minigames/index.js';
import { FORMAT_RESULT, revealOf } from '../../minigames/format.js';
import { Rules, Waiting } from '../../minigames/shared.jsx';

const MEDAL = ['🥇', '🥈', '🥉'];

function MoveTable({ count }) {
  const ranks = Array.from({ length: Math.min(count, 4) }, (_, i) => i + 1);
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <h3>Platzierung → Zug</h3>
      {ranks.map((r) => (
        <div key={r} className="row between">
          <b>{MEDAL[r - 1] ?? `${r}.`} {r === 4 ? 'ab Platz 4' : `${r}. Platz`}</b>
          <span>{moveRule(r, count).label}</span>
        </div>
      ))}
    </div>
  );
}

function moveText(m, byId) {
  if (!m) return '';
  if (m.skipped) return '⏸️ setzt aus';
  const parts = [];
  if (m.roll != null) parts.push(`🎲 ${m.roll}${m.steps > m.roll ? ` +${m.steps - m.roll}` : ''}`);
  else if (m.steps) parts.push(`+${m.steps}`);
  parts.push(`→ ${m.landed ?? m.to}`);
  const e = m.effect;
  if (e?.type === 'rocket') parts.push(`🚀 +${e.delta} → ${m.to}`);
  if (e?.type === 'portal') parts.push(e.with ? `🌀 Tausch mit ${byId[e.with]?.name} → ${m.to}` : '🌀 (schon vorne)');
  if (e?.type === 'stumble') parts.push(e.kind === 'back' ? `🪨 −1 → ${m.to}` : '🪨 nächste Runde aussetzen');
  if (e?.type === 'chaos') parts.push('💥 Chaos!');
  if (!m.steps && !e) return 'bleibt stehen';
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
              {game.judge === 'auto' && <div className="small muted">{res ? fmt?.(res, round, id) : 'kein Ergebnis'}</div>}
            </div>
            <span className="small" style={{ fontWeight: 800, textAlign: 'right' }}>
              {round.stage === 'resolved' ? moveText(m, byId) : moveRule(rank, round.participants.length).label}
            </span>
          </div>
        );
      })}
      {round.stage === 'resolved' && round.winnerId && (
        <div className="card accent center pop"><h2>🏆 {byId[round.winnerId]?.name} erreicht das Ziel!</h2></div>
      )}
      {round.stage === 'resolved' && round.chaos && !round.chaosDone && (
        <div className="card center" style={{ borderColor: FIELD_TYPES.chaos.color }}>💥 Jemand ist auf einem Chaos-Feld gelandet – gleich gibt's eine Challenge für alle!</div>
      )}
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
  const submitted = round.participants.filter((id) => round.results?.[id]);

  const header = (
    <div className="game-title">
      <div className="icon">{game.icon}</div>
      <div>
        <div className="kicker">Challenge {round.round} · {CATEGORIES[game.kind]?.label} · alle spielen</div>
        <h2 style={{ fontSize: big ? 34 : 24 }}>{game.name}</h2>
      </div>
    </div>
  );

  let body;
  if (round.stage === 'intro') {
    body = (
      <>
        <Rules game={shownGame} />
        <MoveTable count={round.participants.length} />
        {!big && <Waiting text="Gleich geht's los…" />}
      </>
    );
  } else if (round.stage === 'playing') {
    const Play = mg.GroupPlay ?? mg.Play;
    const isAuto = game.judge === 'auto';
    const mine = me && round.results?.[me.id];
    const progress = isAuto && (
      <div className="row wrap" style={{ gap: 6 }}>
        {round.participants.map((id) => (
          <span key={id} className={`pill ${round.results?.[id] ? 'good' : ''}`}>{byId[id]?.avatar} {byId[id]?.name} {round.results?.[id] ? '✓' : '…'}</span>
        ))}
      </div>
    );
    if (me && isAuto && round.participants.includes(me.id)) {
      body = mine
        ? <><Waiting text={`✓ Abgegeben – ${submitted.length}/${round.participants.length} fertig`} />{progress}</>
        : <Play duel={round} me={me} byId={byId} submit={(k, data) => run(() => submitRoundResult(code, round.id, k ?? me.id, data))} />;
    } else {
      body = (
        <>
          {mg.GroupStage ? <mg.GroupStage duel={round} byId={byId} big={big} /> : <Rules game={shownGame} />}
          {isAuto ? progress : <p className="center muted" style={{ fontWeight: 700, margin: 0 }}>Der Host trägt die Platzierung ein.</p>}
        </>
      );
    }
  } else {
    body = <RankingList round={round} byId={byId} meId={me?.id} />;
  }

  return <div className="stack slide-up">{header}{body}</div>;
}
