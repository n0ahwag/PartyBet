import { useMemo, useState } from 'react';
import { GAMES, CATEGORIES, requirementsOf } from '../game/gameLibrary.js';
import '../game/group.js';
import { EQUIPMENT } from '../game/constants.js';
import { navigate } from '../lib/router.js';
import { t, useLang } from '../i18n/index.js';
import { LangSwitch } from '../components/ui.jsx';

const PLAYER_GROUPS = [
  { id: 'two', label: '2 Spieler', test: (g) => g.minPlayers <= 2 },
  { id: 'three', label: 'ab 3 Spieler', test: (g) => g.minPlayers >= 3 }, // Labels werden per t() übersetzt
];

function GameCard({ game }) {
  const equipment = EQUIPMENT.filter((e) => game.equipment.includes(e.id));
  return (
    <button className="card row" style={{ textAlign: 'left', cursor: 'pointer', padding: 14, width: '100%' }}
      onClick={() => navigate(`/library/${game.id}`)}>
      <div className="avatar" style={{ background: `color-mix(in srgb, ${game.accent} 18%, var(--card))`, width: 52, height: 52, fontSize: 28 }}>{game.icon}</div>
      <div className="grow stack" style={{ gap: 4 }}>
        <b style={{ fontSize: 17 }}>{t(game.name)}</b>
        <div className="row wrap" style={{ gap: 4 }}>
          {requirementsOf(game).map((r) => <span key={r} className="pill">{r}</span>)}
          {equipment.map((e) => <span key={e.id} className="pill">{e.icon} {t(e.label)}</span>)}
        </div>
      </div>
      <span className="faint" style={{ fontSize: 22 }}>›</span>
    </button>
  );
}

/** Spielebibliothek: alle Spiele nach Kategorie oder Spieleranzahl, mit Übungsmodus. */
export function Library() {
  const [groupBy, setGroupBy] = useState('category');
  const lang = useLang();
  const games = Object.values(GAMES);

  const sections = useMemo(() => {
    if (groupBy === 'players') {
      return PLAYER_GROUPS.map((g) => ({ id: g.id, title: t(g.label), games: games.filter(g.test) }));
    }
    // "Überall spielbar" zuerst – die Spiele ohne Utensilien
    const order = ['group', 'anywhere', ...Object.keys(CATEGORIES).filter((k) => k !== 'anywhere' && k !== 'group')];
    return order.map((id) => [id, CATEGORIES[id]]).map(([id, c]) => ({
      id, title: `${c.icon} ${t(c.label)}`, games: games.filter((g) => g.kind === id),
    }));
  }, [groupBy, games, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <div className="row between">
        <button className="btn ghost sm" onClick={() => navigate('/')}>←</button>
        <h2>📚 {t('Bibliothek')}</h2>
        <LangSwitch />
      </div>
      <div className="grid-2">
        <button className={`chip ${groupBy === 'category' ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setGroupBy('category')}>{t('Nach Kategorie')}</button>
        <button className={`chip ${groupBy === 'players' ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setGroupBy('players')}>{t('Nach Spieleranzahl')}</button>
      </div>
      <p className="small muted center" style={{ margin: 0 }}>{t('{n} Spiele', { n: games.length })} · {t('Tippe auf ein Spiel, um es ohne ganze Runde zu üben (Gruppen-Spiele laufen im Gruppen-Modus).')}</p>
      {sections.filter((s) => s.games.length).map((s) => (
        <div key={s.id} className="stack" style={{ gap: 8 }}>
          <h3>{s.title} <span className="faint">({s.games.length})</span></h3>
          {s.games.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      ))}
    </div>
  );
}
