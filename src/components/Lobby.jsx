import { EQUIPMENT } from '../game/constants.js';
import { GAMES } from '../game/gameLibrary.js';
import { startGame, updateLobby, kickPlayer } from '../game/engine.js';
import { startBoardGame } from '../game/boardEngine.js';
import { BOARD_LENGTHS } from '../game/board.js';
import { PlayerRow, QRCode } from './ui.jsx';

/** Lobby-Ansicht. Mit isHost: Startknopf, Kick, "trotzdem starten". */
export function Lobby({ code, room, players, meId, isHost, run, busy, big }) {
  const board = room.gameMode === 'board';
  const start = () => (board ? startBoardGame(code) : startGame(code));
  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${code}`;
  const full = players.length >= room.expectedPlayers;
  const equipment = EQUIPMENT.filter((e) => room.equipment.includes(e.id));

  const startAnyway = () => run(async () => {
    await updateLobby(code, { expectedPlayers: players.length, equipment: room.equipment, totalRounds: room.totalRounds });
    await start();
  });

  return (
    <div className={big ? 'host-grid' : 'stack'}>
      <div className="stack">
        <div className="card center stack">
          <div className="kicker">Raumcode</div>
          <div style={{ fontSize: big ? 120 : 64, fontWeight: 900, letterSpacing: '0.12em', lineHeight: 1 }}>{code}</div>
          {big && <QRCode text={joinUrl} size={220} />}
          <p className="muted small" style={{ margin: 0, wordBreak: 'break-all' }}>{joinUrl}</p>
        </div>
        <div className="card stack">
          <h3>Spielebibliothek ({room.library.length})</h3>
          <div className="row wrap" style={{ gap: 6 }}>
            {room.library.map((id) => <span key={id} className="pill">{GAMES[id].icon} {GAMES[id].name}</span>)}
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {board ? `🎲 Spielfeld-Modus (${BOARD_LENGTHS[room.board.length].fields} Felder, alkoholfrei)` : `🍻 Party-Modus · ${room.totalRounds} Duelle`}
            {' · '}Utensilien: {equipment.length ? equipment.map((e) => `${e.icon} ${e.label}`).join(', ') : 'keine'} · {room.mode === 'screen' ? 'Hauptbildschirm' : 'Nur Handys'}
          </p>
        </div>
      </div>
      <div className="stack">
        <div className="card stack">
          <div className="row between">
            <h3>Spieler</h3>
            <span className="pill accent">{players.length}/{room.expectedPlayers}</span>
          </div>
          {players.map((p) => (
            <PlayerRow key={p.id} player={p} me={p.id === meId}
              right={isHost && p.id !== meId
                ? <button className="btn ghost sm" onClick={() => run(() => kickPlayer(code, p.id))}>✕</button>
                : board ? <span className="pill">bereit</span> : <span className="balance sip">{p.balance}</span>} />
          ))}
          {!players.length && <p className="faint center">Noch niemand da…</p>}
        </div>
        {isHost ? (
          <>
            <button className="btn primary lg block" disabled={!full || busy} onClick={() => run(start)}>
              {full ? '🚀 Party starten' : `Warte auf ${room.expectedPlayers - players.length} Spieler…`}
            </button>
            {!full && players.length >= 2 && (
              <button className="btn ghost sm" disabled={busy} onClick={startAnyway}>Mit {players.length} Spielern starten</button>
            )}
          </>
        ) : (
          <p className="center muted" style={{ fontWeight: 700 }}>Warte, bis der Host startet…</p>
        )}
      </div>
    </div>
  );
}
