import { useMemo, useState } from 'react';
import { GAMES, CATEGORIES, requirementsOf } from '../game/gameLibrary.js';
import { EQUIPMENT } from '../game/constants.js';
import { navigate } from '../lib/router.js';

const PLAYER_GROUPS = [
  { id: 'two', label: '2 Spieler', test: (g) => g.minPlayers <= 2 },
  { id: 'three', label: 'ab 3 Spieler', test: (g) => g.minPlayers >= 3 },
];

function GameCard({ game }) {
  const equipment = EQUIPMENT.filter((e) => game.equipment.includes(e.id));
  return (
    <button className="card row" style={{ textAlign: 'left', cursor: 'pointer', padding: 14, width: '100%' }}
      onClick={() => navigate(`/library/${game.id}`)}>
      <div className="avatar" style={{ background: `color-mix(in srgb, ${game.accent} 18%, var(--card))`, width: 52, height: 52, fontSize: 28 }}>{game.icon}</div>
      <div className="grow stack" style={{ gap: 4 }}>
        <b style={{ fontSize: 17 }}>{game.name}</b>
        <div className="row wrap" style={{ gap: 4 }}>
          {requirementsOf(game).map((r) => <span key={r} className="pill">{r}</span>)}
          {equipment.map((e) => <span key={e.id} className="pill">{e.icon} {e.label}</span>)}
        </div>
      </div>
      <span className="faint" style={{ fontSize: 22 }}>›</span>
    </button>
  );
}

/** Spielebibliothek: alle Spiele nach Kategorie oder Spieleranzahl, mit Übungsmodus. */
export function Library() {
  const [groupBy, setGroupBy] = useState('category');
  const games = Object.values(GAMES);

  const sections = useMemo(() => {
    if (groupBy === 'players') {
      return PLAYER_GROUPS.map((g) => ({ id: g.id, title: g.label, games: games.filter(g.test) }));
    }
    // "Überall spielbar" zuerst – die Spiele ohne Utensilien
    const order = ['anywhere', ...Object.keys(CATEGORIES).filter((k) => k !== 'anywhere')];
    return order.map((id) => [id, CATEGORIES[id]]).map(([id, c]) => ({
      id, title: `${c.icon} ${c.label}`, games: games.filter((g) => g.kind === id),
    }));
  }, [groupBy, games]);

  return (
    <div className="page">
      <div className="row between">
        <button className="btn ghost sm" onClick={() => navigate('/')}>←</button>
        <h2>📚 Bibliothek</h2>
        <span className="pill">{games.length} Spiele</span>
      </div>
      <div className="grid-2">
        <button className={`chip ${groupBy === 'category' ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setGroupBy('category')}>Nach Kategorie</button>
        <button className={`chip ${groupBy === 'players' ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setGroupBy('players')}>Nach Spieleranzahl</button>
      </div>
      <p className="small muted center" style={{ margin: 0 }}>Tippe auf ein Spiel, um es ohne ganze Runde zu üben.</p>
      {sections.filter((s) => s.games.length).map((s) => (
        <div key={s.id} className="stack" style={{ gap: 8 }}>
          <h3>{s.title} <span className="faint">({s.games.length})</span></h3>
          {s.games.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      ))}
    </div>
  );
}
