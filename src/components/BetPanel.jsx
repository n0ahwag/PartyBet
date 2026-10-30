import { useState } from 'react';
import { placeBet, cancelBet } from '../game/engine.js';
import { PHASES, MIN_BET } from '../game/constants.js';
import { useSecondsLeft } from '../hooks/useCountdown.js';
import { sfx, vibrate } from '../lib/sound.js';
import { Avatar } from './ui.jsx';
import { t } from '../i18n/index.js';

/** Zuschauer-Wetten. Abgebucht wird erst beim Schließen der Wetten (Host-Transaktion). */
export function BetPanel({ code, duel, me, byId, run }) {
  const mult = PHASES[duel.phase].multiplier;
  const maxBase = Math.floor(me.balance / mult);
  const current = duel.bets?.[me.id];
  const [on, setOn] = useState(current?.on ?? null);
  const [amount, setAmount] = useState(current?.amount ?? Math.min(2, maxBase));
  const left = useSecondsLeft(duel.bettingEndsAt);

  if (maxBase < MIN_BET) {
    return <div className="card flat center muted">{t('Zu wenig Schlücke zum Wetten')}{mult > 1 && ` ${t('(×{n} in dieser Phase)', { n: mult })}`}.</div>;
  }

  const submit = () => run(async () => {
    await placeBet(code, duel.id, me.id, on, amount);
    sfx.betJingle();
    vibrate(40);
  });

  return (
    <div className="card stack">
      <div className="row between">
        <h3>{t('Deine Wette')}</h3>
        <span className="pill accent">⏱ {left}s</span>
      </div>
      <div className="grid-2">
        {[duel.playerA, duel.playerB].map((id) => (
          <button key={id} className={`chip ${on === id ? 'on' : ''}`} style={{ justifyContent: 'center', padding: 12 }} onClick={() => setOn(id)}>
            <Avatar player={byId[id]} /> {byId[id]?.name}
          </button>
        ))}
      </div>
      <div className="stepper" style={{ justifyContent: 'center' }}>
        <button onClick={() => setAmount((a) => Math.max(MIN_BET, a - 1))}>−</button>
        <div className="value">{amount}</div>
        <button onClick={() => setAmount((a) => Math.min(maxBase, a + 1))}>+</button>
      </div>
      {mult > 1 && <p className="center small muted" style={{ margin: 0 }}>{t('Chaos-Faktor ×{m}: Einsatz zählt als {n} 🍺', { m: mult, n: amount * mult })}</p>}
      <p className="center small faint" style={{ margin: 0 }}>{t('Richtig getippt: Einsatz zurück + du verteilst genauso viele Schlücke – beim Außenseiter doppelt so viele.')}</p>
      <div className="row">
        {current && <button className="btn ghost" onClick={() => run(() => cancelBet(code, duel.id, me.id))}>{t('Zurückziehen')}</button>}
        <button className="btn primary grow" disabled={!on} onClick={submit}>
          {current ? t('Wette ändern') : t('Wette setzen')}
        </button>
      </div>
      {current && <p className="center small" style={{ margin: 0 }}>✅ {t('{n} auf {name}', { n: current.amount, name: byId[current.on]?.name })}</p>}
    </div>
  );
}
