import { useEffect, useMemo, useState } from 'react';
import { GameArt } from '../components/GameArt.jsx';
import { ThemePicker } from '../components/board/Board3D.jsx';
import { EQUIPMENT } from '../game/constants.js';
import { libraryFor } from '../game/group.js';
import { BOARD_LENGTHS } from '../game/board.js';
import { createRoom, joinRoom } from '../game/engine.js';
import { navigate } from '../lib/router.js';
import { detectCaps } from '../lib/device.js';
import { AVATARS } from '../game/constants.js';
import { useToast, useAction, LangSwitch } from '../components/ui.jsx';
import { t } from '../i18n/index.js';

export function CreateRoom({ uid }) {
  const [gameMode, setGameMode] = useState('party');
  const [boardLength, setBoardLength] = useState('normal');
  const [boardTheme, setBoardTheme] = useState('city');
  const [mode, setMode] = useState('screen');
  const [count, setCount] = useState(4);
  const [equipment, setEquipment] = useState([]);
  const [rounds, setRounds] = useState(8);
  const [liveEvents, setLiveEvents] = useState(true);
  const [stealth, setStealth] = useState(false);
  const [name, setName] = useState(localStorage.getItem('fo_name') || '');
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);

  const board = gameMode === 'board';
  const group = gameMode === 'group';
  const library = useMemo(() => libraryFor(gameMode, count, equipment, { stealth }), [gameMode, count, equipment, stealth]);
  // Jedes Spiel nur einmal pro Party → höchstens so viele Duelle wie Spiele
  const maxRounds = Math.max(1, library.length);
  useEffect(() => setRounds((r) => Math.min(r, maxRounds)), [maxRounds]);
  const toggle = (id) => setEquipment((eq) => (eq.includes(id) ? eq.filter((e) => e !== id) : [...eq, id]));

  const create = () => run(async () => {
    const code = await createRoom({ hostId: uid, mode, expectedPlayers: count, equipment, totalRounds: rounds, liveEvents: liveEvents && !stealth, gameMode, boardLength, boardTheme, stealth });
    if (mode === 'mobile') {
      localStorage.setItem('fo_name', name);
      await joinRoom(code, uid, { name, avatar: AVATARS[0], caps: detectCaps() });
      localStorage.setItem('fo_last', `/play/${code}`);
      navigate(`/play/${code}`);
    } else {
      localStorage.setItem('fo_last', `/host/${code}`);
      navigate(`/host/${code}`);
    }
  });

  const MODES = [
    { id: 'party', icon: '🍻', title: t('Party-Modus'), sub: t('1-gegen-1-Duelle mit Wetten & Schlücken') },
    { id: 'board', icon: '🎲', title: t('Spielfeld-Modus'), sub: t('Brettspiel ohne Alkohol – wer zuerst im Ziel ist') },
    { id: 'group', icon: '👥', title: t('Gruppen-Modus'), sub: t('Alle spielen gleichzeitig, für Punkte') },
  ];
  const Stepper = ({ label, value, dec, inc }) => (
    <div className="stack center" style={{ gap: 4 }}>
      <span className="small muted" style={{ fontWeight: 700 }}>{label}</span>
      <div className="mini-stepper">
        <button onClick={dec} aria-label="−">−</button>
        <div className="value">{value}</div>
        <button onClick={inc} aria-label="+">+</button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="row between">
        <button className="btn ghost sm" title={t('Zur Startseite')} onClick={() => navigate('/')}>🏠</button>
        <h2>{t('Party erstellen')}</h2>
        <LangSwitch />
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <h3>1 · {t('Was wollt ihr spielen?')}</h3>
        {MODES.map((m) => (
          <button key={m.id} className={`mode-row ${gameMode === m.id ? 'on' : ''}`} onClick={() => setGameMode(m.id)}>
            <span className="mode-ico">{m.icon}</span>
            <span className="grow"><b>{m.title}</b><br /><span className="mode-sub">{m.sub}</span></span>
            <span style={{ fontSize: 20 }}>{gameMode === m.id ? '✅' : ''}</span>
          </button>
        ))}
        {board && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="small muted" style={{ fontWeight: 700 }}>{t('Länge des Spielfelds')}</span>
            <div className="row">
              {Object.values(BOARD_LENGTHS).map((b) => (
                <button key={b.id} className={`chip grow ${boardLength === b.id ? 'on' : ''}`} style={{ justifyContent: 'center', flexDirection: 'column', gap: 0 }} onClick={() => setBoardLength(b.id)}>
                  {t(b.label)}<span className="small muted" style={{ fontWeight: 500 }}>{t('ca. {n} Challenges', { n: b.rounds })}</span>
                </button>
              ))}
            </div>
            <span className="small muted" style={{ fontWeight: 700 }}>{t('Themen-Welt')}</span>
            <ThemePicker value={boardTheme} onChange={setBoardTheme} />
          </div>
        )}
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <h3>2 · {t('Womit spielt ihr?')}</h3>
        <div className="grid-2">
          <button className={`chip ${mode === 'screen' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 12, borderRadius: 16, gap: 2 }} onClick={() => setMode('screen')}>
            <span style={{ fontSize: 26 }}>📺</span>{t('Hauptbildschirm')}
            <span className="small muted" style={{ fontWeight: 500 }}>{t('TV/Laptop + Handys')}</span>
          </button>
          <button className={`chip ${mode === 'mobile' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 12, borderRadius: 16, gap: 2 }} onClick={() => setMode('mobile')}>
            <span style={{ fontSize: 26 }}>📱</span>{t('Nur Handys')}
            <span className="small muted" style={{ fontWeight: 500 }}>{t('du spielst mit')}</span>
          </button>
        </div>
        {mode === 'mobile' && <input className="input" placeholder={t('Dein Name')} maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />}
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <h3>3 · {t('Wie viele?')}</h3>
        <div className={board ? '' : 'grid-2'}>
          <Stepper label={t('Spieler')} value={count} dec={() => setCount((c) => Math.max(2, c - 1))} inc={() => setCount((c) => Math.min(12, c + 1))} />
          {!board && (
            <Stepper label={group ? t('Runden') : t('Duelle')} value={rounds}
              dec={() => setRounds((r) => Math.max(Math.min(3, maxRounds), r - 1))} inc={() => setRounds((r) => Math.min(maxRounds, r + 1))} />
          )}
        </div>
        <p className="small muted center" style={{ margin: 0 }}>
          {board ? t('Ca. {n} Challenges – alle spielen jede Challenge.', { n: BOARD_LENGTHS[boardLength].rounds })
            : group ? t('Die letzte Runde ist das Finale mit doppelten Punkten.')
              : t('Das letzte Duell ist der Sudden Death.')}
        </p>
      </div>

      <details className="fold">
        <summary>
          <span>⚙️ {t('Weitere Einstellungen')}</span>
          <span className="small muted" style={{ fontWeight: 600 }}>
            {[stealth && '🤫', !stealth && liveEvents && '⚡', equipment.length ? EQUIPMENT.filter((e) => equipment.includes(e.id)).map((e) => e.icon).join('') : null].filter(Boolean).join(' ')}
          </span>
        </summary>
        <div className="stack" style={{ gap: 14 }}>
          {!group && (
            <div className="stack" style={{ gap: 6 }}>
              <b>{t('Vorhandene Utensilien')}</b>
              <div className="row wrap">
                {EQUIPMENT.map((e) => (
                  <button key={e.id} className={`chip ${equipment.includes(e.id) ? 'on' : ''}`} onClick={() => toggle(e.id)}>{e.icon} {t(e.label)}</button>
                ))}
              </div>
              <span className="small muted">{t('Ohne Auswahl: nur Spiele, die nichts brauchen.')}</span>
            </div>
          )}
          <label className="row" style={{ gap: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={stealth} onChange={(e) => setStealth(e.target.checked)} style={{ width: 22, height: 22, flexShrink: 0 }} />
            <span><b>🤫 {t('Stealth-/Uni-Modus')}</b><br /><span className="small muted">{t('Nur leise Spiele, keine Töne – z. B. für Vorlesung & Bibliothek.')}</span></span>
          </label>
          {!stealth && (
            <label className="row" style={{ gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={liveEvents} onChange={(e) => setLiveEvents(e.target.checked)} style={{ width: 22, height: 22, flexShrink: 0 }} />
              <span><b>⚡ {t('Spontane Live-Events')}</b><br /><span className="small muted">
                {board
                  ? t('Zwischendurch unerwartete Vollbild-Alarme – der Langsamste geht ein Feld zurück.')
                  : group ? t('Zwischendurch unerwartete Vollbild-Alarme – der Langsamste verliert einen Punkt.')
                    : t('Zwischen den Duellen unerwartete Vollbild-Alarme – der Langsamste trinkt 5 Schlücke.')}
              </span></span>
            </label>
          )}
        </div>
      </details>

      <details className="fold">
        <summary><span>🎮 {t('{n} Spiele dabei', { n: library.length })}</span></summary>
        <div className="row wrap" style={{ gap: 6 }}>
          {library.map((g) => <span key={g.id} className="pill" style={{ background: `color-mix(in srgb, ${g.accent} 16%, var(--card))`, paddingLeft: 4 }}><GameArt game={g} size={20} /> {t(g.name)}</span>)}
        </div>
      </details>

      <button className="btn primary lg block sticky-cta" disabled={busy || !uid || (mode === 'mobile' && !name.trim())} onClick={create}>
        {mode === 'mobile' && !name.trim() ? t('Gib oben deinen Namen ein') : `🚀 ${t('Raum erstellen')}`}
      </button>
      {toastNode}
    </div>
  );
}
