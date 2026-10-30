import { useState } from 'react';
import { Waiting } from './shared.jsx';
import { sfx } from '../lib/sound.js';

/** Spiel 5 – Schätz-Duell: geheime Eingabe, wer näher dran ist, gewinnt. */
function Question({ duel, big }) {
  return (
    <div className="card tinted center stack">
      <div style={{ fontSize: big ? 64 : 40 }}>🤔</div>
      <h2 style={{ fontSize: big ? 44 : 24, lineHeight: 1.15 }}>{duel.game.q}</h2>
    </div>
  );
}

function Play({ duel, submit }) {
  const [val, setVal] = useState('');
  const [sent, setSent] = useState(false);
  if (sent) return <Waiting text="Tipp abgegeben 🤫 Warte auf dein Gegenüber…" />;
  return (
    <div className="stack">
      <Question duel={duel} />
      <input className="input" inputMode="decimal" placeholder={`Deine Schätzung ${duel.game.unit ? `(${duel.game.unit})` : ''}`}
        value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9.,]/g, ''))} />
      <button className="btn primary lg" disabled={!val} onClick={() => {
        submit({ guess: Number(val.replace(',', '.')) });
        sfx.betJingle();
        setSent(true);
      }}>Geheim abgeben</button>
    </div>
  );
}

function Stage({ duel, byId, big }) {
  const ids = [duel.playerA, duel.playerB];
  const done = ids.every((id) => duel.results?.[id]);
  return (
    <div className="stack">
      <Question duel={duel} big={big} />
      <div className="card stack">
        {done && <div className="center"><span className="kicker">Richtige Antwort</span><div className="big-number">{duel.game.a.toLocaleString('de-DE')} <span style={{ fontSize: 24 }}>{duel.game.unit}</span></div></div>}
        {ids.map((id) => {
          const res = duel.results?.[id];
          return (
            <div key={id} className="row between">
              <b>{byId[id]?.avatar} {byId[id]?.name}</b>
              <span className="balance">
                {!res ? 'überlegt…' : done ? `${res.guess.toLocaleString('de-DE')} (±${Math.abs(res.guess - duel.game.a).toLocaleString('de-DE')})` : '🔒 abgegeben'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const Estimate = {
  Play: ({ duel, submit }) => <Play duel={duel} submit={(d) => submit(null, d)} />,
  Stage,
  Review: Stage,
};
