import { useRoom } from '../hooks/useRoom.js';
import { usePhaseFx } from '../hooks/usePhaseFx.js';
import { Lobby } from '../components/Lobby.jsx';
import { DuelStage } from '../components/DuelViews.jsx';
import { HostControls } from '../components/HostControls.jsx';
import { RescueAdmin } from '../components/Rescue.jsx';
import { Scoreboard } from '../components/Scoreboard.jsx';
import { PhaseOverlay, PhaseBadge } from '../components/PhaseOverlay.jsx';
import { OfflineBanner, Loading, useToast, useAction } from '../components/ui.jsx';
import { Wrapped } from './Wrapped.jsx';
import { navigate } from '../lib/router.js';

/** Hauptbildschirm (Laptop/TV). Der Host bedient ihn per Maus/Touch. */
export function HostScreen({ uid, code }) {
  const { room, players, byId, duel, rescues, online, loading } = useRoom(code);
  const overlay = usePhaseFx(room, duel);
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);

  if (loading) return <Loading text="Lade Arena…" />;
  if (!room) return <div className="page center"><h2>Raum {code} nicht gefunden</h2><button className="btn" onClick={() => navigate('/')}>Start</button></div>;
  if (room.hostId !== uid) return <div className="page center"><h2>Nur das Host-Gerät kann diesen Bildschirm öffnen.</h2></div>;
  if (room.status === 'finished') return <Wrapped code={code} players={players} />;

  return (
    <div className="page wide">
      <PhaseOverlay phase={overlay} />
      <OfflineBanner online={online} />
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
