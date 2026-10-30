import { POWERUPS } from '../game/constants.js';
import { Avatar } from './ui.jsx';

const sips = (n) => `${n} ${n === 1 ? 'Schluck' : 'Schlücke'}`;

/** Ergebnis nach der Auszahlung: Verlierer trinken, Gewinner verteilen in echt. */
export function Settlement({ duel, byId, meId }) {
  const s = duel.settlement;
  if (!s) return null;
  const winner = byId[duel.winnerId];
  const distribute = s.distribute || {};
  const rows = Object.keys(s.outcome)
    .map((uid) => ({ uid, net: s.net[uid] ?? 0, give: distribute[uid] ?? 0, out: s.outcome[uid] }))
    .sort((a, b) => b.give - a.give || b.net - a.net);
  const myNet = meId ? s.net[meId] : undefined;
  const myGive = meId ? distribute[meId] ?? 0 : 0;
  const myRepaid = meId ? s.repayments?.filter((r) => r.from === meId).reduce((t, r) => t + r.amount, 0) : 0;

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

      {myGive > 0 && (
        <div className="card center pop stack" style={{ background: '#dcfce7', borderColor: '#bbf7d0', gap: 4 }}>
          <div style={{ fontSize: 44 }}>🍻</div>
          <h2>Verteile {sips(myGive)}!</h2>
          <div className="muted">Dein Einsatz ist zurück auf deinem Konto.</div>
        </div>
      )}
      {myRepaid > 0 && myGive === 0 && (
        <div className="card center pop">Dein Gewinn ging komplett in die Schuldentilgung ({myRepaid}).</div>
      )}
      {myNet !== undefined && myNet < 0 && (
        <div className="card center pop" style={{ background: '#fee2e2', borderColor: '#fecaca' }}>
          <div style={{ fontSize: 44 }}>🍺</div>
          <h2>Trink {sips(-myNet)}!</h2>
        </div>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {rows.map(({ uid, net, give, out }) => (
          <div key={uid} className="player-row">
            <Avatar player={byId[uid]} />
            <div className="grow"><b>{byId[uid]?.name}</b></div>
            {give > 0 && <span className="pill good">🍻 verteilt {give}</span>}
            {out === 'won' && give === 0 && <span className="pill good">Einsatz zurück</span>}
            {out === 'lost' && <span className="pill bad">🍺 trinkt {-net}</span>}
            {out === 'shielded' && <span className="pill">🛡️ Schild</span>}
            {out === 'void' && <span className="pill">zurück</span>}
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
