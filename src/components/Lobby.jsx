import { EQUIPMENT } from '../game/constants.js';
import { AdSlot } from './AdSlot.jsx';
import { WeekCard } from './CrewPanel.jsx';
import { GameArt } from './GameArt.jsx';
import { GAMES } from '../game/gameLibrary.js';
import { startGame, updateLobby, kickPlayer } from '../game/engine.js';
import { BoardMap } from './board/BoardMap.jsx';
import { startBoardGame } from '../game/boardEngine.js';
import { startGroupGame } from '../game/groupEngine.js';
import { t } from '../i18n/index.js';
import { PlayerRow, QRCode } from './ui.jsx';

/** Lobby-Ansicht. Mit isHost: Startknopf, Kick, "trotzdem starten". */
export function Lobby({ code, room, players, meId, isHost, run, busy, big }) {
  const board = room.gameMode === 'board';
  const group = room.gameMode === 'group';
  const start = () => (board ? startBoardGame(code) : group ? startGroupGame(code) : startGame(code));
  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${code}`;
  const full = players.length >= room.expectedPlayers;
  const equipment = EQUIPMENT.filter((e) => room.equipment.includes(e.id));

  const startAnyway = () => run(async () => {
    await updateLobby(code, { expectedPlayers: players.length, equipment: room.equipment, totalRounds: room.totalRounds, gameMode: room.gameMode, stealth: !!room.stealth, screen: room.mode === 'screen' });
    await start();
  });

  const summary = (
    <>
      {board ? `🎲 ${t('Spielfeld-Modus ({n} Felder, alkoholfrei)', { n: room.board.fields.length })}`
        : group ? `👥 ${t('Gruppen-Modus · {n} Runden, alle gleichzeitig', { n: room.totalRounds })}`
          : `🍻 ${t('Party-Modus · {n} Duelle', { n: room.totalRounds })}`}
      {room.stealth ? ` · 🤫` : ''}
    </>
  );
  const settings = (
    <details className="fold">
      <summary><span>{summary} · {t('{n} Spiele', { n: room.library.length })}</span></summary>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          {room.library.map((id) => <span key={id} className="pill" style={{ paddingLeft: 4 }}><GameArt game={GAMES[id]} size={20} /> {t(GAMES[id].name)}</span>)}
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {room.stealth ? `🤫 ${t('Stealth-/Uni-Modus')} · ` : ''}
          {t('Utensilien')}: {equipment.length ? equipment.map((e) => `${e.icon} ${t(e.label)}`).join(', ') : t('keine')} · {room.mode === 'screen' ? t('Hauptbildschirm') : t('Nur Handys')}
        </p>
      </div>
    </details>
  );
  const codeCard = (
    <div className="card center stack" style={{ gap: 6 }}>
      <div className="kicker">{t('Raumcode')}</div>
      <div style={{ fontSize: big ? 120 : 56, fontWeight: 900, letterSpacing: '0.12em', lineHeight: 1 }}>{code}</div>
      {big && <QRCode text={joinUrl} size={220} />}
      <p className="muted small" style={{ margin: 0, wordBreak: 'break-all' }}>{big ? joinUrl : t('Freunde öffnen die App und geben diesen Code ein.')}</p>
    </div>
  );
  const playerList = (
    <div className="card stack">
      <div className="row between">
        <h3>{t('Spieler')}</h3>
        <span className="pill accent">{players.length}/{room.expectedPlayers}</span>
      </div>
      {players.map((p) => (
        <PlayerRow key={p.id} player={p} me={p.id === meId}
          right={isHost && p.id !== meId
            ? <button className="btn ghost sm" onClick={() => run(() => kickPlayer(code, p.id))}>✕</button>
            : board || group ? <span className="pill">{t('bereit')}</span> : <span className="balance sip">{p.balance}</span>} />
      ))}
      {!players.length && <p className="faint center">{t('Noch niemand da…')}</p>}
    </div>
  );
  const actions = isHost ? (
    <div className="stack" style={{ gap: 8 }}>
      <button className="btn primary lg block" disabled={!full || busy} onClick={() => run(start)}>
        {full ? `🚀 ${t('Party starten')}` : t('Warte auf {n} Spieler…', { n: room.expectedPlayers - players.length })}
      </button>
      {!full && players.length >= 2 && (
        <button className="btn soft block" disabled={busy} onClick={startAnyway}>▶️ {t('Mit {n} Spielern starten', { n: players.length })}</button>
      )}
    </div>
  ) : <p className="center muted" style={{ fontWeight: 700, margin: 0 }}>⏳ {t('Warte, bis der Host startet…')}</p>;
  const boardCard = board && (
    <div className="card stack">
      <h3>🗺️ {t('Eure Map (zufällig ausgewählt)')}</h3>
      <BoardMap fields={room.board.fields} players={players} positions={{}} theme={room.board.theme} meId={meId} />
    </div>
  );

  // Spiel der Woche & Wochen-Regel (nicht im Party-Modus mit Schlücken)
  const weekCard = room.gameMode !== 'party' && <WeekCard week={room.week} compact={!big} />;

  if (big) {
    return (
      <div className="host-grid">
        <div className="stack">{codeCard}{settings}</div>
        <div className="stack">{weekCard}{boardCard}{playerList}{actions}</div>
      </div>
    );
  }
  // Handy: das Wichtigste zuerst – Code, Spieler, Start. Details eingeklappt darunter.
  return (
    <div className="stack">
      {codeCard}
      {playerList}
      {actions}
      {weekCard}
      {settings}
      {boardCard}
      {!isHost && <AdSlot />}
    </div>
  );
}
