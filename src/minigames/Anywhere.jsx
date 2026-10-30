import { useEffect, useRef, useState } from 'react';
import {
  GAMES, categoryWordValid, associationValid, secretTargetOf, resultComplete, buildBracket,
} from '../game/gameLibrary.js';
import { FORMAT_RESULT, revealOf, num } from './format.js';
import { t } from '../i18n/index.js';
import { useGo, CountdownView, Waiting, Rules } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';

/*
 * "Überall spielbar": Spiele ohne Utensilien und ohne Sensoren.
 * Jede Komponente funktioniert im Duell (playerA/playerB) und in der Gruppe (participants).
 */

const idsOf = (duel) => duel.participants ?? [duel.playerA, duel.playerB];

/** Ergebnisliste für Duell & Gruppe – Werte erst sichtbar, wenn alle fertig sind. */
export function ResultList({ duel, byId }) {
  const ids = idsOf(duel);
  const fmt = FORMAT_RESULT[duel.gameId];
  const allDone = ids.every((id) => resultComplete(duel.gameId, duel.results?.[id]));
  const reveal = allDone ? revealOf(duel) : null;
  return (
    <div className="card stack">
      {reveal && <div className="center"><b>{reveal}</b></div>}
      {ids.map((id) => {
        const r = duel.results?.[id];
        const done = resultComplete(duel.gameId, r);
        return (
          <div key={id} className="row between">
            <b>{byId[id]?.avatar} {byId[id]?.name}</b>
            <span>{!done ? t('spielt…') : allDone ? fmt(r, duel, id) : `✓ ${t('fertig')}`}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Eingabe mit Zeitlimit: Countdown, dann Aufgabe + Textfeld; meldet { word, ms, valid }. */
function TimedWordInput({ limitMs, prompt, validate, placeholder, submit, intro }) {
  const [step, setStep] = useState('ready');
  const [val, setVal] = useState('');
  const [left, setLeft] = useState(limitMs);
  const t0 = useRef(0);
  const done = useRef(false);
  const n = useGo(step === 'count', () => { t0.current = performance.now(); setStep('run'); });

  const finish = (word) => {
    if (done.current) return;
    done.current = true;
    const ms = Math.round(performance.now() - t0.current);
    const valid = !!word && validate(word);
    submit({ word: word || '', ms, valid });
    if (valid) sfx.tusch(); else sfx.fail();
    setStep('done');
  };

  useEffect(() => {
    if (step !== 'run') return undefined;
    const t = setInterval(() => {
      const l = Math.max(0, limitMs - (performance.now() - t0.current));
      setLeft(l);
      if (l <= 0) finish('');
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === 'ready') return <div className="stack"><Waiting text={intro} /><button className="btn primary lg" onClick={() => setStep('count')}>{t('Bereit')}</button></div>;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={validate(val) ? `✅ „${val}“ – ${t('warte auf die anderen…')}` : `⏱ ${t('Kein gültiges Wort – warte auf die anderen…')}`} />;
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (val.trim()) finish(val.trim()); }}>
      <div className="card center stack pop" style={{ gap: 4 }}>{prompt}</div>
      <div className="bar"><div style={{ width: `${(left / limitMs) * 100}%` }} /></div>
      <input className="input" autoFocus autoComplete="off" autoCapitalize="off" placeholder={placeholder} value={val} onChange={(e) => setVal(e.target.value)} />
      <button className="btn primary lg" disabled={!val.trim()}>{t('Abschicken')}</button>
    </form>
  );
}

// ------------------------------------------------------------------ 1 Mentale Stoppuhr
function Stopwatch({ duel, submit }) {
  const target = duel.game.targetMs;
  const [step, setStep] = useState('ready');
  const [ms, setMs] = useState(null);
  const t0 = useRef(0);
  const label = `${num(target / 1000)} s`;
  if (step === 'ready') {
    return (
      <div className="stack center">
        <div className="kicker">{t('Zielzeit')}</div>
        <div className="big-number">{label}</div>
        <p className="muted" style={{ margin: 0 }}>{t('Es läuft keine Anzeige mit – zähl im Kopf!')}</p>
        <button className="btn primary lg block" onClick={() => { t0.current = performance.now(); sfx.tick(); setStep('run'); }}>▶️ {t('Start')}</button>
      </div>
    );
  }
  if (step === 'run') {
    return (
      <div className="stack center">
        <div className="kicker">{t('Ziel')}: {label}</div>
        <button className="btn danger lg block" style={{ minHeight: 220, fontSize: 36 }}
          onPointerDown={() => {
            const v = Math.round(performance.now() - t0.current);
            setMs(v);
            submit({ ms: v, target });
            sfx.gong();
            vibrate(150);
            setStep('done');
          }}>⏹ {t('STOPP')}</button>
      </div>
    );
  }
  const diff = ms - target;
  return <Waiting text={t('{a} s – {b} s daneben', { a: num(ms / 1000), b: `${diff >= 0 ? '+' : '−'}${num(Math.abs(diff) / 1000)}` })} />;
}

// ------------------------------------------------------------------ 2 Blitz-Kopfrechnen
function MathBlitz({ duel, submit }) {
  const { text, answer } = duel.game;
  const [step, setStep] = useState('ready');
  const [val, setVal] = useState('');
  const [wrong, setWrong] = useState(0);
  const t0 = useRef(0);
  const n = useGo(step === 'count', () => { t0.current = performance.now(); setStep('run'); });
  const press = (d) => { sfx.tap(); setVal((v) => (v + d).slice(0, 5)); };
  const check = () => {
    if (Number(val) === answer) {
      submit({ correct: true, ms: Math.round(performance.now() - t0.current), wrong });
      sfx.tusch();
      setStep('done');
    } else {
      sfx.fail();
      vibrate(120);
      setWrong((w) => w + 1);
      setVal('');
    }
  };
  if (step === 'ready') return <div className="stack"><Waiting text={t('Gleich erscheint eine Rechenaufgabe. Tipp das Ergebnis so schnell wie möglich ein!')} /><button className="btn primary lg" onClick={() => setStep('count')}>{t('Bereit')}</button></div>;
  if (step === 'count') return <CountdownView n={n} />;
  if (step === 'done') return <Waiting text={`✅ ${t('Richtig! Warte auf die anderen…')}`} />;
  return (
    <div className="stack">
      <div className="card center"><div className="big-number">{text} = ?</div></div>
      <div className="card"><div className="code-display">{val || '…'}</div></div>
      {wrong > 0 && <p className="center small" style={{ color: 'var(--bad)', margin: 0 }}>{t('Falsch ({n}× = +{n}s)', { n: wrong })}</p>}
      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <button key={d} onClick={() => press(String(d))}>{d}</button>)}
        <button onClick={() => setVal((v) => v.slice(0, -1))}>⌫</button>
        <button onClick={() => press('0')}>0</button>
        <button style={{ background: 'var(--accent)', color: '#fff' }} disabled={!val} onClick={check}>✓</button>
      </div>
      <button className="btn ghost sm" onClick={() => { submit({ correct: false, ms: null, wrong }); setStep('done'); }}>{t('Aufgeben')}</button>
    </div>
  );
}

// ------------------------------------------------------------------ 4 Formel-1-Frühstart
function F1Start({ duel, submit }) {
  const [lights, setLights] = useState(0);
  const [out, setOut] = useState(false);
  const [done, setDone] = useState(null);
  const st = useRef({ outAt: 0, finished: false });

  useEffect(() => {
    // Startet automatisch kurz nach dem Erscheinen – auf allen Geräten nahezu gleichzeitig
    const timers = [];
    for (let i = 1; i <= 5; i++) timers.push(setTimeout(() => { setLights(i); sfx.tick(); }, 1200 + i * 1000));
    timers.push(setTimeout(() => {
      if (st.current.finished) return;
      st.current.outAt = performance.now();
      setOut(true);
      sfx.go();
    }, 1200 + 5 * 1000 + duel.game.holdMs));
    timers.push(setTimeout(() => finish({ ms: null, jumpStart: false }), 1200 + 5 * 1000 + duel.game.holdMs + 3000));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(res) {
    if (st.current.finished) return;
    st.current.finished = true;
    submit(res);
    setDone(res);
    if (res.jumpStart) { sfx.fail(); vibrate(400); }
  }

  const tap = (e) => {
    e.preventDefault();
    if (st.current.finished) return;
    if (!st.current.outAt) {
      if (lights > 0) finish({ ms: null, jumpStart: true });
      return;
    }
    finish({ ms: Math.round(performance.now() - st.current.outAt), jumpStart: false });
  };

  if (done) {
    return <Waiting text={done.jumpStart ? `🚫 ${t('Frühstart – disqualifiziert!')}` : done.ms == null ? t('Zu spät…') : `⚡ ${done.ms} ms – ${t('warte auf die anderen…')}`} />;
  }
  return (
    <div onPointerDown={tap} style={{ position: 'fixed', inset: 0, zIndex: 45, background: '#050505', display: 'grid', placeItems: 'center', touchAction: 'manipulation', userSelect: 'none' }}>
      <div className="stack center" style={{ gap: 30 }}>
        <div className="row" style={{ gap: 14 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ width: 46, height: 46, borderRadius: '50%', background: !out && lights >= i ? '#EF4444' : '#262626', boxShadow: !out && lights >= i ? '0 0 30px #EF4444' : 'none' }} />
          ))}
        </div>
        <div style={{ color: out ? '#22C55E' : '#737373', fontWeight: 900, fontSize: out ? 64 : 22 }}>
          {out ? t('TIPPEN!') : lights === 0 ? t("Gleich geht's los – Finger bereit…") : t('Warten…')}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 5 Geheime Zahlen knacken
function SecretNumber({ duel, me, byId, submit }) {
  const bot = duel.game.botSecret; // Übungsmodus: der Computer denkt sich die Zahl aus
  const targetId = bot ? null : secretTargetOf(duel, me.id);
  const own = duel.results?.[me.id];
  const targetSecret = bot ?? duel.results?.[targetId]?.secret;
  const [secret, setSecret] = useState('');
  const [guess, setGuess] = useState('');
  const [hints, setHints] = useState([]);
  const t0 = useRef(0);

  useEffect(() => {
    if (targetSecret != null && (bot || own?.secret != null) && !t0.current) t0.current = performance.now();
  }, [targetSecret, own?.secret, bot]);

  if (!bot && own?.secret == null) {
    return (
      <div className="stack">
        <div className="card tinted"><b>{t('Deine Geheimzahl')}</b> – {t('nicht zeigen! 🙈')}</div>
        <input className="input code" inputMode="numeric" maxLength={2} placeholder="10–99" value={secret} onChange={(e) => setSecret(e.target.value.replace(/\D/g, ''))} />
        <button className="btn primary lg" disabled={!(Number(secret) >= 10 && Number(secret) <= 99)} onClick={() => submit({ secret: Number(secret) })}>{t('Geheim speichern')}</button>
      </div>
    );
  }
  if (targetSecret == null) return <Waiting text={t('Warte, bis {name} eine Geheimzahl gewählt hat…', { name: byId[targetId]?.name })} />;

  const tryGuess = () => {
    const g = Number(guess);
    if (!(g >= 10 && g <= 99)) return;
    const n = hints.length + 1;
    if (g === targetSecret) {
      submit({ secret: own?.secret ?? null, done: true, guesses: n, ms: Math.round(performance.now() - t0.current) });
      sfx.tusch();
      return;
    }
    sfx.tap();
    setHints((h) => [{ g, dir: g < targetSecret ? `${t('höher')} ⬆️` : `${t('tiefer')} ⬇️` }, ...h]);
    setGuess('');
  };
  return (
    <div className="stack">
      <div className="card center"><b>{bot ? t('Knacke die Zahl des Computers 🤖') : t('Knacke die Zahl von {name}', { name: `${byId[targetId]?.avatar} ${byId[targetId]?.name}` })}</b><div className="small muted">{t('zwischen 10 und 99')}</div></div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); tryGuess(); }}>
        <input className="input code" inputMode="numeric" autoFocus maxLength={2} value={guess} onChange={(e) => setGuess(e.target.value.replace(/\D/g, ''))} />
        <button className="btn primary" style={{ minWidth: 90 }} disabled={guess.length !== 2}>{t('Raten')}</button>
      </form>
      {hints.map((h, i) => <div key={i} className="row between card flat" style={{ padding: 10 }}><b>{h.g}</b><span>{h.dir}</span></div>)}
      <button className="btn ghost sm" onClick={() => submit({ secret: own?.secret ?? null, done: true, gaveUp: true, guesses: hints.length, ms: null })}>{t('Aufgeben')}</button>
    </div>
  );
}

// ------------------------------------------------------------------ 8 Zahlen-Merker
function NumberMemory({ duel, submit }) {
  const { digits, startLength } = duel.game;
  const [len, setLen] = useState(startLength);
  const [step, setStep] = useState('ready'); // ready | show | input | done
  const [val, setVal] = useState('');
  const t0 = useRef(0);
  const best = useRef(0);

  useEffect(() => {
    if (step !== 'show') return undefined;
    const t = setTimeout(() => setStep('input'), 500 + len * 300);
    return () => clearTimeout(t);
  }, [step, len]);

  const finish = (correctDigits) => {
    submit({ digits: correctDigits, ms: Math.round(performance.now() - t0.current) });
    setStep('done');
  };
  const press = (d) => {
    sfx.tap();
    const next = val + d;
    setVal(next);
    if (next.length < len) return;
    if (next === digits.slice(0, len)) {
      best.current = len;
      sfx.coins();
      if (len >= digits.length) return finish(len);
      setLen((l) => l + 1);
      setVal('');
      setStep('show');
    } else {
      sfx.fail();
      vibrate(200);
      finish(best.current);
    }
    return undefined;
  };

  if (step === 'ready') return <div className="stack"><Waiting text={t('Merk dir die Zahlenfolge – sie startet mit {n} Ziffern und wird jede Runde länger.', { n: startLength })} /><button className="btn primary lg" onClick={() => { t0.current = performance.now(); setStep('show'); }}>{t('Bereit')}</button></div>;
  if (step === 'done') return <Waiting text={t('{n} Ziffern geschafft! Warte auf die anderen…', { n: best.current })} />;
  if (step === 'show') return <div className="stack center"><div className="kicker">{t('{n} Ziffern', { n: len })}</div><div className="card"><div className="code-display pop" key={len}>{digits.slice(0, len)}</div></div></div>;
  return (
    <div className="stack">
      <div className="kicker center">{t('{n} Ziffern', { n: len })}</div>
      <div className="card"><div className="code-display" style={{ fontSize: len > 9 ? 30 : undefined }}>{val.padEnd(len, '·')}</div></div>
      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <button key={d} onClick={() => press(String(d))}>{d}</button>)}
        <button onClick={() => setVal((v) => v.slice(0, -1))}>⌫</button>
        <button onClick={() => press('0')}>0</button>
        <span />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Host-Spiele: Wortkette & Schere-Stein-Papier
function WordChainView({ duel, big }) {
  const game = GAMES.wordChain;
  return (
    <div className="stack center">
      {duel.game.category && (
        <div className="card tinted center" style={{ padding: '10px 18px' }}>
          <div className="kicker">{t('Kategorie')}</div>
          <b style={{ fontSize: big ? 40 : 28 }}>{t(duel.game.category)}</b>
        </div>
      )}
      <div className="kicker">{t('Startwort')}</div>
      <div className="big-number" style={{ fontSize: big ? 72 : 44 }}>{t(duel.game.startWord)}</div>
      <p className="muted" style={{ margin: 0, fontWeight: 700 }}>
        {t('Nächstes Wort beginnt mit „{letter}“ …', { letter: t(duel.game.startWord).slice(-1).toUpperCase() })}
      </p>
      <Rules game={{ ...game, rules: duel.participants ? game.groupRules : game.rules }} />
    </div>
  );
}

const RPS_ICONS = ['✊', '✌️', '✋'];
function RpsView({ duel, byId, big }) {
  if (!duel.participants) {
    return (
      <div className="stack center">
        <div style={{ fontSize: big ? 120 : 64 }}>{RPS_ICONS.join(' ')}</div>
        <Rules game={GAMES.rps} />
        <p className="muted" style={{ margin: 0, fontWeight: 700 }}>{t('Der Host bestätigt den Sieger.')}</p>
      </div>
    );
  }
  const bracket = buildBracket(duel.participants, duel.id, duel.bracketWinners || {});
  return (
    <div className="stack">
      <div className="center" style={{ fontSize: big ? 64 : 40 }}>{RPS_ICONS.join(' ')}</div>
      {bracket.rounds.map((matches, r) => (
        <div key={r} className="card stack" style={{ gap: 6 }}>
          <h3>{r === bracket.rounds.length - 1 && matches.length === 1 && !matches[0].bye ? t('Finale') : `${t('Runde')} ${r + 1}`}</h3>
          {matches.map((m) => (
            <div key={m.key} className="row between">
              {m.bye ? <span>{byId[m.a]?.avatar} {byId[m.a]?.name} <span className="pill">{t('Freilos')}</span></span> : (
                <>
                  <span style={{ fontWeight: m.winner === m.a ? 900 : 500, opacity: m.winner && m.winner !== m.a ? 0.45 : 1 }}>{byId[m.a]?.avatar} {byId[m.a]?.name}</span>
                  <span className="faint">vs</span>
                  <span style={{ fontWeight: m.winner === m.b ? 900 : 500, opacity: m.winner && m.winner !== m.b ? 0.45 : 1 }}>{byId[m.b]?.avatar} {byId[m.b]?.name}</span>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
      {bracket.champion && <div className="card accent center pop"><h2>🏆 {byId[bracket.champion]?.name}</h2></div>}
    </div>
  );
}

// ------------------------------------------------------------------ Exporte
const auto = (Play) => ({ Play, Stage: ResultList, Review: ResultList });

export const AnywhereGames = {
  stopwatch: auto(({ duel, submit }) => <Stopwatch duel={duel} submit={(d) => submit(null, d)} />),
  mathBlitz: auto(({ duel, submit }) => <MathBlitz duel={duel} submit={(d) => submit(null, d)} />),
  f1Start: auto(({ duel, submit }) => <F1Start duel={duel} submit={(d) => submit(null, d)} />),
  secretNumber: auto(({ duel, me, byId, submit }) => <SecretNumber duel={duel} me={me} byId={byId} submit={(d) => submit(null, d)} />),
  numberMemory: auto(({ duel, submit }) => <NumberMemory duel={duel} submit={(d) => submit(null, d)} />),
  association: auto(({ duel, submit }) => (
    <TimedWordInput limitMs={duel.game.limitMs} submit={(d) => submit(null, d)} placeholder={t('Erstes Wort, das dir einfällt')}
      intro={t('Gleich erscheint ein Begriff – tipp sofort das erste Wort ein, das dir dazu einfällt!')}
      validate={(w) => associationValid(w, duel.game.prompt) && associationValid(w, t(duel.game.prompt))}
      prompt={<><div className="kicker">{t('Deine erste Assoziation zu')}</div><div className="big-number">{t(duel.game.prompt)}</div></>} />
  )),
  categorySprint: auto(({ duel, submit }) => (
    <TimedWordInput limitMs={duel.game.limitMs} submit={(d) => submit(null, d)} placeholder={`${t('{category} mit „{letter}“', { category: t(duel.game.category), letter: duel.game.letter })} …`}
      intro={t('Gleich erscheinen Kategorie und Anfangsbuchstabe – tipp blitzschnell einen passenden Begriff!')}
      validate={(w) => categoryWordValid(w, duel.game.letter, t(duel.game.category))}
      prompt={<><div className="kicker">{t(duel.game.category)}</div><div className="big-number" style={{ fontSize: 88 }}>{duel.game.letter}</div></>} />
  )),
  wordChain: { Play: WordChainView, Stage: WordChainView, GroupStage: WordChainView },
  rps: { Play: RpsView, Stage: RpsView, GroupStage: RpsView },
};
