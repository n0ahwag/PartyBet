import { GAMES, resultComplete } from '../game/gameLibrary.js';
import { minStakeFor } from '../game/economy.js';
import { submitResult } from '../game/engine.js';
import { MINIGAMES, resultKey } from '../minigames/index.js';
import { Rules, Waiting } from '../minigames/shared.jsx';
import { useSecondsLeft } from '../hooks/useCountdown.js';
import { DuelVs } from './DuelVs.jsx';
import { BetPanel } from './BetPanel.jsx';
import { PowerupPanel } from './PowerupPanel.jsx';
import { Settlement } from './Settlement.jsx';
import { t } from '../i18n/index.js';

function WinnerBanner({ duel, byId }) {
  const w = byId[duel.winnerId];
  return (
    <div className="card accent center pop">
      <h2 style={{ fontSize: 28 }}>{w ? t('{avatar} {name} gewinnt!', { avatar: w.avatar, name: w.name }) : t('Unentschieden!')}</h2>
      <div className="small" style={{ opacity: 0.85 }}>{t('Gleich wird ausgezahlt…')}</div>
    </div>
  );
}

/** Großansicht für den Hauptbildschirm (TV/Laptop) – oder kompakt auf Handys im Mobil-Modus. */
export function DuelStage({ duel, byId, big = true }) {
  const game = GAMES[duel.gameId];
  const mg = MINIGAMES[duel.gameId];
  const left = useSecondsLeft(duel.stage === 'betting' ? duel.bettingEndsAt : null);

  switch (duel.stage) {
    case 'intro':
      return <div className="stage slide-up"><DuelVs duel={duel} byId={byId} compact={!big} /><Rules game={game} /></div>;
    case 'betting':
      return (
        <div className="stage">
          <DuelVs duel={duel} byId={byId} compact={!big} />
          <div className="card tinted center">
            <div className="kicker">{t('Wetten offen')}</div>
            <div className="big-number">{left}s</div>
            <div className="muted">{t('Setzt eure Schlücke auf einen Kontrahenten!')}</div>
          </div>
          <Rules game={game} />
        </div>
      );
    case 'playing':
      return (
        <div className="stage">
          <DuelVs duel={duel} byId={byId} compact />
          {mg.Stage ? <mg.Stage duel={duel} byId={byId} big={big} /> : <Rules game={game} />}
        </div>
      );
    case 'review':
      return (
        <div className="stage">
          <WinnerBanner duel={duel} byId={byId} />
          {mg.Review && <mg.Review duel={duel} byId={byId} big={big} />}
        </div>
      );
    case 'resolved':
      return <div className="stage"><Settlement duel={duel} byId={byId} /></div>;
    default:
      return null;
  }
}

/** Persönliche Ansicht auf dem Handy eines Spielers. */
export function PlayerDuelView({ code, room, duel, me, byId, players, run }) {
  const isDuelist = me.id === duel.playerA || me.id === duel.playerB;
  const mg = MINIGAMES[duel.gameId];
  const onScreen = room.mode === 'screen';

  if (duel.stage === 'resolved') return <Settlement duel={duel} byId={byId} meId={me.id} />;
  if (duel.stage === 'review') {
    return (
      <div className="stack">
        <WinnerBanner duel={duel} byId={byId} />
        {mg.Review && <mg.Review duel={duel} byId={byId} big={false} />}
      </div>
    );
  }

  if (duel.stage === 'playing') {
    if (isDuelist) {
      const key = resultKey(duel, me.id);
      if (resultComplete(duel.gameId, duel.results?.[key]) && mg.Review) return <mg.Review duel={duel} byId={byId} big={false} />;
      const submit = (k, data) => run(() => submitResult(code, duel.id, k ?? key, data));
      return (
        <div className="stack">
          {duel.sabotage?.target === me.id && <div className="card center" style={{ background: '#fee2e2' }}>🧪 {t('Sabotiert! Du')} {t(duel.sabotage.rule)}.</div>}
          <mg.Play duel={duel} me={me} byId={byId} submit={submit} />
        </div>
      );
    }
    return onScreen
      ? <div className="stack"><DuelVs duel={duel} byId={byId} compact /><Waiting text={`📺 ${t('Schau auf den Hauptbildschirm!')}`} /></div>
      : <DuelStage duel={duel} byId={byId} big={false} />;
  }

  // intro & betting: Spiel + Regeln stehen fest, BEVOR gewettet wird
  return (
    <div className="stack">
      <DuelVs duel={duel} byId={byId} compact />
      <Rules game={GAMES[duel.gameId]} />
      {isDuelist ? (
        <div className="card accent center stack" style={{ gap: 4 }}>
          <h2>{t('Du bist im Duell! ⚔️')}</h2>
          <div>{t('Pflicht-Einsatz: {n} 🍺 auf dich selbst', { n: Math.min(me.balance, minStakeFor(duel.phase)) })}</div>
        </div>
      ) : duel.stage === 'betting' ? (
        me.balance > 0 && <BetPanel code={code} duel={duel} me={me} byId={byId} run={run} />
      ) : (
        <Waiting text={t('Gleich öffnen die Wetten…')} />
      )}
      <PowerupPanel code={code} duel={duel} me={me} players={players} run={run} />
    </div>
  );
}
