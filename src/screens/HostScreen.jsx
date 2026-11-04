import { useEffect } from 'react';
import { setStealth } from '../lib/sound.js';
import { useRoom } from '../hooks/useRoom.js';
import { usePhaseFx } from '../hooks/usePhaseFx.js';
import { Lobby } from '../components/Lobby.jsx';
import { DuelStage } from '../components/DuelViews.jsx';
import { HostControls } from '../components/HostControls.jsx';
import { RescueAdmin } from '../components/Rescue.jsx';
import { Scoreboard } from '../components/Scoreboard.jsx';
import { effectiveFields } from '../game/board.js';
import { PhaseOverlay, PhaseBadge } from '../components/PhaseOverlay.jsx';
import { LiveEventOverlay } from '../components/LiveEventOverlay.jsx';
import { OfflineBanner, Loading, useToast, useAction, LangSwitch, HomeButton } from '../components/ui.jsx';
import { Wrapped } from './Wrapped.jsx';
import { Standings, FieldLegend, useAnimatedPositions, FieldBanner } from '../components/board/BoardView.jsx';
import { BoardMap } from '../components/board/BoardMap.jsx';
import { BoardRound, RoundBanners, RoundMoves } from '../components/board/BoardRound.jsx';
import { BoardHostControls } from '../components/board/BoardHostControls.jsx';
import { GroupRound, PointsBoard } from '../components/group/GroupRound.jsx';
import { GroupHostControls } from '../components/group/GroupHostControls.jsx';
import { LibraryLobby } from '../components/library/LibraryLobby.jsx';
import { navigate } from '../lib/router.js';
import { t } from '../i18n/index.js';

/** Hauptbildschirm (Laptop/TV). Der Host bedient ihn per Maus/Touch. */
export function HostScreen({ uid, code }) {
  const { room, players, byId, duel, round, rescues, online, loading } = useRoom(code);
  const overlay = usePhaseFx(room, duel ?? round);
  const { positions, banner, finished: animDone, animated, activeId } = useAnimatedPositions(players, round);
  // Neu geräumte Felder erst nach der Zug-Animation von der Karte nehmen
  const shownCleared = (room?.board?.cleared || []).filter((i) => animDone || round?.stage !== 'resolved' || !(round?.cleared || []).includes(i));
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);
  // Spielfeld: Karte erst nach dem Ziehen (bzw. vor der ersten Challenge), sonst nur Spiel/Würfel
  // Stealth-/Uni-Modus: dieses Gerät bleibt lautlos, solange es in der Party ist
  useEffect(() => { setStealth(room?.stealth); return () => setStealth(false); }, [room?.stealth]);
  // Spielfeld auf dem Hauptbildschirm: festes Layout ohne Seiten-Scrollen (Karte links, Seitenleiste rechts)
  const boardLayout = room?.gameMode === 'board' && room?.status === 'playing';
  useEffect(() => {
    if (!boardLayout) return undefined;
    window.scrollTo({ top: 0 });
    document.documentElement.classList.add('no-page-scroll');
    return () => document.documentElement.classList.remove('no-page-scroll');
  }, [boardLayout]);

  if (loading) return <Loading text={t('Lade Arena…')} />;
  if (!room) return <div className="page center"><h2>{t('Raum {code} nicht gefunden', { code })}</h2><button className="btn" onClick={() => navigate('/')}>{t('Zur Startseite')}</button></div>;
  if (room.hostId !== uid) return <div className="page center"><h2>{t('Nur das Host-Gerät kann diesen Bildschirm öffnen.')}</h2><button className="btn" onClick={() => navigate('/')}>{t('Zur Startseite')}</button></div>;
  if (room.status === 'finished') return <Wrapped code={code} players={players} room={room} uid={uid} />;

  return (
    <div className="page wide">
      <PhaseOverlay phase={overlay} mode={room.gameMode} />
      <OfflineBanner online={online} />
      <LiveEventOverlay code={code} room={room} players={players} byId={byId} me={null} isHost run={run} />
      <header className="row between">
        <h1 className="logo" style={{ fontSize: 36 }}>FaceOff <span>Party</span></h1>
        <div className="row">
          <PhaseBadge room={room} />
          <span className="pill">Code {code}</span>
          <LangSwitch />
          <HomeButton confirm isHost />
        </div>
      </header>
      {room.status === 'playing' && <div className="phase-strip" />}

      {room.gameMode === 'library' ? (
        <LibraryLobby code={code} room={room} players={players} byId={byId} round={round} me={null} isHost run={run} busy={busy} big />
      ) : room.status === 'lobby' ? (
        <Lobby code={code} room={room} players={players} isHost run={run} busy={busy} big />
      ) : room.gameMode === 'group' ? (
        <div className="host-grid">
          <div className="stack">
            {round ? <div className="card"><GroupRound room={room} code={code} round={round} byId={byId} me={null} big run={run} isHost /></div>
              : <div className="card center"><h2>{t('Bereit für die erste Runde?')}</h2></div>}
          </div>
          <div className="stack">
            <GroupHostControls code={code} room={room} round={round} byId={byId} run={run} busy={busy} />
            <div className="card stack">
              <h3>{t('Punktestand')}</h3>
              <PointsBoard players={players} />
            </div>
          </div>
        </div>
      ) : room.gameMode === 'board' ? (
        <div className="board-stage">
          {/* Die Karte bleibt immer stehen – nur die Seitenleiste wechselt ihren Inhalt */}
          <div className="board-stage-map">
            <BoardMap fields={room.board.fields} cleared={shownCleared} players={players} positions={positions} theme={room.board.theme} follow fill focus={banner?.playerId ?? activeId} />
            <div className="board-stage-banners"><RoundBanners round={round} byId={byId} /></div>
            <FieldBanner banner={banner} byId={byId} />
          </div>
          <aside className="board-side">
            {round && round.stage !== 'resolved' && (
              <div className="card"><BoardRound room={room} code={code} round={round} byId={byId} me={null} run={run} fields={effectiveFields(room.board.fields, room.board.cleared)} /></div>
            )}
            <BoardHostControls code={code} room={room} round={round} byId={byId} run={run} busy={busy} animDone={animDone} animated={animated} />
            <RoundMoves round={round} byId={byId} />
            <details className="card">
              <summary><b>🏆 {t('Wer führt?')}</b></summary>
              <div style={{ marginTop: 10 }}><Standings players={players} fields={effectiveFields(room.board.fields, room.board.cleared)} /></div>
            </details>
            <FieldLegend />
          </aside>
        </div>
      ) : (
        <div className="host-grid">
          <div className="stack">
            {duel ? <DuelStage duel={duel} byId={byId} big /> : <div className="card center"><h2>{t('Bereit für das erste Duell?')}</h2></div>}
          </div>
          <div className="stack">
            <HostControls code={code} room={room} duel={duel} byId={byId} run={run} busy={busy} />
            <RescueAdmin code={code} byId={byId} rescues={rescues} run={run} />
            <div className="card stack">
              <h3>{t('Rangliste')}</h3>
              <Scoreboard players={players} duel={duel} />
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}
