import { useRoom } from '../hooks/useRoom.js';
import { usePhaseFx } from '../hooks/usePhaseFx.js';
import { Lobby } from '../components/Lobby.jsx';
import { DuelStage } from '../components/DuelViews.jsx';
import { HostControls } from '../components/HostControls.jsx';
import { RescueAdmin } from '../components/Rescue.jsx';
import { Scoreboard } from '../components/Scoreboard.jsx';
import { PhaseOverlay, PhaseBadge } from '../components/PhaseOverlay.jsx';
import { LiveEventOverlay } from '../components/LiveEventOverlay.jsx';
import { OfflineBanner, Loading, useToast, useAction } from '../components/ui.jsx';
import { Wrapped } from './Wrapped.jsx';
import { BoardView, Standings, FieldLegend, useAnimatedPositions } from '../components/board/BoardView.jsx';
import { BoardRound } from '../components/board/BoardRound.jsx';
import { BoardHostControls } from '../components/board/BoardHostControls.jsx';
import { navigate } from '../lib/router.js';

/** Hauptbildschirm (Laptop/TV). Der Host bedient ihn per Maus/Touch. */
export function HostScreen({ uid, code }) {
  const { room, players, byId, duel, round, rescues, online, loading } = useRoom(code);
  const overlay = usePhaseFx(room, duel ?? round);
  const positions = useAnimatedPositions(players, round);
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);

  if (loading) return <Loading text="Lade Arena…" />;
  if (!room) return <div className="page center"><h2>Raum {code} nicht gefunden</h2><button className="btn" onClick={() => navigate('/')}>Start</button></div>;
  if (room.hostId !== uid) return <div className="page center"><h2>Nur das Host-Gerät kann diesen Bildschirm öffnen.</h2></div>;
  if (room.status === 'finished') return <Wrapped code={code} players={players} room={room} />;

  return (
    <div className="page wide">
      <PhaseOverlay phase={overlay} board={room.gameMode === 'board'} />
      <OfflineBanner online={online} />
      <LiveEventOverlay code={code} room={room} players={players} byId={byId} me={null} isHost run={run} />
      <header className="row between">
        <h1 className="logo" style={{ fontSize: 36 }}>FaceOff <span>Party</span></h1>
        <div className="row">
          <PhaseBadge room={room} />
          <span className="pill">Code {code}</span>
        </div>
      </header>
      {room.status === 'playing' && <div className="phase-strip" />}

      {room.status === 'lobby' ? (
        <Lobby code={code} room={room} players={players} isHost run={run} busy={busy} big />
      ) : room.gameMode === 'board' ? (
        <div className="host-grid">
          <div className="stack">
            <BoardView fields={room.board.fields} players={players} positions={positions} />
            <FieldLegend />
            {round ? <div className="card"><BoardRound code={code} round={round} byId={byId} me={null} big run={run} /></div>
              : <div className="card center"><h2>Bereit für die erste Challenge?</h2></div>}
          </div>
          <div className="stack">
            <BoardHostControls code={code} room={room} round={round} byId={byId} run={run} busy={busy} />
            <div className="card stack">
              <h3>Wer führt?</h3>
              <Standings players={players} fields={room.board.fields} />
            </div>
          </div>
        </div>
      ) : (
        <div className="host-grid">
          <div className="stack">
            {duel ? <DuelStage duel={duel} byId={byId} big /> : <div className="card center"><h2>Bereit für das erste Duell?</h2></div>}
          </div>
          <div className="stack">
            <HostControls code={code} room={room} duel={duel} byId={byId} run={run} busy={busy} />
            <RescueAdmin code={code} byId={byId} rescues={rescues} run={run} />
            <div className="card stack">
              <h3>Rangliste</h3>
              <Scoreboard players={players} duel={duel} />
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}
