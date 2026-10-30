import { useState } from 'react';
import { useRoom } from '../hooks/useRoom.js';
import { usePhaseFx } from '../hooks/usePhaseFx.js';
import { Lobby } from '../components/Lobby.jsx';
import { PlayerDuelView } from '../components/DuelViews.jsx';
import { HostControls } from '../components/HostControls.jsx';
import { BankruptPanel, LoanInbox, RescueAdmin } from '../components/Rescue.jsx';
import { Scoreboard } from '../components/Scoreboard.jsx';
import { PhaseOverlay, PhaseBadge } from '../components/PhaseOverlay.jsx';
import { LiveEventOverlay } from '../components/LiveEventOverlay.jsx';
import { Avatar, Inventory, OfflineBanner, Loading, Sips, useToast, useAction } from '../components/ui.jsx';
import { Wrapped } from './Wrapped.jsx';
import { navigate } from '../lib/router.js';
import { isMuted, setMuted } from '../lib/sound.js';
import { BoardView, Standings, useAnimatedPositions } from '../components/board/BoardView.jsx';
import { BoardRound } from '../components/board/BoardRound.jsx';
import { BoardHostControls } from '../components/board/BoardHostControls.jsx';
import { GroupRound, PointsBoard } from '../components/group/GroupRound.jsx';
import { GroupHostControls } from '../components/group/GroupHostControls.jsx';

/** Handy-Controller. Im Modus "Nur Handys" enthält das Host-Handy zusätzlich die Host-Steuerung. */
export function PlayerController({ uid, code }) {
  const { room, players, byId, duel, round, rescues, online, loading } = useRoom(code);
  const overlay = usePhaseFx(room, duel ?? round);
  const positions = useAnimatedPositions(players, round);
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);
  const [showBoard, setShowBoard] = useState(false);
  const [muted, setMutedState] = useState(isMuted());

  if (loading) return <Loading />;
  if (!room) return <div className="page center"><h2>Raum {code} nicht gefunden</h2><button className="btn" onClick={() => navigate('/')}>Start</button></div>;
  const me = byId[uid];
  if (!me) {
    if (players.length === 0 && room.status === 'lobby') return <Loading />;
    return (
      <div className="page center">
        <h2>Du bist (noch) nicht in diesem Raum.</h2>
        {room.status === 'lobby' && <button className="btn primary" onClick={() => navigate(`/join/${code}`)}>Beitreten</button>}
      </div>
    );
  }
  if (room.status === 'finished') return <Wrapped code={code} players={players} room={room} />;

  const isHost = room.hostId === uid;
  const board = room.gameMode === 'board';
  const group = room.gameMode === 'group';
  const goal = board ? room.board.fields.length - 1 : 0;

  return (
    <div className="page">
      <PhaseOverlay phase={overlay} mode={room.gameMode} />
      <OfflineBanner online={online} />
      <LiveEventOverlay code={code} room={room} players={players} byId={byId} me={me} isHost={isHost} run={run} />
      <header className="row">
        <Avatar player={me} />
        <div className="grow">
          <div style={{ fontWeight: 900, fontSize: 18 }}>{me.name}{isHost && <span className="pill" style={{ marginLeft: 6 }}>Host</span>}</div>
          {board ? <span className="small muted">🎲 Spielfeld-Modus</span> : group ? <span className="small muted">👥 Gruppen-Modus</span> : <Inventory inventory={me.inventory} />}
        </div>
        {group ? <span className="balance">⭐ {me.points ?? 0} P</span> : board
          ? <span className="balance">📍 {me.position ?? 0}/{goal}{me.skipNext ? ' ⏸️' : ''}</span>
          : <Sips n={me.balance} className="big" />}
        <button className="btn ghost sm" onClick={() => { setMuted(!muted); setMutedState(!muted); }}>{muted ? '🔇' : '🔊'}</button>
      </header>

      {room.status === 'lobby' ? (
        <Lobby code={code} room={room} players={players} meId={uid} isHost={isHost} run={run} busy={busy} />
      ) : group ? (
        <>
          <PhaseBadge room={room} />
          <div className="phase-strip" />
          {round ? <GroupRound code={code} round={round} byId={byId} me={me} run={run} isHost={isHost} /> : <div className="card center muted">Gleich geht's los…</div>}
          {isHost && <GroupHostControls code={code} room={room} round={round} byId={byId} run={run} busy={busy} />}
          <button className="btn ghost sm" onClick={() => setShowBoard((s) => !s)}>{showBoard ? 'Punktestand ausblenden' : '⭐ Punktestand'}</button>
          {showBoard && <PointsBoard players={players} meId={uid} />}
        </>
      ) : board ? (
        <>
          <PhaseBadge room={room} />
          <div className="phase-strip" />
          <BoardView fields={room.board.fields} players={players} positions={positions} compact />
          {round ? <BoardRound code={code} round={round} byId={byId} me={me} run={run} /> : <div className="card center muted">Gleich geht's los…</div>}
          {isHost && <BoardHostControls code={code} room={room} round={round} byId={byId} run={run} busy={busy} />}
          <button className="btn ghost sm" onClick={() => setShowBoard((s) => !s)}>{showBoard ? 'Rangliste ausblenden' : '🏆 Wer führt?'}</button>
          {showBoard && <Standings players={players} fields={room.board.fields} meId={uid} />}
        </>
      ) : (
        <>
          <PhaseBadge room={room} />
          <div className="phase-strip" />
          <LoanInbox code={code} me={me} byId={byId} rescues={rescues} run={run} />
          {me.balance <= 0 && <BankruptPanel code={code} me={me} players={players} rescues={rescues} run={run} />}
          {duel ? (
            <PlayerDuelView code={code} room={room} duel={duel} me={me} byId={byId} players={players} run={run} />
          ) : (
            <div className="card center muted">Gleich geht's los…</div>
          )}
          {isHost && (
            <>
              <HostControls code={code} room={room} duel={duel} byId={byId} run={run} busy={busy} />
              <RescueAdmin code={code} byId={byId} rescues={rescues} run={run} />
            </>
          )}
          <button className="btn ghost sm" onClick={() => setShowBoard((s) => !s)}>{showBoard ? 'Rangliste ausblenden' : '🏆 Rangliste'}</button>
          {showBoard && <Scoreboard players={players} meId={uid} duel={duel} />}
          {me.debts?.length > 0 && (
            <p className="small muted center">Offene Schulden: {me.debts.map((d) => `${d.amount} an ${d.to === 'bank' ? 'Bank' : byId[d.to]?.name}`).join(', ')}</p>
          )}
        </>
      )}
      {toastNode}
    </div>
  );
}
