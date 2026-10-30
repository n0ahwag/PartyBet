import { POWERUPS } from '../game/constants.js';
import { Avatar } from './ui.jsx';

const LABEL = { won: 'Gewonnen', lost: 'Verloren', shielded: 'Schild!', void: 'Zurück' };

/** Ergebnis-Übersicht nach der Auszahlung. */
export function Settlement({ duel, byId, meId }) {
  const s = duel.settlement;
  if (!s) return null;
  const winner = byId[duel.winnerId];
  const rows = Object.entries(s.net).sort((a, b) => b[1] - a[1]);
  const myNet = meId ? s.net[meId] : undefined;

  return (
    <div className="stack">
      <div className="card accent center stack pop" style={{ gap: 6 }}>
        {winner ? (
          <>
            <div style={{ fontSize: 52 }}>{winner.avatar}</div>
            <h2 style={{ fontSize: 30 }}>{winner.name} gewinnt!</h2>
            {s.reward && <div>Belohnung: {POWERUPS[s.reward].icon} {POWERUPS[s.reward].label}</div>}
          </>
        ) : (
          <h2>Unentschieden – alle Einsätze zurück</h2>
        )}
      </div>
      {myNet !== undefined && myNet < 0 && (
        <div className="card center pop" style={{ background: '#fee2e2', borderColor: '#fecaca' }}>
          <div style={{ fontSize: 44 }}>🍺</div>
          <h2>Trink {-myNet} {-myNet === 1 ? 'Schluck' : 'Schlücke'}!</h2>
        </div>
      )}
      {myNet > 0 && (
        <div className="card center pop" style={{ background: '#dcfce7', borderColor: '#bbf7d0' }}>
          <h2>+{myNet} Schlücke für dich 🎉</h2>
        </div>
      )}
      <div className="stack" style={{ gap: 8 }}>
        {rows.map(([uid, net]) => (
          <div key={uid} className="player-row">
            <Avatar player={byId[uid]} />
            <div className="grow"><b>{byId[uid]?.name}</b></div>
            <span className={`pill ${net > 0 ? 'good' : net < 0 ? 'bad' : ''}`}>{LABEL[s.outcome[uid]] ?? ''}</span>
            <b style={{ minWidth: 48, textAlign: 'right' }}>{net > 0 ? `+${net}` : net}</b>
          </div>
        ))}
      </div>
      {s.repayments?.length > 0 && (
        <p className="small muted center">
          Schulden getilgt: {s.repayments.map((r) => `${byId[r.from]?.name} → ${r.to === 'bank' ? 'Bank' : byId[r.to]?.name} (${r.amount})`).join(', ')}
        </p>
      )}
    </div>
  );
}
