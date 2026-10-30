import { useEffect, useMemo, useState } from 'react';
import { useEvents } from '../hooks/useRoom.js';
import { buildWrapped, buildBoardWrapped } from '../game/wrapped.js';
import { sfx } from '../lib/sound.js';
import { navigate } from '../lib/router.js';

const SLIDE_MS = 6500;

/** Spotify-Style Party-Wrapped: Story-Karten, Tippen = weiter. */
export function Wrapped({ code, players, room }) {
  const events = useEvents(code, true);
  const cards = useMemo(
    () => (room?.gameMode === 'board' ? buildBoardWrapped(players, events, room) : buildWrapped(players, events)),
    [players, events, room],
  );
  const [i, setI] = useState(0);
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
      <div className="progress">{cards.map((c, idx) => <div key={c.id} className={idx <= i ? 'done' : ''} />)}</div>
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
            <button className="btn" style={{ background: '#fff', color: '#141E30', marginTop: 16 }}
              onClick={(e) => { e.stopPropagation(); localStorage.removeItem('fo_last'); navigate('/'); }}>
              Neue Party
            </button>
          </div>
        )}
      </div>
      <div className="small center" style={{ opacity: 0.7 }}>Tippen für weiter · FaceOff {room?.gameMode === 'board' ? 'Spielfeld' : 'Party'} Wrapped</div>
    </div>
  );
}
