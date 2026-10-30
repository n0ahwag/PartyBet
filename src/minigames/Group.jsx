import { useEffect, useRef, useState } from 'react';
import {
  tallyVotes, syncResult, storyState, syncWindow,
} from '../game/group.js';
import {
  submitGroupResult, submitSyncTap, submitConfessionFact, submitConfessionGuess, submitStoryWord,
} from '../game/groupEngine.js';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';

/*
 * Die 5 sozialen Gruppen-Spiele. Jedes exportiert:
 *   Play   – Handy eines Teilnehmers   Stage – Hauptbildschirm / Zuschauer
 *   Result – Auflösung nach der Runde
 */

const Name = ({ p }) => <>{p?.avatar} {p?.name}</>;

// ------------------------------------------------------------------ 1 Wer am ehesten …
function Question({ round, big }) {
  return <div className="card tinted center"><h2 style={{ fontSize: big ? 46 : 26, lineHeight: 1.15 }}>{round.game.question}</h2></div>;
}

const WhoMost = {
  Play({ code, round, me, byId, run }) {
    const mine = round.results?.[me.id]?.vote;
    if (mine) return <><Question round={round} /><Waiting text={`🗳️ Du hast für ${byId[mine]?.name} gestimmt – geheim!`} /></>;
    return (
      <div className="stack">
        <Question round={round} />
        <div className="grid-2">
          {round.participants.map((id) => (
            <button key={id} className="btn soft" onClick={() => run(async () => { await submitGroupResult(code, round.id, me.id, { vote: id }); sfx.betJingle(); })}>
              <Name p={byId[id]} />
            </button>
          ))}
        </div>
      </div>
    );
  },
  Stage({ round, big }) {
    const n = Object.values(round.results || {}).filter((r) => r?.vote).length;
    return <div className="stack"><Question round={round} big={big} /><p className="center muted" style={{ fontWeight: 700, margin: 0 }}>🗳️ {n}/{round.participants.length} haben abgestimmt</p></div>;
  },
  Result({ round, byId }) {
    const { counts, top } = tallyVotes(round);
    const max = Math.max(1, ...Object.values(counts));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return (
      <div className="stack">
        <Question round={round} />
        {top.length > 0 && <div className="card accent center pop"><h2>{top.map((id) => `${byId[id]?.avatar} ${byId[id]?.name}`).join(' & ')}</h2></div>}
        <div className="card stack">
          {sorted.map(([id, c]) => (
            <div key={id} className="stack" style={{ gap: 4 }}>
              <div className="row between"><b><Name p={byId[id]} /></b><span>{c} {c === 1 ? 'Stimme' : 'Stimmen'}</span></div>
              <div className="bar"><div style={{ width: `${(c / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="small muted center" style={{ margin: 0 }}>Wer mit der Mehrheit gestimmt hat, bekommt 1 Punkt.</p>
      </div>
    );
  },
};

// ------------------------------------------------------------------ 2 Synch-Test
const SyncTest = {
  Play({ code, round, me, run }) {
    const mine = round.results?.[me.id];
    const n = useGo(true);
    if (mine) return <Waiting text="✓ Getippt – wartet auf die anderen…" />;
    if (n > 0) return <div className="stack center"><p className="muted" style={{ fontWeight: 800, margin: 0 }}>Schaut euch an …</p><CountdownView n={n} /></div>;
    return (
      <div className="stack center">
        <p style={{ fontWeight: 800, margin: 0 }}>Zählt gemeinsam an und tippt ALLE im selben Moment!</p>
        <button className="btn primary lg block" style={{ minHeight: 240, fontSize: 34 }}
          onPointerDown={() => { vibrate(40); sfx.tap(); run(() => submitSyncTap(code, round.id, me.id)); }}>
          🤝 JETZT
        </button>
      </div>
    );
  },
  Stage({ round, byId, big }) {
    return (
      <div className="stack center">
        <div style={{ fontSize: big ? 96 : 56 }}>🤝</div>
        <h2 style={{ fontSize: big ? 40 : 24 }}>Alle gleichzeitig tippen!</h2>
        <p className="muted" style={{ margin: 0 }}>Zeitfenster: {syncWindow(round.participants.length)} ms</p>
        <div className="row wrap center" style={{ gap: 6 }}>
          {round.participants.map((id) => <span key={id} className={`pill ${round.results?.[id] ? 'good' : ''}`}><Name p={byId[id]} /> {round.results?.[id] ? '✓' : '…'}</span>)}
        </div>
      </div>
    );
  },
  Result({ round }) {
    const r = { ...syncResult(round), spread: round.spread ?? syncResult(round).spread, success: round.success ?? syncResult(round).success };
    return (
      <div className={`card center stack pop ${r.success ? 'accent' : ''}`}>
        <div style={{ fontSize: 56 }}>{r.success ? '🎉' : '😬'}</div>
        <h2>{r.success ? 'Synchron! Alle gewinnen.' : 'Leider nicht synchron.'}</h2>
        <div>Abweichung: <b>{r.spread ?? '–'} ms</b> (Ziel: ≤ {r.window} ms)</div>
      </div>
    );
  },
};

// ------------------------------------------------------------------ 3 Hivemind
function HivemindCall({ round, big }) {
  const [go, setGo] = useState(false);
  const n = useGo(round.stage === 'playing', () => { setGo(true); sfx.gong(); });
  return (
    <div className="stack center">
      <div className="card tinted center"><h2 style={{ fontSize: big ? 52 : 28 }}>{round.game.category}</h2></div>
      {round.stage === 'playing' && !go && n > 0 && <CountdownView n={n} />}
      {go && <div className="countdown-big pop">RUFT!</div>}
      {go && <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Alle gleichzeitig laut! Der Host trägt ein, wer das häufigste Wort hatte.</p>}
    </div>
  );
}
const Hivemind = {
  Play: ({ round }) => <HivemindCall round={round} />,
  Stage: ({ round, big }) => <HivemindCall round={round} big={big} />,
  Result({ round, byId }) {
    return (
      <div className="card center stack pop">
        <div className="kicker">{round.game.category}</div>
        {round.word && <h2 style={{ fontSize: 34 }}>„{round.word}“</h2>}
        <div>{(round.majority || []).length ? `Mehrheit: ${round.majority.map((id) => byId[id]?.name).join(', ')}` : 'Keine Mehrheit gefunden'}</div>
      </div>
    );
  },
};

// ------------------------------------------------------------------ 4 Beicht-Quiz
function FactCard({ round, byId, big }) {
  const owner = round.order?.[round.quizIndex];
  const fact = round.results?.[owner]?.fact;
  return (
    <div className="card tinted center stack">
      <div className="kicker">Geheimnis {round.quizIndex + 1}/{round.order.length}</div>
      <h2 style={{ fontSize: big ? 44 : 24, lineHeight: 1.2 }}>„{fact}“</h2>
      {round.revealed && <div className="pop" style={{ fontSize: big ? 32 : 20, fontWeight: 900 }}>Das war: <Name p={byId[owner]} /></div>}
    </div>
  );
}
const Confession = {
  Play({ code, round, me, byId, run }) {
    const [fact, setFact] = useState('');
    const mine = round.results?.[me.id];
    if (round.step === 'collect') {
      if (mine?.fact) return <Waiting text="🤫 Gespeichert. Warte, bis alle ihr Geheimnis eingetippt haben…" />;
      return (
        <div className="stack">
          <div className="card tinted"><b>Dein Geheimnis</b> – etwas Überraschendes oder Witziges über dich. Niemand sieht, dass es von dir ist.</div>
          <textarea className="input" rows={3} maxLength={140} placeholder="z. B. „Ich kann mit den Ohren wackeln.“" value={fact} onChange={(e) => setFact(e.target.value)} />
          <button className="btn primary lg" disabled={fact.trim().length < 4} onClick={() => run(() => submitConfessionFact(code, round.id, me.id, fact.trim()))}>Geheim abschicken</button>
        </div>
      );
    }
    const idx = round.quizIndex;
    const owner = round.order[idx];
    const myGuess = mine?.guesses?.[idx];
    const isMine = owner === me.id;
    return (
      <div className="stack">
        <FactCard round={round} byId={byId} />
        {isMine && !round.revealed && <div className="card center small">🤫 Das ist <b>dein</b> Geheimnis – stimm zum Schein ab, damit es keiner merkt.</div>}
        {!round.revealed && (myGuess ? <Waiting text={`Getippt: ${byId[myGuess]?.name}`} /> : (
          <div className="grid-2">
            {round.participants.filter((id) => id !== me.id).map((id) => (
              <button key={id} className="btn soft" onClick={() => run(() => submitConfessionGuess(code, round.id, me.id, idx, id))}><Name p={byId[id]} /></button>
            ))}
          </div>
        ))}
        {round.revealed && !isMine && <div className="card center pop">{myGuess === owner ? '✅ Richtig geraten! +1' : '❌ Daneben'}</div>}
      </div>
    );
  },
  Stage({ round, byId, big }) {
    if (round.step === 'collect') {
      const n = round.participants.filter((id) => round.results?.[id]?.fact).length;
      return <div className="stack center"><div style={{ fontSize: big ? 96 : 56 }}>🤫</div><h2>Alle tippen ein Geheimnis ein …</h2><p className="muted" style={{ margin: 0 }}>{n}/{round.participants.length} fertig</p></div>;
    }
    const idx = round.quizIndex;
    const owner = round.order[idx];
    const guessers = round.participants.filter((id) => id !== owner);
    const n = guessers.filter((id) => round.results?.[id]?.guesses?.[idx]).length;
    return (
      <div className="stack">
        <FactCard round={round} byId={byId} big={big} />
        {!round.revealed && <p className="center muted" style={{ fontWeight: 700, margin: 0 }}>Wer war's? {n}/{guessers.length} haben getippt</p>}
        {round.revealed && (
          <div className="row wrap center" style={{ gap: 6 }}>
            {guessers.map((id) => {
              const g = round.results?.[id]?.guesses?.[idx];
              return <span key={id} className={`pill ${g === owner ? 'good' : 'bad'}`}>{byId[id]?.name} → {byId[g]?.name ?? '–'}</span>;
            })}
          </div>
        )}
      </div>
    );
  },
  Result({ round, byId }) {
    return (
      <div className="stack">
        {(round.order || []).map((owner) => (
          <div key={owner} className="player-row">
            <div className="avatar">{byId[owner]?.avatar}</div>
            <div className="grow"><b>{byId[owner]?.name}</b><div className="small muted">„{round.results?.[owner]?.fact}“</div></div>
          </div>
        ))}
      </div>
    );
  },
};

// ------------------------------------------------------------------ 5 Ketten-Story
/** Liest einen Text per Sprachausgabe vor (Deutsch). */
export function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* keine Sprachausgabe verfügbar */
  }
}

function StoryText({ round, big }) {
  const { text } = storyState(round);
  return <div className="card tinted"><p style={{ margin: 0, fontSize: big ? 40 : 22, fontWeight: 700, lineHeight: 1.35 }}>{text} <span className="faint">…</span></p></div>;
}
const ChainStory = {
  Play({ code, round, me, byId, run }) {
    const [word, setWord] = useState('');
    const st = storyState(round);
    const myTurn = st.turn === me.id && !st.done;
    const send = () => {
      const w = word.trim().split(/\s+/)[0]?.slice(0, 24);
      if (!w) return;
      run(() => submitStoryWord(code, round.id, me.id, st.count, w));
      sfx.tap();
      setWord('');
    };
    return (
      <div className="stack">
        <StoryText round={round} />
        <div className="small muted center">Wort {Math.min(st.count + 1, st.total)}/{st.total}</div>
        {myTurn ? (
          <form className="row" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="input" autoFocus autoComplete="off" placeholder="Ein einziges Wort" value={word} onChange={(e) => setWord(e.target.value.replace(/\s/g, ''))} />
            <button className="btn primary" disabled={!word.trim()}>➕</button>
          </form>
        ) : <Waiting text={st.done ? 'Fertig! Gleich wird vorgelesen…' : `✍️ ${byId[st.turn]?.name} ist dran…`} />}
      </div>
    );
  },
  Stage({ round, byId, big }) {
    const st = storyState(round);
    return (
      <div className="stack">
        <StoryText round={round} big={big} />
        <p className="center muted" style={{ fontWeight: 700, margin: 0 }}>{st.done ? 'Fertig!' : `✍️ ${byId[st.turn]?.name} ist dran (Wort ${st.count + 1}/${st.total})`}</p>
      </div>
    );
  },
  Result({ round, isHost }) {
    const text = round.story ?? storyState(round).text;
    const spoken = useRef(false);
    useEffect(() => {
      if (isHost && !spoken.current) { spoken.current = true; speak(text); }
    }, [isHost, text]);
    return (
      <div className="stack">
        <div className="card accent"><p style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.35 }}>{text}</p></div>
        <button className="btn soft" onClick={() => speak(text)}>🔊 Vorlesen</button>
      </div>
    );
  },
};

export const GROUP_GAMES = { whoMost: WhoMost, syncTest: SyncTest, hivemind: Hivemind, confession: Confession, chainStory: ChainStory };
