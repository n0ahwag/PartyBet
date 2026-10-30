import { useRef, useState } from 'react';
import { EMOJI_PUZZLES, emojiAnswerCorrect } from '../game/gameLibrary.js';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';

/** Spiel 8 – Emoji-Hit-Raten: Emoji-Rätsel als Erster richtig eintippen. */
function Play({ duel, submit }) {
  const puzzle = EMOJI_PUZZLES[duel.game.puzzleIdx];
  const [step, setStep] = useState('ready');
  const [val, setVal] = useState('');
  const [wrong, setWrong] = useState(0);
  const t0 = useRef(0);
  const n = useGo(step === 'count', () => { t0.current = performance.now(); setStep('run'); });

  const check = () => {
    if (emojiAnswerCorrect(puzzle, val)) {
      submit({ correct: true, ms: Math.round(performance.now() - t0.current), input: val });
      sfx.tusch();
      setStep('done');
    } else {
      sfx.fail();
      vibrate(120);
      setWrong((w) => w + 1);
    }
  };

  if (step === 'ready') {
    return (
      <div className="stack">
        <Waiting text="Gleich erscheinen Emojis. Errate den Song, Film oder Begriff und tipp ihn ein!" />
        <button className="btn primary lg" onClick={() => setStep('count')}>Bereit</button>
      </div>
    );
  }
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text="✅ Richtig! Warte auf dein Gegenüber…" />;
  return (
    <div className="stack">
      <div className="card center stack" style={{ gap: 4 }}>
        <div style={{ fontSize: 72 }}>{puzzle.emojis}</div>
        <span className="pill">{puzzle.hint}</span>
      </div>
      <input className="input" autoFocus placeholder="Deine Antwort" value={val}
        onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && check()} />
      {wrong > 0 && <p className="center small" style={{ color: 'var(--bad)', margin: 0 }}>Leider nein ({wrong}×) – weiter probieren!</p>}
      <button className="btn primary lg" disabled={!val.trim()} onClick={check}>Prüfen</button>
      <button className="btn ghost sm" onClick={() => { submit({ correct: false, ms: null, input: val }); setStep('done'); }}>Aufgeben</button>
    </div>
  );
}

function Review({ duel, byId }) {
  const puzzle = EMOJI_PUZZLES[duel.game.puzzleIdx];
  const done = [duel.playerA, duel.playerB].every((id) => duel.results?.[id]);
  return (
    <div className="card stack">
      <div className="center" style={{ fontSize: 56 }}>{puzzle.emojis}</div>
      {done && <div className="center"><span className="kicker">Lösung</span><h2>{puzzle.solution}</h2></div>}
      {[duel.playerA, duel.playerB].map((id) => {
        const r = duel.results?.[id];
        return (
          <div key={id} className="row between">
            <b>{byId[id]?.avatar} {byId[id]?.name}</b>
            <span>{!r ? 'rät…' : r.correct ? `✅ ${(r.ms / 1000).toFixed(1)}s` : '🏳️ aufgegeben'}</span>
          </div>
        );
      })}
    </div>
  );
}

export const EmojiQuiz = { Play: ({ duel, submit }) => <Play duel={duel} submit={(d) => submit(null, d)} />, Stage: Review, Review };
