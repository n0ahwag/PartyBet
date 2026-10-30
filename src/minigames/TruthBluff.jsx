import { useState } from 'react';
import { Waiting } from './shared.jsx';
import { sfx } from '../lib/sound.js';

/** Spiel 13 – Wahrheit oder Bluff: A behauptet, B (und alle anderen) raten. */
function Play({ duel, me, byId, submit }) {
  const [claim, setClaim] = useState('');
  const [truth, setTruth] = useState(null);
  const a = byId[duel.playerA];
  const claimRes = duel.results?.[duel.playerA];

  if (me.id === duel.playerA) {
    if (claimRes) return <Waiting text={`${byId[duel.playerB]?.name ?? 'Die anderen'} raten gerade…`} />;
    return (
      <div className="stack">
        <div className="card tinted"><b>Du behauptest!</b> Schreib etwas Verrücktes über dich – wahr oder gelogen.</div>
        <textarea className="input" rows={3} maxLength={140} placeholder="z. B. „Ich bin mal mit einem Kamel geritten.“" value={claim} onChange={(e) => setClaim(e.target.value)} />
        <div className="grid-2">
          <button className={`chip ${truth === true ? 'on' : ''}`} style={{ justifyContent: 'center', padding: 14 }} onClick={() => setTruth(true)}>✅ Stimmt</button>
          <button className={`chip ${truth === false ? 'on' : ''}`} style={{ justifyContent: 'center', padding: 14 }} onClick={() => setTruth(false)}>🤥 Gelogen</button>
        </div>
        <button className="btn primary lg" disabled={!claim.trim() || truth === null}
          onClick={() => { submit(null, { claim: claim.trim(), truth }); sfx.betJingle(); }}>Geheim abschicken</button>
      </div>
    );
  }
  if (!claimRes) return <Waiting text={`${a?.name} denkt sich gerade eine Behauptung aus…`} />;
  return (
    <div className="stack">
      <div className="card center stack">
        <div className="kicker">{a?.avatar} {a?.name} behauptet</div>
        <h2 style={{ fontSize: 26 }}>„{claimRes.claim}“</h2>
      </div>
      <div className="grid-2">
        <button className="btn primary lg" onClick={() => submit(null, { guess: true })}>✅ Wahr</button>
        <button className="btn lg" onClick={() => submit(null, { guess: false })}>🤥 Lüge</button>
      </div>
    </div>
  );
}

function Stage({ duel, byId, big }) {
  const a = byId[duel.playerA];
  const b = byId[duel.playerB];
  const claimRes = duel.results?.[duel.playerA];
  const guess = duel.results?.[duel.playerB];
  if (!claimRes) return <div className="card center muted" style={{ fontWeight: 700 }}>✍️ {a?.name} denkt sich eine Behauptung aus…</div>;
  return (
    <div className="stack">
      <div className="card tinted center stack">
        <div className="kicker">{a?.avatar} {a?.name} behauptet</div>
        <h2 style={{ fontSize: big ? 46 : 26, lineHeight: 1.15 }}>„{claimRes.claim}“</h2>
        {!guess && <p className="muted" style={{ margin: 0, fontWeight: 700 }}>{b ? `Alle raten laut mit: Wahr oder Lüge? ${b.name} entscheidet.` : 'Alle tippen auf ihrem Handy: Wahr oder Lüge?'}</p>}
      </div>
      {guess && (
        <div className="card center stack pop">
          <div>{b?.name} tippt auf <b>{guess.guess ? 'WAHR' : 'LÜGE'}</b></div>
          <h2 style={{ fontSize: big ? 40 : 24 }}>Auflösung: {claimRes.truth ? '✅ Stimmt!' : '🤥 Gelogen!'}</h2>
        </div>
      )}
    </div>
  );
}

/** Gruppen-Großbild: nur die Behauptung, Auflösung erst in der Platzierung. */
function GroupStage({ duel, byId, big }) {
  const a = byId[duel.playerA];
  const claimRes = duel.results?.[duel.playerA];
  return (
    <div className="card tinted center stack">
      <div className="kicker">{a?.avatar} {a?.name} erzählt</div>
      <h2 style={{ fontSize: big ? 46 : 24, lineHeight: 1.15 }}>{claimRes ? `„${claimRes.claim}“` : '✍️ denkt sich etwas aus…'}</h2>
    </div>
  );
}

export const TruthBluff = { Play, Stage, Review: Stage, GroupStage };
