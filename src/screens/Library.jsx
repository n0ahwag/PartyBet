import { useEffect, useMemo, useState } from 'react';
import { weeklyCounts } from '../game/gameStats.js';
import { AdSlot } from '../components/AdSlot.jsx';
import { LegalLinks } from './Legal.jsx';
import { GameArt } from '../components/GameArt.jsx';
import { GameTile, GameMetaLegend } from '../components/GameTile.jsx';
import { GAMES, CATEGORIES } from '../game/gameLibrary.js';
import '../game/group.js';
import { navigate } from '../lib/router.js';
import { t, useLang } from '../i18n/index.js';
import { LangSwitch, useToast, useAction } from '../components/ui.jsx';
import { createRoom, joinRoom } from '../game/engine.js';
import { AVATARS } from '../game/constants.js';
import { detectCaps } from '../lib/device.js';

/** Lobby für die Bibliothek erstellen: erst Leute beitreten lassen, dann passende Spiele auswählen. */
function CreateLibraryLobby({ uid }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('mobile');
  const [stealth, setStealth] = useState(false);
  const [name, setName] = useState(localStorage.getItem('fo_name') || '');
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);

  const create = () => run(async () => {
    const code = await createRoom({ hostId: uid, mode, expectedPlayers: 12, equipment: [], totalRounds: 99, liveEvents: false, gameMode: 'library', stealth });
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

  if (!open) {
    return (
      <div className="card row" style={{ gap: 12 }}>
        <div className="grow">
          <b>🎮 {t('Mit Freunden spielen')}</b>
          <div className="small muted">{t('Lobby öffnen, alle treten bei, ihr wählt die Spiele.')}</div>
        </div>
        <button className="btn primary" onClick={() => setOpen(true)}>{t('Lobby erstellen')}</button>
      </div>
    );
  }
  return (
    <div className="card stack">
      <div className="row between">
        <h3>🎮 {t('Lobby erstellen')}</h3>
        <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label={t('Schließen')}>✕</button>
      </div>
      <div className="grid-2">
        <button className={`chip ${mode === 'mobile' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 12, borderRadius: 16 }} onClick={() => setMode('mobile')}>
          <span style={{ fontSize: 24 }}>📱</span>{t('Nur Handys')}
        </button>
        <button className={`chip ${mode === 'screen' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 12, borderRadius: 16 }} onClick={() => setMode('screen')}>
          <span style={{ fontSize: 24 }}>📺</span>{t('Hauptbildschirm')}
        </button>
      </div>
      {mode === 'mobile' && <input className="input" placeholder={t('Dein Name')} maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />}
      <label className="row" style={{ gap: 10, fontWeight: 700, cursor: 'pointer' }}>
        <input type="checkbox" checked={stealth} onChange={(e) => setStealth(e.target.checked)} style={{ width: 20, height: 20 }} />
        🤫 {t('Stealth-/Uni-Modus')} <span className="small muted" style={{ fontWeight: 500 }}>– {t('nur leise Spiele')}</span>
      </label>
      <button className="btn primary lg block" disabled={busy || !uid || (mode === 'mobile' && !name.trim())} onClick={create}>{t('Lobby erstellen')}</button>
      {toastNode}
    </div>
  );
}

/** Wochen-Statistik über alle Partys: meist- und wenigstgespielte Spiele. */
function WeeklyStats({ uid }) {
  const [counts, setCounts] = useState(null);
  useEffect(() => { if (uid) weeklyCounts().then(setCounts); }, [uid]);
  if (!counts) return null;
  const games = Object.values(GAMES);
  const sorted = [...games].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return null;
  const row = (g) => (
    <div key={g.id} className="row between" style={{ gap: 8 }}>
      <span className="row" style={{ gap: 8 }}><GameArt game={g} size={24} /> {t(g.name)}</span>
      <span className="pill">{counts[g.id] ?? 0}×</span>
    </div>
  );
  return (
    <details className="fold">
      <summary>📊 {t('Diese Woche in allen Partys')}</summary>
      <div className="stack" style={{ gap: 10 }}>
      <p className="small muted" style={{ margin: 0 }}>{t('Die App wählt bevorzugt die Spiele, die zuletzt am wenigsten gespielt wurden.')}</p>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ gap: 6 }}><b className="small">🔥 {t('Am häufigsten')}</b>{sorted.slice(0, 3).map(row)}</div>
        <div className="stack" style={{ gap: 6 }}><b className="small">💤 {t('Am seltensten')}</b>{sorted.slice(-3).reverse().map(row)}</div>
      </div>
      </div>
    </details>
  );
}

/** Reihenfolge der Kategorien: Gruppen- und „Überall“-Spiele zuerst. */
export const categoryOrder = () => ['group', 'anywhere', ...Object.keys(CATEGORIES).filter((k) => k !== 'anywhere' && k !== 'group')];

/** Spielebibliothek: Lobby erstellen + alle Spiele als Kacheln (Filter nach Kategorie), Tippen = üben. */
export function Library({ uid }) {
  const [cat, setCat] = useState('all');
  const lang = useLang();
  const games = Object.values(GAMES);

  const sections = useMemo(() => categoryOrder()
    .filter((id) => cat === 'all' || cat === id)
    .map((id) => ({ id, c: CATEGORIES[id], games: games.filter((g) => g.kind === id) }))
    .filter((s) => s.games.length), [cat, games, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <div className="row between">
        <button className="btn ghost sm" title={t('Zur Startseite')} onClick={() => navigate('/')}>🏠</button>
        <h2>📚 {t('Bibliothek')}</h2>
        <LangSwitch />
      </div>
      <CreateLibraryLobby uid={uid} />
      <div className="stack" style={{ gap: 6 }}>
        <div className="row between">
          <h3>{t('Alle Spiele')} <span className="faint">({games.length})</span></h3>
          <span className="small muted">{t('Tippen zum Üben')}</span>
        </div>
        <div className="chip-scroll">
          <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>{t('Alle')}</button>
          {categoryOrder().filter((id) => games.some((g) => g.kind === id)).map((id) => (
            <button key={id} className={`chip ${cat === id ? 'on' : ''}`} onClick={() => setCat(id)}>{CATEGORIES[id].icon} {t(CATEGORIES[id].label)}</button>
          ))}
        </div>
      </div>
      {sections.map((s) => (
        <div key={s.id} className="stack" style={{ gap: 8 }}>
          {cat === 'all' && <h3>{s.c.icon} {t(s.c.label)} <span className="faint">({s.games.length})</span></h3>}
          <div className="tile-grid">
            {s.games.map((g) => <GameTile key={g.id} game={g} onClick={() => navigate(`/library/${g.id}`)} />)}
          </div>
        </div>
      ))}
      <GameMetaLegend />
      <WeeklyStats uid={uid} />
      <AdSlot size="box" />
      <LegalLinks />
    </div>
  );
}
