import { Avatar, Sips } from './ui.jsx';
import { GAMES, CATEGORIES } from '../game/gameLibrary.js';
import { minStakeFor } from '../game/economy.js';
import { PHASES } from '../game/constants.js';
import { t } from '../i18n/index.js';

/** VS-Anzeige mit Spiel, Einsätzen, Quoten und Wett-Pool. */
export function DuelVs({ duel, byId, compact = false }) {
  const a = byId[duel.playerA];
  const b = byId[duel.playerB];
  const game = GAMES[duel.gameId];
  const pool = { [duel.playerA]: 0, [duel.playerB]: 0 };
  // Vor dem Sperren stehen Roh-Einsätze im Duell, danach die effektiven (×Phase)
  const factor = duel.stakes ? 1 : PHASES[duel.phase].multiplier;
  for (const bet of Object.values(duel.bets || {})) if (bet && pool[bet.on] !== undefined) pool[bet.on] += bet.amount * factor;
  const total = pool[duel.playerA] + pool[duel.playerB];

  const side = (p, id) => (
    <div className="side">
      <Avatar player={p} size={compact ? '' : 'lg'} />
      <div className="name">{p?.name ?? '…'}</div>
      {p && <Sips n={p.balance} className="muted" />}
      {duel.odds && <span className="pill accent">{t('Quote')} ×{duel.odds[id]}</span>}
      {duel.sabotage?.target === id && <span className="pill bad">🧪 {t('sabotiert')}</span>}
    </div>
  );

  return (
    <div className="stack">
      {game && (
        <div className="game-title">
          <div className="icon" style={compact ? { width: 44, height: 44, fontSize: 26 } : undefined}>{game.icon}</div>
          <div>
            <div className="kicker">{t('Duell')} {duel.round} · {t(CATEGORIES[game.kind]?.label)}</div>
            <h2 style={{ fontSize: compact ? 22 : 30 }}>{t(game.name)}</h2>
          </div>
        </div>
      )}
      <div className="vs pop">
        {side(a, duel.playerA)}
        <div className="vs-badge">VS</div>
        {side(b, duel.playerB)}
      </div>
      {total > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="bar"><div style={{ width: `${(pool[duel.playerA] / total) * 100}%` }} /></div>
          <div className="row between small muted">
            <span>{pool[duel.playerA]} 🍺 {t('Wetten')}</span>
            <span>{pool[duel.playerB]} 🍺 {t('Wetten')}</span>
          </div>
        </div>
      )}
      <div className="row wrap center small muted" style={{ gap: 8 }}>
        <span className="pill">{t('Pflicht-Einsatz')}: {minStakeFor(duel.phase)} 🍺</span>
        {duel.jokerSwap && <span className="pill">🃏 {t('{name} hat getauscht', { name: byId[duel.jokerSwap.from]?.name })}</span>}
        {duel.sabotage && <span className="pill bad">🧪 {byId[duel.sabotage.target]?.name} {t(duel.sabotage.rule)}</span>}
      </div>
    </div>
  );
}
