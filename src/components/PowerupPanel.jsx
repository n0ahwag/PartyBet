import { useState } from 'react';
import { POWERUPS } from '../game/constants.js';
import { activatePowerup } from '../game/engine.js';
import { sfx } from '../lib/sound.js';
import { t } from '../i18n/index.js';
import { BoosterCard, BoosterGuide, BOOSTER_COLORS } from './Boosters.jsx';

/**
 * Power-ups vorbereiten. Gültig werden sie, wenn der Host die Wetten schließt
 * (Joker bereits beim Öffnen der Wetten).
 */
export function PowerupPanel({ code, duel, me, players, run }) {
  const [picking, setPicking] = useState(null);
  const [guide, setGuide] = useState(false);
  const isDuelist = me.id === duel.playerA || me.id === duel.playerB;
  const active = duel.powerups?.[me.id];
  const inv = me.inventory || {};

  const usable = Object.values(POWERUPS).filter((p) => {
    if ((inv[p.id] ?? 0) < 1) return false;
    if (p.id === 'joker') return isDuelist && duel.stage === 'intro';
    if ((p.id === 'shield' || p.id === 'doubleDown') && !isDuelist && !duel.bets?.[me.id]) return false;
    return true;
  });

  const activate = (pu, target = null) => run(async () => {
    await activatePowerup(code, duel.id, me.id, pu.id, target);
    sfx.coins();
    setPicking(null);
  });

  if (active) {
    return (
      <div className="card stack" style={{ gap: 8 }}>
        <h3>✅ {t('Power-up vorbereitet')}{active.target ? ` · ${t('Ziel')}: ${players.find((p) => p.id === active.target)?.name}` : ''}</h3>
        <BoosterCard p={POWERUPS[active.type]} open={false} />
      </div>
    );
  }
  if (!usable.length) return null;

  if (picking) {
    const targets = picking.target === 'duelist'
      ? players.filter((p) => (p.id === duel.playerA || p.id === duel.playerB) && p.id !== me.id)
      : players.filter((p) => p.id !== duel.playerA && p.id !== duel.playerB && p.balance > 0);
    return (
      <div className="card stack">
        <h3 style={{ color: BOOSTER_COLORS[picking.id] }}>{picking.icon} {t(picking.label)}: {t('Ziel wählen')}</h3>
        <p className="small muted" style={{ margin: 0 }}>{t(picking.desc)}</p>
        {targets.map((target) => (
          <button key={target.id} className="btn soft" onClick={() => activate(picking, target.id)}>{target.avatar} {target.name}</button>
        ))}
        <button className="btn ghost sm" onClick={() => setPicking(null)}>{t('Abbrechen')}</button>
      </div>
    );
  }

  return (
    <div className="card stack">
      <div className="row between">
        <h3>⚡ {t('Power-ups (1 pro Duell)')}</h3>
        <button className="btn ghost sm" onClick={() => setGuide(true)}>ℹ️ {t('Alle erklärt')}</button>
      </div>
      {usable.map((p) => (
        <BoosterCard key={p.id} p={p} count={inv[p.id]} onUse={() => (p.target ? setPicking(p) : activate(p))} />
      ))}
      {guide && <BoosterGuide inventory={inv} onClose={() => setGuide(false)} />}
    </div>
  );
}
