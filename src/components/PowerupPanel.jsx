import { useState } from 'react';
import { POWERUPS } from '../game/constants.js';
import { activatePowerup } from '../game/engine.js';
import { sfx } from '../lib/sound.js';

/**
 * Power-ups vorbereiten. Gültig werden sie, wenn der Host die Wetten schließt
 * (Joker bereits beim Öffnen der Wetten).
 */
export function PowerupPanel({ code, duel, me, players, run }) {
  const [picking, setPicking] = useState(null);
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
      <div className="card tinted row">
        <span style={{ fontSize: 28 }}>{POWERUPS[active.type].icon}</span>
        <div className="grow">
          <b>{POWERUPS[active.type].label}</b> vorbereitet
          {active.target && <div className="small muted">Ziel: {players.find((p) => p.id === active.target)?.name}</div>}
        </div>
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
        <h3>{picking.icon} {picking.label}: Ziel wählen</h3>
        {targets.map((t) => (
          <button key={t.id} className="btn soft" onClick={() => activate(picking, t.id)}>{t.avatar} {t.name}</button>
        ))}
        <button className="btn ghost sm" onClick={() => setPicking(null)}>Abbrechen</button>
      </div>
    );
  }

  return (
    <div className="card stack">
      <h3>Power-ups (1 pro Duell)</h3>
      <div className="stack" style={{ gap: 8 }}>
        {usable.map((p) => (
          <button key={p.id} className="btn soft" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
            onClick={() => (p.target ? setPicking(p) : activate(p))}>
            <span style={{ fontSize: 24 }}>{p.icon}</span>
            <span className="grow">
              <div>{p.label} ×{inv[p.id]}</div>
              <div className="small muted" style={{ fontWeight: 500 }}>{p.desc}</div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
