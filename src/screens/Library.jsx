import { useMemo, useState } from 'react';
import { AdSlot } from '../components/AdSlot.jsx';
import { LegalLinks } from './Legal.jsx';
import { GameArt } from '../components/GameArt.jsx';
import { GAMES, CATEGORIES, requirementsOf } from '../game/gameLibrary.js';
import '../game/group.js';
import { EQUIPMENT } from '../game/constants.js';
import { navigate } from '../lib/router.js';
import { t, useLang } from '../i18n/index.js';
import { LangSwitch, useToast, useAction } from '../components/ui.jsx';
import { createRoom, joinRoom } from '../game/engine.js';
import { AVATARS } from '../game/constants.js';
import { detectCaps } from '../lib/device.js';

const PLAYER_GROUPS = [
  { id: 'two', label: '2 Spieler', test: (g) => g.minPlayers <= 2 },
  { id: 'three', label: 'ab 3 Spieler', test: (g) => g.minPlayers >= 3 }, // Labels werden per t() übersetzt
];

/** Spielkarte – in der Bibliothek (Übungsmodus) und in der Bibliotheks-Lobby (Spielauswahl). */
export function GameCard({ game, onClick, disabled = false, note = null }) {
  const equipment = EQUIPMENT.filter((e) => game.equipment.includes(e.id));
  return (
    <button className="card row" disabled={disabled} style={{ textAlign: 'left', cursor: disabled ? 'default' : 'pointer', padding: 14, width: '100%' }}
      onClick={onClick ?? (() => navigate(`/library/${game.id}`))}>
      <GameArt game={game} size={56} />
      <div className="grow stack" style={{ gap: 4 }}>
        <b style={{ fontSize: 17 }}>{t(game.name)}</b>
        <div className="row wrap" style={{ gap: 4 }}>
          {requirementsOf(game).map((r) => <span key={r} className="pill">{r}</span>)}
          {equipment.map((e) => <span key={e.id} className="pill">{e.icon} {t(e.label)}</span>)}
          {note}
        </div>
      </div>
      {!disabled && <span className="faint" style={{ fontSize: 22 }}>›</span>}
    </button>
  );
}

/** Lobby für die Bibliothek erstellen: erst Leute beitreten lassen, dann passende Spiele auswählen. */
function CreateLibraryLobby({ uid }) {
  const [mode, setMode] = useState('mobile');
  const [name, setName] = useState(localStorage.getItem('fo_name') || '');
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);

  const create = () => run(async () => {
    const code = await createRoom({ hostId: uid, mode, expectedPlayers: 12, equipment: [], totalRounds: 99, liveEvents: false, gameMode: 'library' });
    if (mode === 'mobile') {
      localStorage.setItem('fo_name', name);
      await joinRoom(code, uid, { name, avatar: localStorage.getItem('fo_avatar') || AVATARS[0], caps: detectCaps() });
      localStorage.setItem('fo_last', `/play/${code}`);
      navigate(`/play/${code}`);
    } else {
      localStorage.setItem('fo_last', `/host/${code}`);
      navigate(`/host/${code}`);
    }
  });

  return (
    <div className="card stack">
      <h3>🎮 {t('Lobby erstellen')}</h3>
      <p className="small muted" style={{ margin: 0 }}>{t('Erst treten alle mit dem Raumcode bei, dann wählt ihr Spiele aus, die zu eurer Spielerzahl passen – so oft und in der Reihenfolge, wie ihr wollt.')}</p>
      <div className="grid-2">
        <button className={`chip ${mode === 'screen' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 14, borderRadius: 18 }} onClick={() => setMode('screen')}>
          <span style={{ fontSize: 26 }}>📺</span>{t('Hauptbildschirm')}
        </button>
        <button className={`chip ${mode === 'mobile' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 14, borderRadius: 18 }} onClick={() => setMode('mobile')}>
          <span style={{ fontSize: 26 }}>📱</span>{t('Nur Handys')}
        </button>
      </div>
      {mode === 'mobile' && <input className="input" placeholder={t('Dein Name')} maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />}
      <button className="btn primary lg block" disabled={busy || !uid || (mode === 'mobile' && !name.trim())} onClick={create}>{t('Lobby erstellen')}</button>
      {toastNode}
    </div>
  );
}

/** Spielebibliothek: Lobby erstellen + alle Spiele nach Kategorie oder Spieleranzahl, mit Übungsmodus. */
export function Library({ uid }) {
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
      <CreateLibraryLobby uid={uid} />
      <h3 style={{ marginTop: 8 }}>{t('Alle Spiele')}</h3>
      <div className="grid-2">
        <button className={`chip ${groupBy === 'category' ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setGroupBy('category')}>{t('Nach Kategorie')}</button>
        <button className={`chip ${groupBy === 'players' ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setGroupBy('players')}>{t('Nach Spieleranzahl')}</button>
      </div>
      <p className="small muted center" style={{ margin: 0 }}>{t('{n} Spiele', { n: games.length })} · {t('Tippe auf ein Spiel, um es alleine auf diesem Gerät zu üben.')}</p>
      {sections.filter((s) => s.games.length).map((s) => (
        <div key={s.id} className="stack" style={{ gap: 8 }}>
          <h3>{s.title} <span className="faint">({s.games.length})</span></h3>
          {s.games.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      ))}
      <AdSlot />
      <LegalLinks />
    </div>
  );
}
