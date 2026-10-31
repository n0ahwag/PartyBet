import { EQUIPMENT } from '../game/constants.js';
import { AdSlot } from './AdSlot.jsx';
import { GameArt } from './GameArt.jsx';
import { GAMES } from '../game/gameLibrary.js';
import { startGame, updateLobby, kickPlayer, setBoardTheme } from '../game/engine.js';
import { Board3D, ThemePicker } from './board/Board3D.jsx';
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
    await updateLobby(code, { expectedPlayers: players.length, equipment: room.equipment, totalRounds: room.totalRounds, gameMode: room.gameMode });
    await start();
  });

  return (
    <div className={big ? 'host-grid' : 'stack'}>
      <div className="stack">
        <div className="card center stack">
          <div className="kicker">{t('Raumcode')}</div>
          <div style={{ fontSize: big ? 120 : 64, fontWeight: 900, letterSpacing: '0.12em', lineHeight: 1 }}>{code}</div>
          {big && <QRCode text={joinUrl} size={220} />}
          <p className="muted small" style={{ margin: 0, wordBreak: 'break-all' }}>{joinUrl}</p>
        </div>
        <div className="card stack">
          <h3>{t('Spielebibliothek')} ({room.library.length})</h3>
          <div className="row wrap" style={{ gap: 6 }}>
            {room.library.map((id) => <span key={id} className="pill" style={{ paddingLeft: 4 }}><GameArt game={GAMES[id]} size={20} /> {t(GAMES[id].name)}</span>)}
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {board ? `🎲 ${t('Spielfeld-Modus ({n} Felder, alkoholfrei)', { n: room.board.fields.length })}`
              : group ? `👥 ${t('Gruppen-Modus · {n} Runden, alle gleichzeitig', { n: room.totalRounds })}`
                : `🍻 ${t('Party-Modus · {n} Duelle', { n: room.totalRounds })}`}
            {' · '}{t('Utensilien')}: {equipment.length ? equipment.map((e) => `${e.icon} ${t(e.label)}`).join(', ') : t('keine')} · {room.mode === 'screen' ? t('Hauptbildschirm') : t('Nur Handys')}
          </p>
        </div>
      </div>
      <div className="stack">
        {board && (
          <div className="card stack">
            <h3>🗺️ {t('Themen-Welt')}</h3>
            <ThemePicker value={room.board.theme ?? 'city'} disabled={!isHost} onChange={(id) => isHost && run(() => setBoardTheme(code, id))} />
            <Board3D fields={room.board.fields} players={players} positions={{}} theme={room.board.theme ?? 'city'} seed={code} meId={meId} />
          </div>
        )}
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
        {isHost ? (
          <>
            <button className="btn primary lg block" disabled={!full || busy} onClick={() => run(start)}>
              {full ? `🚀 ${t('Party starten')}` : t('Warte auf {n} Spieler…', { n: room.expectedPlayers - players.length })}
            </button>
            {!full && players.length >= 2 && (
              <button className="btn ghost sm" disabled={busy} onClick={startAnyway}>{t('Mit {n} Spielern starten', { n: players.length })}</button>
            )}
          </>
        ) : (
          <>
            <p className="center muted" style={{ fontWeight: 700 }}>{t('Warte, bis der Host startet…')}</p>
            {!big && <AdSlot />}
          </>
        )}
      </div>
    </div>
  );
}
