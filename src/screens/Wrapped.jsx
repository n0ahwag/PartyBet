import { useEffect, useMemo, useRef, useState } from 'react';
import { useEvents } from '../hooks/useRoom.js';
import { buildWrapped, buildBoardWrapped, buildGroupWrapped } from '../game/wrapped.js';
import { sfx } from '../lib/sound.js';
import { navigate } from '../lib/router.js';
import { recordParty, createRematch } from '../game/crewEngine.js';
import { joinRoom } from '../game/engine.js';
import { detectCaps } from '../lib/device.js';
import { CrewPanel } from '../components/CrewPanel.jsx';
import { t, useLang } from '../i18n/index.js';

const SLIDE_MS = 6500;

/** Spotify-Style Party-Wrapped: Story-Karten, Tippen = weiter. */
export function Wrapped({ code, players, room, uid = null }) {
  const events = useEvents(code, true);
  const lang = useLang();
  const cards = useMemo(
    () => (room?.gameMode === 'board' ? buildBoardWrapped(players, events, room)
      : room?.gameMode === 'group' || room?.gameMode === 'library' ? buildGroupWrapped(players, events)
        : buildWrapped(players, events)),
    [players, events, room, lang], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [i, setI] = useState(0);
  const isHost = !!uid && room?.hostId === uid;
  const me = players.find((p) => p.id === uid) ?? null;
  const [busy, setBusy] = useState(false);
  const joined = useRef(false);

  // Host trägt die Party einmal in die Crew-Bilanz ein (Siege, Serien, Abzeichen)
  useEffect(() => { if (isHost && !room.crewRecorded) recordParty(code).catch(() => {}); }, [isHost, room?.crewRecorded, code]);

  // Revanche: alle springen automatisch in den neuen Raum
  useEffect(() => {
    const next = room?.rematch;
    if (!next || joined.current) return;
    joined.current = true;
    (async () => {
      if (me) {
        try { await joinRoom(next, uid, { name: me.name, avatar: me.avatar, caps: me.caps || detectCaps() }); } catch { /* Raum voll o. ä. → normal beitreten */ }
        localStorage.setItem('fo_last', `/play/${next}`);
        navigate(`/play/${next}`);
      } else if (isHost) {
        localStorage.setItem('fo_last', `/host/${next}`);
        navigate(`/host/${next}`);
      } else navigate(`/join/${next}`);
    })();
  }, [room?.rematch]); // eslint-disable-line react-hooks/exhaustive-deps

  const rematch = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try { await createRematch(code, uid); } catch { setBusy(false); }
  };
  const card = cards[Math.min(i, cards.length - 1)];
  const last = i >= cards.length - 1;

  useEffect(() => {
    sfx.tusch();
    if (last) return undefined;
    const t = setTimeout(() => setI((x) => x + 1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, last]);

  return (
    <div className="wrapped" style={{ background: `linear-gradient(160deg, ${card.gradient[0]}, ${card.gradient[1]})` }}
      onClick={(e) => {
        const left = e.clientX < window.innerWidth * 0.3;
        setI((x) => Math.max(0, Math.min(cards.length - 1, x + (left ? -1 : 1))));
      }}>
      <div className="row" style={{ gap: 10 }}>
        <div className="progress grow">{cards.map((c, idx) => <div key={c.id} className={idx <= i ? 'done' : ''} />)}</div>
        <button className="btn sm" style={{ background: 'rgba(255,255,255,0.9)', color: '#141E30' }} title={t('Zur Startseite')}
          onClick={(e) => { e.stopPropagation(); navigate('/'); }}>🏠</button>
      </div>
      <div className="body" key={card.id}>
        <div className="kick slide-up">{card.kicker}</div>
        {card.player && <div className="pop" style={{ fontSize: 110 }}>{card.player.avatar}</div>}
        <div className="headline slide-up">{card.title}</div>
        {card.lines?.map((l) => <div key={l} className="line slide-up">{l}</div>)}
        {card.ranking && (
          <div className="stack slide-up" style={{ gap: 8 }}>
            {card.ranking.map((p, idx) => (
              <div key={p.id} className="row" style={{ fontSize: 22, fontWeight: 800 }}>
                <span style={{ width: 36, opacity: 0.7 }}>{idx + 1}.</span>
                <span>{p.avatar}</span>
                <span className="grow">{p.name}</span>
                <span>{p.value ?? `${p.balance} 🍺`}</span>
              </div>
            ))}
            <CrewPanel room={room} players={players} me={me} />
            {isHost ? (
              <button className="btn rematch-btn" disabled={busy} onClick={rematch}>
                🔁 {busy ? t('Neuer Raum wird erstellt …') : t('Revanche – gleiche Crew, neue Party')}
              </button>
            ) : (
              <div className="small center" style={{ opacity: 0.85, fontWeight: 700 }}>🔁 {t('Der Host kann eine Revanche starten – du bist dann automatisch dabei.')}</div>
            )}
            <button className="btn" style={{ background: 'rgba(255,255,255,.85)', color: '#141E30' }}
              onClick={(e) => { e.stopPropagation(); localStorage.removeItem('fo_last'); navigate('/'); }}>
              {t('Neue Party')}
            </button>
          </div>
        )}
      </div>
      <div className="small center" style={{ opacity: 0.7 }}>{t('Tippen für weiter')} · FaceOff {room?.gameMode === 'board' ? t('Spielfeld') : room?.gameMode === 'group' ? t('Gruppen') : 'Party'} Wrapped</div>
    </div>
  );
}
