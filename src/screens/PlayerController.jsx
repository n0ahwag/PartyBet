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
import { Avatar, Inventory, OfflineBanner, Loading, Sips, useToast, useAction, LangSwitch, HomeButton } from '../components/ui.jsx';
import { Wrapped } from './Wrapped.jsx';
import { LibraryLobby } from '../components/library/LibraryLobby.jsx';
import { navigate } from '../lib/router.js';
import { t } from '../i18n/index.js';
import { isMuted, setMuted } from '../lib/sound.js';
import { Standings, useAnimatedPositions } from '../components/board/BoardView.jsx';
import { Board3D } from '../components/board/Board3D.jsx';
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
  if (!room) return <div className="page center"><h2>{t('Raum {code} nicht gefunden', { code })}</h2><button className="btn" onClick={() => navigate('/')}>{t('Zur Startseite')}</button></div>;
  const me = byId[uid];
  if (!me) {
    if (players.length === 0 && room.status === 'lobby') return <Loading />;
    return (
      <div className="page center">
        <h2>{t('Du bist (noch) nicht in diesem Raum.')}</h2>
        {room.status === 'lobby' && <button className="btn primary" onClick={() => navigate(`/join/${code}`)}>{t('Beitreten')}</button>}
        <button className="btn ghost" onClick={() => navigate('/')}>🏠 {t('Zur Startseite')}</button>
      </div>
    );
  }
  if (room.status === 'finished') return <Wrapped code={code} players={players} room={room} />;

  const isHost = room.hostId === uid;
  const board = room.gameMode === 'board';
  const library = room.gameMode === 'library';
  const group = room.gameMode === 'group' || library;
  const goal = board ? room.board.fields.length - 1 : 0;

  return (
    <div className="page">
      <PhaseOverlay phase={overlay} mode={room.gameMode} />
      <OfflineBanner online={online} />
      <LiveEventOverlay code={code} room={room} players={players} byId={byId} me={me} isHost={isHost} run={run} />
      <div className="row between">
        <HomeButton confirm isHost={isHost} />
        <div className="row" style={{ gap: 6 }}>
          <button className="btn ghost sm" onClick={() => { setMuted(!muted); setMutedState(!muted); }}>{muted ? '🔇' : '🔊'}</button>
          <LangSwitch />
        </div>
      </div>
      <header className="row">
        <Avatar player={me} />
        <div className="grow">
          <div style={{ fontWeight: 900, fontSize: 18 }}>{me.name}{isHost && <span className="pill" style={{ marginLeft: 6 }}>Host</span>}</div>
          {board ? <span className="small muted">🎲 {t('Spielfeld-Modus')}</span> : library ? <span className="small muted">📚 {t('Bibliotheks-Lobby')}</span> : group ? <span className="small muted">👥 {t('Gruppen-Modus')}</span> : <Inventory inventory={me.inventory} />}
        </div>
        {group ? <span className="balance">⭐ {me.points ?? 0} P</span> : board
          ? <span className="balance">📍 {me.position ?? 0}/{goal}{me.skipNext ? ' ⏸️' : ''}</span>
          : <Sips n={me.balance} className="big" />}
      </header>

      {library ? (
        <LibraryLobby code={code} room={room} players={players} byId={byId} round={round} me={me} isHost={isHost} run={run} busy={busy} />
      ) : room.status === 'lobby' ? (
        <Lobby code={code} room={room} players={players} meId={uid} isHost={isHost} run={run} busy={busy} />
      ) : group ? (
        <>
          <PhaseBadge room={room} />
          <div className="phase-strip" />
          {round ? <GroupRound code={code} round={round} byId={byId} me={me} run={run} isHost={isHost} /> : <div className="card center muted">{t("Gleich geht's los…")}</div>}
          {isHost && <GroupHostControls code={code} room={room} round={round} byId={byId} run={run} busy={busy} />}
          <button className="btn ghost sm" onClick={() => setShowBoard((s) => !s)}>{showBoard ? t('Punktestand ausblenden') : `⭐ ${t('Punktestand')}`}</button>
          {showBoard && <PointsBoard players={players} meId={uid} />}
        </>
      ) : board ? (
        <>
          <PhaseBadge room={room} />
          <div className="phase-strip" />
          {/* Beim Würfeln steht der Würfel oben, sonst die Karte */}
          {round?.stage === 'review' && <BoardRound code={code} round={round} byId={byId} me={me} run={run} />}
          <Board3D fields={room.board.fields} players={players} positions={positions} theme={room.board.theme} seed={code} meId={uid} compact />
          {round?.stage !== 'review' && (round ? <BoardRound code={code} round={round} byId={byId} me={me} run={run} /> : <div className="card center muted">{t("Gleich geht's los…")}</div>)}
          {isHost && <BoardHostControls code={code} room={room} round={round} byId={byId} run={run} busy={busy} />}
          <button className="btn ghost sm" onClick={() => setShowBoard((s) => !s)}>{showBoard ? t('Rangliste ausblenden') : `🏆 ${t('Wer führt?')}`}</button>
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
            <div className="card center muted">{t("Gleich geht's los…")}</div>
          )}
          {isHost && (
            <>
              <HostControls code={code} room={room} duel={duel} byId={byId} run={run} busy={busy} />
              <RescueAdmin code={code} byId={byId} rescues={rescues} run={run} />
            </>
          )}
          <button className="btn ghost sm" onClick={() => setShowBoard((s) => !s)}>{showBoard ? t('Rangliste ausblenden') : `🏆 ${t('Rangliste')}`}</button>
          {showBoard && <Scoreboard players={players} meId={uid} duel={duel} />}
          {me.debts?.length > 0 && (
            <p className="small muted center">{t('Offene Schulden')}: {me.debts.map((d) => t('{n} an {name}', { n: d.amount, name: d.to === 'bank' ? t('Bank') : byId[d.to]?.name })).join(', ')}</p>
          )}
        </>
      )}
      {toastNode}
    </div>
  );
}
