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
  const [name, setName] = useState(localStorage.getItem('fo_name') || '');
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);

  const board = gameMode === 'board';
  const group = gameMode === 'group';
  const library = useMemo(() => libraryFor(gameMode, count, equipment), [gameMode, count, equipment]);
  // Jedes Spiel nur einmal pro Party → höchstens so viele Duelle wie Spiele
  const maxRounds = Math.max(1, library.length);
  useEffect(() => setRounds((r) => Math.min(r, maxRounds)), [maxRounds]);
  const toggle = (id) => setEquipment((eq) => (eq.includes(id) ? eq.filter((e) => e !== id) : [...eq, id]));

  const create = () => run(async () => {
    const code = await createRoom({ hostId: uid, mode, expectedPlayers: count, equipment, totalRounds: rounds, liveEvents, gameMode, boardLength, boardTheme });
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

  return (
    <div className="page">
      <div className="row between">
        <button className="btn ghost sm" title={t('Zur Startseite')} onClick={() => navigate('/')}>🏠</button>
        <h2>{t('Party erstellen')}</h2>
        <LangSwitch />
      </div>

      <div className="card stack">
        <h3>{t('Spielmodus')}</h3>
        <div className="grid-2">
          <button className={`chip mode-card ${gameMode === 'party' ? 'on' : ''}`} onClick={() => setGameMode('party')}>
            <span style={{ fontSize: 30 }}>🍻</span>{t('Party-Modus')}
            <span className="small muted" style={{ fontWeight: 500 }}>{t('1-gegen-1-Duelle, Schlücke, Wetten & Pleite-Regel')}</span>
          </button>
          <button className={`chip mode-card ${gameMode === 'board' ? 'on' : ''}`} onClick={() => setGameMode('board')}>
            <span style={{ fontSize: 30 }}>🎲</span>{t('Spielfeld-Modus')}
            <span className="small muted" style={{ fontWeight: 500 }}>{t('Alkoholfrei: alle spielen jede Challenge, wer zuerst im Ziel ist, gewinnt')}</span>
          </button>
        </div>
        <button className={`chip mode-card ${group ? 'on' : ''}`} style={{ width: '100%' }} onClick={() => setGameMode('group')}>
          <span style={{ fontSize: 30 }}>👥</span>{t('Gruppen-Modus')}
          <span className="small muted" style={{ fontWeight: 500 }}>{t('Alle spielen gleichzeitig, ohne Utensilien, für Punkte: Abstimmungen, Synch-Test, Hivemind, Beicht-Quiz, Ketten-Story & mehr')}</span>
        </button>
        {board && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="small muted">{t('Länge des Spielfelds')}</span>
            <div className="row">
              {Object.values(BOARD_LENGTHS).map((b) => (
                <button key={b.id} className={`chip grow ${boardLength === b.id ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setBoardLength(b.id)}>
                  {t(b.label)} · {t('ca. {n} Challenges', { n: b.rounds })}
                </button>
              ))}
            </div>
            <span className="small muted">{t('Themen-Welt')}</span>
            <ThemePicker value={boardTheme} onChange={setBoardTheme} />
          </div>
        )}
      </div>

      <div className="card stack">
        <h3>{t('Host-Modus')}</h3>
        <div className="grid-2">
          <button className={`chip ${mode === 'screen' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 16, borderRadius: 18 }} onClick={() => setMode('screen')}>
            <span style={{ fontSize: 30 }}>📺</span>{t('Hauptbildschirm')}
            <span className="small muted" style={{ fontWeight: 500 }}>{t('Laptop/TV + Handys als Controller')}</span>
          </button>
          <button className={`chip ${mode === 'mobile' ? 'on' : ''}`} style={{ flexDirection: 'column', padding: 16, borderRadius: 18 }} onClick={() => setMode('mobile')}>
            <span style={{ fontSize: 30 }}>📱</span>{t('Nur Handys')}
            <span className="small muted" style={{ fontWeight: 500 }}>{t('Raumcode, du hostest mit')}</span>
          </button>
        </div>
        {mode === 'mobile' && <input className="input" placeholder={t('Dein Name')} maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />}
      </div>

      <div className="card stack">
        <h3>{t('Spieleranzahl')}</h3>
        <div className="stepper" style={{ justifyContent: 'center' }}>
          <button onClick={() => setCount((c) => Math.max(2, c - 1))}>−</button>
          <div className="value">{count}</div>
          <button onClick={() => setCount((c) => Math.min(12, c + 1))}>+</button>
        </div>
      </div>

      {group ? (
        <div className="card flat tinted stack" style={{ gap: 8, padding: 14 }}>
          <b>{t('{n} Gruppen-Runden verfügbar – keine Utensilien nötig', { n: library.length })}</b>
          <div className="row wrap" style={{ gap: 6 }}>
            {library.map((g) => <span key={g.id} className="pill" style={{ background: `color-mix(in srgb, ${g.accent} 16%, var(--card))`, paddingLeft: 4 }}><GameArt game={g} size={20} /> {t(g.name)}</span>)}
          </div>
          {count < 3 && <p className="small muted" style={{ margin: 0 }}>{t('Abstimmung, Hivemind & Beicht-Quiz brauchen mind. 3 Spieler.')}</p>}
        </div>
      ) : <div className="card stack">
        <h3>{t('Vorhandene Utensilien')}</h3>
        <div className="row wrap">
          {EQUIPMENT.map((e) => (
            <button key={e.id} className={`chip ${equipment.includes(e.id) ? 'on' : ''}`} onClick={() => toggle(e.id)}>{e.icon} {t(e.label)}</button>
          ))}
          <button className={`chip ${equipment.length === 0 ? 'on' : ''}`} onClick={() => setEquipment([])}>🙅 {t('Gar nichts')}</button>
        </div>
        <div className="card flat tinted stack" style={{ gap: 8, padding: 14 }}>
          <b>{t('{n} Spiele verfügbar', { n: library.length })}{board ? ` ${t('(als Gruppen-Challenge)')}` : ''}</b>
          <div className="row wrap" style={{ gap: 6 }}>
            {library.map((g) => <span key={g.id} className="pill" style={{ background: `color-mix(in srgb, ${g.accent} 16%, var(--card))`, paddingLeft: 4 }}><GameArt game={g} size={20} /> {t(g.name)}</span>)}
          </div>
          {count < 3 && <p className="small muted" style={{ margin: 0 }}>{t('Farb-Sprint & Schätz-Duell brauchen mind. 3 Spieler.')}</p>}
        </div>
      </div>}

      {!board && <div className="card stack">
        <h3>{group ? t('Anzahl Runden') : t('Anzahl Duelle')}</h3>
        <div className="stepper" style={{ justifyContent: 'center' }}>
          <button onClick={() => setRounds((r) => Math.max(Math.min(3, maxRounds), r - 1))}>−</button>
          <div className="value">{rounds}</div>
          <button onClick={() => setRounds((r) => Math.min(maxRounds, r + 1))}>+</button>
        </div>
        <p className="small muted center" style={{ margin: 0 }}>
          {group ? t('Jedes Spiel nur einmal – max. {n} Runden.', { n: maxRounds }) : t('Jedes Spiel nur einmal – max. {n} Duelle.', { n: maxRounds })}<br />
          {group
            ? t('Die letzte Runde ist das Finale mit doppelten Punkten.')
            : `Warm-up: ${Math.max(1, Math.ceil((rounds - 1) * 0.5))} · Chaos: ${rounds - 1 - Math.max(1, Math.ceil((rounds - 1) * 0.5))} · Sudden Death: 1`}
        </p>
      </div>}

      <div className="card row">
        <div className="grow">
          <b>⚡ {t('Spontane Live-Events')}</b>
          <div className="small muted">
            {board
              ? t('Zwischendurch unerwartete Vollbild-Alarme – der Langsamste geht ein Feld zurück.')
              : group ? t('Zwischendurch unerwartete Vollbild-Alarme – der Langsamste verliert einen Punkt.')
              : t('Zwischen den Duellen unerwartete Vollbild-Alarme – der Langsamste trinkt 5 Schlücke.')}
          </div>
        </div>
        <button className={`chip ${liveEvents ? 'on' : ''}`} onClick={() => setLiveEvents((v) => !v)}>{liveEvents ? t('An') : t('Aus')}</button>
      </div>

      <button className="btn primary lg block" disabled={busy || !uid || (mode === 'mobile' && !name.trim())} onClick={create}>{t('Raum erstellen')}</button>
      {toastNode}
    </div>
  );
}
