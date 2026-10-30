import { PlayerRow, Inventory } from './ui.jsx';

export function Scoreboard({ players, meId, duel }) {
  const sorted = [...players].sort((a, b) => b.balance - a.balance);
  return (
    <div className="stack" style={{ gap: 8 }}>
      {sorted.map((p, i) => {
        const bet = duel?.bets?.[p.id];
        return (
          <PlayerRow key={p.id} player={p} me={p.id === meId}>
            <div className="row small" style={{ gap: 8 }}>
              <span className="faint">#{i + 1}</span>
              <Inventory inventory={p.inventory} />
              {p.bankrupt && <span className="pill bad">pleite</span>}
              {p.debts?.length > 0 && <span className="pill">Schulden {p.debts.reduce((s, d) => s + d.amount, 0)}</span>}
              {bet && duel.stage === 'betting' && <span className="pill accent">💰 gesetzt</span>}
            </div>
          </PlayerRow>
        );
      })}
    </div>
  );
}
