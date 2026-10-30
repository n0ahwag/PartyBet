import { useMemo, useState } from 'react';
import { GAMES, CATEGORIES, playableFor } from '../../game/gameLibrary.js';
import { startLibraryRound, backToPicker } from '../../game/groupEngine.js';
import { kickPlayer, finishGame } from '../../game/engine.js';
import { GroupRound } from '../group/GroupRound.jsx';
import { GroupHostControls } from '../group/GroupHostControls.jsx';
import { GameCard } from '../../screens/Library.jsx';
import { Avatar, QRCode } from '../ui.jsx';
import { t, useLang } from '../../i18n/index.js';

/*
 * Bibliotheks-Lobby: Leute treten jederzeit bei, der Host wählt passende Spiele
 * aus (gefiltert nach Spielerzahl und Geräten). Gespielt wird wie im Gruppen-Modus:
 * alle gleichzeitig, Platz 1/2/3 = 3/2/1 Punkte.
 */

const MISSING_CAP = { needsMotion: 'Bewegungssensor', needsCompass: 'Kompass', needsCamera: 'Frontkamera' };

/** Spielauswahl: Spiele, die mit den Leuten in der Lobby funktionieren – oben die spielbaren. */
function GamePicker({ code, players, room, isHost, run, busy }) {
  const [noEquipment, setNoEquipment] = useState(false);
  const lang = useLang();
  const n = players.length;

  const { sections, locked, count } = useMemo(() => {
    const all = Object.values(GAMES).filter((g) => g.group !== false && (!noEquipment || !g.equipment.length));
    const capsOk = new Set(playableFor(all, players).map((g) => g.id));
    const fits = (g) => n >= g.minPlayers && capsOk.has(g.id);
    const order = ['group', 'anywhere', ...Object.keys(CATEGORIES).filter((k) => k !== 'anywhere' && k !== 'group')];
    const playable = all.filter(fits);
    return {
      count: playable.length,
      sections: order.map((id) => ({ id, cat: CATEGORIES[id], games: playable.filter((g) => g.kind === id) })).filter((s) => s.games.length),
      locked: all.filter((g) => !fits(g)).map((g) => {
        if (n < g.minPlayers) return { game: g, reason: t('noch {n} Spieler nötig', { n: g.minPlayers - n }) };
        const cap = Object.keys(MISSING_CAP).find((k) => g[k]);
        return { game: g, reason: t('nicht jedes Handy hat: {what}', { what: t(MISSING_CAP[cap]) }) };
      }),
    };
  }, [players, n, noEquipment, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const played = room.playedGames || [];
  const pick = (id) => run(() => startLibraryRound(code, id));

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 8 }}>
        <h3>🎮 {isHost ? t('Spiel auswählen') : t('Der Host wählt gleich ein Spiel aus…')}</h3>
        <p className="small muted" style={{ margin: 0 }}>
          {n < 2 ? t('Warte auf mindestens 2 Spieler…') : t('{count} Spiele passen zu {n} Spielern.', { count, n })}
        </p>
        <div className="grid-2">
          <button className={`chip ${!noEquipment ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setNoEquipment(false)}>{t('Alle Spiele')}</button>
          <button className={`chip ${noEquipment ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setNoEquipment(true)}>🙅 {t('Ohne Utensilien')}</button>
        </div>
      </div>
      {sections.map((s) => (
        <div key={s.id} className="stack" style={{ gap: 8 }}>
          <h3>{s.cat.icon} {t(s.cat.label)} <span className="faint">({s.games.length})</span></h3>
          {s.games.map((g) => (
            <GameCard key={g.id} game={g} disabled={!isHost || busy} onClick={() => pick(g.id)}
              note={played.includes(g.id) ? <span className="pill good">✓ {t('schon gespielt')}</span> : null} />
          ))}
        </div>
      ))}
      {locked.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <h3 className="muted">🔒 {t('Noch nicht spielbar')} <span className="faint">({locked.length})</span></h3>
          {locked.map(({ game, reason }) => (
            <GameCard key={game.id} game={game} disabled note={<span className="pill bad">{reason}</span>} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Raumcode + Spielerliste mit Punkten (Host kann Leute entfernen). */
function LobbyInfo({ code, players, meId, isHost, run, big }) {
  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${code}`;
  const sorted = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  return (
    <>
      <div className="card center stack">
        <div className="kicker">{t('Raumcode – jederzeit beitreten')}</div>
        <div style={{ fontSize: big ? 96 : 48, fontWeight: 900, letterSpacing: '0.12em', lineHeight: 1 }}>{code}</div>
        {big && <QRCode text={joinUrl} size={180} />}
        <p className="muted small" style={{ margin: 0, wordBreak: 'break-all' }}>{joinUrl}</p>
      </div>
      <div className="card stack">
        <div className="row between">
          <h3>{t('Spieler')}</h3>
          <span className="pill accent">{players.length}</span>
        </div>
        {sorted.map((p) => (
          <div key={p.id} className={`player-row ${p.id === meId ? 'me' : ''}`}>
            <Avatar player={p} />
            <div className="grow" style={{ fontWeight: 800 }}>{p.name} {p.id === meId && <span className="faint small">({t('du')})</span>}</div>
            <span className="balance">{p.points ?? 0} P</span>
            {isHost && p.id !== meId && <button className="btn ghost sm" onClick={() => run(() => kickPlayer(code, p.id))}>✕</button>}
          </div>
        ))}
        {!players.length && <p className="faint center">{t('Noch niemand da…')}</p>}
      </div>
    </>
  );
}

/** Steuerung nach einer Runde: nochmal oder anderes Spiel. */
function AfterRound({ code, round, isHost, run, busy, players }) {
  if (!isHost) return <p className="center muted" style={{ fontWeight: 700 }}>{t('Der Host wählt das nächste Spiel…')}</p>;
  const game = GAMES[round.gameId];
  return (
    <div className="card stack">
      <button className="btn primary lg block" disabled={busy || players.length < game.minPlayers} onClick={() => run(() => startLibraryRound(code, round.gameId))}>
        🔁 {t('Nochmal: {game}', { game: t(game.name) })}
      </button>
      <button className="btn soft block" disabled={busy} onClick={() => run(() => backToPicker(code))}>🎮 {t('Anderes Spiel wählen')}</button>
    </div>
  );
}

export function LibraryLobby({ code, room, players, byId, round, me, isHost, run, busy, big = false }) {
  const meId = me?.id ?? null;
  const active = round && round.stage !== 'resolved';
  const host = isHost && (
    <>
      {active && <GroupHostControls code={code} room={room} round={round} byId={byId} run={run} busy={busy} />}
      {active && <button className="btn ghost sm" disabled={busy} onClick={() => run(() => backToPicker(code))}>✕ {t('Runde abbrechen')}</button>}
    </>
  );
  const main = round ? (
    <>
      <div className="card"><GroupRound code={code} round={round} byId={byId} me={me} big={big} run={run} isHost={isHost} /></div>
      {round.stage === 'resolved' && <AfterRound code={code} round={round} isHost={isHost} run={run} busy={busy} players={players} />}
    </>
  ) : <GamePicker code={code} players={players} room={room} isHost={isHost} run={run} busy={busy} />;
  const close = isHost && (
    <button className="btn ghost sm" disabled={busy} onClick={() => { if (window.confirm(t('Lobby schließen und Ergebnisse zeigen?'))) run(() => finishGame(code)); }}>
      🏁 {t('Lobby schließen')}
    </button>
  );

  if (big) {
    return (
      <div className="host-grid">
        <div className="stack">{main}</div>
        <div className="stack">
          {host}
          <LobbyInfo code={code} players={players} meId={meId} isHost={isHost} run={run} big />
          {close}
        </div>
      </div>
    );
  }
  return (
    <div className="stack">
      {!round && <LobbyInfo code={code} players={players} meId={meId} isHost={isHost} run={run} />}
      {main}
      {host}
      {round && <LobbyInfo code={code} players={players} meId={meId} isHost={isHost} run={run} />}
      {close}
    </div>
  );
}
