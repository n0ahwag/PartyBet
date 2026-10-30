import { useEffect, useRef, useState } from 'react';
import { Waiting } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

const SABOTAGE_PENALTY_MS = 150;
const ROUND_TIMEOUT_MS = 1500;
const IDLE = '#cfc8bc';

/**
 * Spiel 2 – Split-Screen Speed-Tap auf EINEM Gerät (dem von Spieler A).
 * Obere Hälfte ist gedreht für das Gegenüber.
 */
function SharedDevice({ duel, byId, submit }) {
  const [phase, setPhase] = useState('ready'); // ready | running | done
  const [roundIdx, setRoundIdx] = useState(0);
  const [color, setColor] = useState(IDLE);
  const [log, setLog] = useState([]);
  const r = useRef({ changedAt: 0, taps: {}, timer: null, settled: false });

  const rounds = duel.game.rounds;
  const sabotaged = duel.sabotage?.target;

  const finishRound = () => {
    const st = r.current;
    if (st.settled) return;
    st.settled = true;
    clearTimeout(st.timer);
    const adj = (side) => {
      const t = st.taps[side];
      if (t == null) return Infinity;
      const pid = side === 'A' ? duel.playerA : duel.playerB;
      return t + (pid === sabotaged ? SABOTAGE_PENALTY_MS : 0);
    };
    let winner;
    let foul = null;
    if (st.taps.foulA) { winner = 'B'; foul = 'A'; } else if (st.taps.foulB) { winner = 'A'; foul = 'B'; } else {
      winner = adj('A') <= adj('B') ? 'A' : 'B';
      if (adj('A') === Infinity && adj('B') === Infinity) winner = Math.random() < 0.5 ? 'A' : 'B';
    }
    const entry = {
      winner, foul,
      msA: Number.isFinite(st.taps.A) ? Math.round(st.taps.A) : null,
      msB: Number.isFinite(st.taps.B) ? Math.round(st.taps.B) : null,
    };
    setLog((l) => [...l, entry]);
    setColor(IDLE);
    sfx.tap();
    setTimeout(() => setRoundIdx((i) => i + 1), 900);
  };

  useEffect(() => {
    if (phase !== 'running') return undefined;
    if (roundIdx >= rounds.length) {
      setPhase('done');
      return undefined;
    }
    const st = r.current;
    st.taps = {};
    st.settled = false;
    st.changedAt = 0;
    const t = setTimeout(() => {
      if (st.settled) return;
      st.changedAt = performance.now();
      setColor(rounds[roundIdx].color);
      vibrate(30);
      st.timer = setTimeout(finishRound, ROUND_TIMEOUT_MS);
    }, rounds[roundIdx].delay);
    return () => { clearTimeout(t); clearTimeout(st.timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx]);

  useEffect(() => {
    if (phase === 'done') submit('shared', { rounds: log });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const tap = (side) => (e) => {
    e.preventDefault();
    const st = r.current;
    if (phase !== 'running' || st.settled || st.taps[side] != null) return;
    if (!st.changedAt) {
      st.taps[`foul${side}`] = true;
      sfx.fail();
      finishRound();
      return;
    }
    st.taps[side] = performance.now() - st.changedAt;
    if (st.taps.A != null && st.taps.B != null) finishRound();
  };

  const score = (side) => log.filter((l) => l.winner === side).length;
  const half = (side, cls) => {
    const p = byId[side === 'A' ? duel.playerA : duel.playerB];
    return (
      <div className={`half ${cls}`}>
        <div className="label">{p?.avatar} {p?.name} · {score(side)} {t('Punkte')}</div>
        <button className="tapzone" style={{ background: color }} onPointerDown={tap(side)}>
          {phase === 'ready' ? t('Warte…') : color === IDLE ? '…' : 'TAP!'}
        </button>
      </div>
    );
  };

  if (phase === 'ready') {
    return (
      <div className="stack">
        <Waiting text={t('Leg das Handy flach zwischen {a} und {b}. Tippe erst, wenn der Button die Farbe wechselt!', { a: byId[duel.playerA]?.name, b: byId[duel.playerB]?.name })} />
        <button className="btn primary lg" onClick={() => setPhase('running')}>{t('Start')}</button>
      </div>
    );
  }
  if (phase === 'done') return <Review duel={{ ...duel, results: { shared: { rounds: log } } }} byId={byId} />;
  return (
    <div className="split">
      {half('B', 'top')}
      <div className="divider" />
      {half('A', 'bottom')}
      <div style={{ position: 'fixed', top: '50%', left: 12, transform: 'translateY(-50%)', fontWeight: 900, zIndex: 41 }}>
        {Math.min(roundIdx + 1, rounds.length)}/{rounds.length}
      </div>
    </div>
  );
}

/** Review-Ansicht: Reaktionszeiten aller 5 Runden. */
function Review({ duel, byId }) {
  const rounds = duel.results?.shared?.rounds;
  if (!rounds) return <Waiting text={t('Gespielt wird auf dem Handy von {name} …', { name: byId[duel.playerA]?.name })} />;
  const name = (s) => byId[s === 'A' ? duel.playerA : duel.playerB]?.name;
  const fmt = (ms) => (ms == null ? '–' : `${ms} ms`);
  return (
    <div className="card stack">
      <h3>Review</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontWeight: 700 }}>
        <thead>
          <tr className="small muted"><th align="left">#</th><th>{name('A')}</th><th>{name('B')}</th><th align="right">{t('Punkt')}</th></tr>
        </thead>
        <tbody>
          {rounds.map((rd, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '8px 0' }}>{i + 1}</td>
              <td align="center">{rd.foul === 'A' ? `❌ ${t('zu früh')}` : fmt(rd.msA)}</td>
              <td align="center">{rd.foul === 'B' ? `❌ ${t('zu früh')}` : fmt(rd.msB)}</td>
              <td align="right">{name(rd.winner)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {duel.sabotage && <p className="small muted" style={{ margin: 0 }}>🧪 {t('{name} hatte +{n} ms Strafe pro Runde.', { name: byId[duel.sabotage.target]?.name, n: SABOTAGE_PENALTY_MS })}</p>}
    </div>
  );
}

export const SpeedTap = {
  Play: ({ duel, me, byId, submit }) => (me.id === duel.playerA
    ? <SharedDevice duel={duel} byId={byId} submit={submit} />
    : <Waiting text={t('Ab zum Handy von {name} – ihr spielt auf einem Gerät!', { name: byId[duel.playerA]?.name })} />),
  Stage: Review,
  Review,
};

/**
 * Gruppen-Variante (Spielfeld-Modus): jeder auf seinem eigenen Handy.
 * 5 Farbwechsel, gemessen wird die durchschnittliche Reaktionszeit.
 */
function SoloReaction({ duel, submit }) {
  const rounds = duel.game.rounds;
  const [phase, setPhase] = useState('ready');
  const [idx, setIdx] = useState(0);
  const [color, setColor] = useState(IDLE);
  const [times, setTimes] = useState([]);
  const st = useRef({ changedAt: 0, done: false, fouls: 0, times: [] });

  useEffect(() => {
    if (phase !== 'running') return undefined;
    if (idx >= rounds.length) {
      const valid = st.current.times;
      const avgMs = Math.round(valid.reduce((s, t) => s + t, 0) / Math.max(1, valid.length));
      submit({ avgMs, fouls: st.current.fouls, times: valid });
      setPhase('done');
      return undefined;
    }
    const s = st.current;
    s.changedAt = 0;
    s.done = false;
    const t = setTimeout(() => {
      s.changedAt = performance.now();
      setColor(rounds[idx].color);
      vibrate(30);
    }, rounds[idx].delay);
    // Wer gar nicht tippt, bekommt 1,5 s
    const timeout = setTimeout(() => record(ROUND_TIMEOUT_MS), rounds[idx].delay + ROUND_TIMEOUT_MS);
    return () => { clearTimeout(t); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  function record(ms) {
    const s = st.current;
    if (s.done) return;
    s.done = true;
    s.times = [...s.times, Math.round(ms)];
    setTimes(s.times);
    setColor(IDLE);
    setTimeout(() => setIdx((i) => i + 1), 600);
  }

  const tap = (e) => {
    e.preventDefault();
    const s = st.current;
    if (phase !== 'running' || s.done) return;
    if (!s.changedAt) {
      s.fouls += 1;
      sfx.fail();
      vibrate(150);
      return;
    }
    sfx.tap();
    record(performance.now() - s.changedAt);
  };

  if (phase === 'ready') {
    return (
      <div className="stack">
        <Waiting text={t('Tippe auf den Kreis, sobald er die Farbe wechselt – 5 Mal. Zu früh tippen kostet 300 ms Strafe!')} />
        <button className="btn primary lg" onClick={() => setPhase('running')}>{t('Start')}</button>
      </div>
    );
  }
  if (phase === 'done') {
    const avg = Math.round(times.reduce((s, t) => s + t, 0) / Math.max(1, times.length));
    return <Waiting text={`Ø ${avg} ms${st.current.fouls ? ` · ${st.current.fouls}× ${t('zu früh')}` : ''} – ${t('warte auf die anderen…')}`} />;
  }
  return (
    <div className="stack center">
      <div className="kicker">{Math.min(idx + 1, rounds.length)}/{rounds.length}</div>
      <button onPointerDown={tap}
        style={{ width: 'min(75vw, 300px)', aspectRatio: '1', borderRadius: '50%', border: 'none', margin: '0 auto', background: color, color: '#fff', fontSize: 28, fontWeight: 900 }}>
        {color === IDLE ? t('Warte…') : 'TAP!'}
      </button>
      <div className="small muted">{times.map((t) => `${t} ms`).join(' · ')}</div>
    </div>
  );
}

SpeedTap.GroupPlay = SoloReaction;
