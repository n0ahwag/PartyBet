import { useEffect, useRef, useState } from 'react';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

const SABOTAGED_SHOW_MS = 800;

/** Spiel 4 – Memory-Code: Code blitzt auf, danach so schnell wie möglich eintippen. */
function Play({ duel, me, submit }) {
  const [step, setStep] = useState('ready'); // ready | count | show | input | done
  const [input, setInput] = useState('');
  const t0 = useRef(0);
  const code = duel.game.code;
  const showMs = duel.sabotage?.target === me.id ? SABOTAGED_SHOW_MS : duel.game.showMs;

  const n = useGo(step === 'count', () => setStep('show'));

  useEffect(() => {
    if (step !== 'show') return undefined;
    const t = setTimeout(() => { t0.current = performance.now(); setStep('input'); }, showMs);
    return () => clearTimeout(t);
  }, [step, showMs]);

  const press = (d) => {
    sfx.tap();
    const next = (input + d).slice(0, code.length);
    setInput(next);
    if (next.length === code.length) {
      const ms = Math.round(performance.now() - t0.current);
      submit({ input: next, ms });
      if (next === code) sfx.tusch(); else { sfx.fail(); vibrate(200); }
      setStep('done');
    }
  };

  if (step === 'ready') {
    return (
      <div className="stack">
        <Waiting text={t('Merk dir den {n}-stelligen Code. Er ist nur ganz kurz sichtbar!', { n: code.length })} />
        <button className="btn primary lg" onClick={() => setStep('count')}>{t('Bereit')}</button>
      </div>
    );
  }
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'show') return <div className="card"><div className="code-display pop">{code}</div></div>;
  if (step === 'done') return <Waiting text={input === code ? `✅ ${t('Richtig! Warte auf dein Gegenüber…')}` : `❌ ${t('Falsch (richtig: {code})', { code })}`} />;

  return (
    <div className="stack">
      <div className="card"><div className="code-display">{input.padEnd(code.length, '·')}</div></div>
      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <button key={d} onClick={() => press(String(d))}>{d}</button>)}
        <button onClick={() => setInput((i) => i.slice(0, -1))}>⌫</button>
        <button onClick={() => press('0')}>0</button>
        <span />
      </div>
    </div>
  );
}

function Review({ duel, byId }) {
  const done = [duel.playerA, duel.playerB].every((id) => duel.results?.[id]);
  return (
    <div className="card stack">
      <h3>Code {done ? <span style={{ letterSpacing: '0.2em' }}>{duel.game.code}</span> : '••••'}</h3>
      {[duel.playerA, duel.playerB].map((id) => {
        const res = duel.results?.[id];
        return (
          <div key={id} className="row between">
            <b>{byId[id]?.avatar} {byId[id]?.name}</b>
            <span>
              {!res ? t('tippt…') : done
                ? <>{res.input === duel.game.code ? '✅' : '❌'} {res.input} · {(res.ms / 1000).toFixed(2)}s</>
                : `${t('fertig')} ✓`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const MemoryCode = {
  Play: ({ duel, me, submit }) => <Play duel={duel} me={me} submit={(d) => submit(null, d)} />,
  Stage: Review,
  Review,
};
