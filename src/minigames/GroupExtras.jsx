import { useEffect, useRef, useState } from 'react';
import {
  tugState, TUG_MS, parsePrice, TEAM_NAMES, TEAM_COLORS, teamsOf, teamEstimateState, SKETCH, encodeSketch, decodeSketch, sketchVotes,
} from '../game/extras.js';
import { ESTIMATE_QUESTIONS } from '../game/gameLibrary.js';
import { submitGroupResult, submitResultField } from '../game/groupEngine.js';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';
import { t, locale } from '../i18n/index.js';

/*
 * Gruppen-Spiele der Erweiterung: Team-Tauziehen, Team-Schätzen, Blind-Skizze.
 * Gleiche Schnittstelle wie in Group.jsx: Play (Handy) · Stage (Hauptbildschirm) · Result.
 */

const Name = ({ p }) => <>{p?.avatar} {p?.name}</>;

function TeamBadge({ team, big }) {
  return <span className="pill" style={{ background: TEAM_COLORS[team], color: '#fff', fontSize: big ? 20 : undefined }}>{t(TEAM_NAMES[team])}</span>;
}

function TeamLists({ teams, byId, extra, big }) {
  return (
    <div className="grid-2">
      {teams.map((ids, i) => (
        <div key={i} className="card stack" style={{ gap: 6, borderColor: TEAM_COLORS[i] }}>
          <TeamBadge team={i} big={big} />
          {ids.map((id) => <div key={id} className="row between"><span><Name p={byId[id]} /></span>{extra?.(id)}</div>)}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Team-Tauziehen
function Rope({ round, big }) {
  const { avg, pos } = tugState(round);
  const x = 50 + pos * 42; // Knoten wandert zum stärkeren Team (Blau links, Orange rechts)
  return (
    <div className="stack" style={{ gap: 6, width: '100%' }}>
      <div className="tug-rope" style={{ height: big ? 96 : 70 }}>
        <div className="tug-half" style={{ width: '50%', background: TEAM_COLORS[0], opacity: 0.25 }} />
        <div className="tug-half" style={{ width: '50%', background: TEAM_COLORS[1], opacity: 0.25 }} />
        <div className="tug-line" />
        <div className="tug-mid" />
        <div className="tug-knot" style={{ left: `${x}%` }} />
      </div>
      <div className="row between" style={{ fontWeight: 900, fontSize: big ? 24 : 16 }}>
        <span style={{ color: TEAM_COLORS[0] }}>⬅️ Ø {avg[0]}</span>
        <span style={{ color: TEAM_COLORS[1] }}>Ø {avg[1]} ➡️</span>
      </div>
    </div>
  );
}

const TugOfWar = {
  Play({ code, round, me, run }) {
    const { teams } = tugState(round);
    const myTeam = teams[0].includes(me.id) ? 0 : 1;
    const [phase, setPhase] = useState('count'); // count | run | done
    const [taps, setTaps] = useState(0);
    const [left, setLeft] = useState(TUG_MS);
    const tapsRef = useRef(0);
    const n = useGo(phase === 'count', () => setPhase('run'));

    useEffect(() => {
      if (phase !== 'run') return undefined;
      const t0 = performance.now();
      let sent = -1;
      const iv = setInterval(() => {
        const el = performance.now() - t0;
        setLeft(Math.max(0, TUG_MS - el));
        if (el >= TUG_MS) {
          clearInterval(iv);
          setPhase('done');
          sfx.gong();
          run(() => submitGroupResult(code, round.id, me.id, { taps: tapsRef.current, done: true }));
          return;
        }
        if (tapsRef.current !== sent) {
          sent = tapsRef.current;
          submitGroupResult(code, round.id, me.id, { taps: sent, done: false }).catch(() => {});
        }
      }, 400);
      return () => clearInterval(iv);
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    const tap = () => { if (phase !== 'run') return; tapsRef.current += 1; setTaps(tapsRef.current); vibrate(8); };
    return (
      <div className="stack center">
        <div>{t('Du ziehst für')} <TeamBadge team={myTeam} /></div>
        <Rope round={round} />
        {phase === 'count' && <CountdownView n={n} />}
        {phase === 'run' && (
          <button className="btn lg block" style={{ minHeight: 230, fontSize: 34, background: TEAM_COLORS[myTeam], color: '#fff', touchAction: 'manipulation' }}
            onPointerDown={tap}>💪 {taps}<br /><span style={{ fontSize: 18 }}>⏱ {Math.ceil(left / 1000)} s</span></button>
        )}
        {phase === 'done' && <Waiting text={t('{n} Taps! Warte auf die anderen…', { n: taps })} />}
      </div>
    );
  },
  Stage({ round, byId, big }) {
    const { teams } = tugState(round);
    return (
      <div className="stack">
        <Rope round={round} big={big} />
        <TeamLists teams={teams} byId={byId} big={big} extra={(id) => <b>{round.results?.[id]?.taps ?? 0}{round.results?.[id]?.done ? ' ✓' : ''}</b>} />
      </div>
    );
  },
  Result({ round, byId }) {
    const { teams } = tugState(round);
    const w = round.winnerTeam;
    return (
      <div className="stack">
        <div className="card accent center pop">
          <div style={{ fontSize: 48 }}>🪢</div>
          <h2>{w == null ? t('Unentschieden!') : t('{team} gewinnt!', { team: t(TEAM_NAMES[w]) })}</h2>
        </div>
        <Rope round={round} />
        <TeamLists teams={teams} byId={byId} extra={(id) => <b>{round.results?.[id]?.taps ?? 0}</b>} />
      </div>
    );
  },
};

// ------------------------------------------------------------------ Team-Schätzen
const questionOf = (round) => ESTIMATE_QUESTIONS[round.game.qIdx];
const fmt = (n) => (n == null ? '–' : n.toLocaleString(locale()));

function EstimateQuestion({ round, big }) {
  return <div className="card tinted center"><h2 style={{ fontSize: big ? 40 : 22, lineHeight: 1.2 }}>{t(questionOf(round).q)}</h2></div>;
}

const TeamEstimate = {
  Play({ code, round, me, byId, run }) {
    const teams = teamsOf(round.participants, round.game.seed);
    const myTeam = teams[0].includes(me.id) ? 0 : 1;
    const [val, setVal] = useState('');
    const mine = round.results?.[me.id]?.guess;
    const q = questionOf(round);
    return (
      <div className="stack">
        <div className="center">{t('Du schätzt für')} <TeamBadge team={myTeam} /></div>
        <EstimateQuestion round={round} />
        <p className="small muted center" style={{ margin: 0 }}>
          {t('Dein Team')}: {teams[myTeam].map((id) => byId[id]?.name).join(', ')} – {t('flüstert euch ruhig ab!')}
        </p>
        {mine != null ? <Waiting text={t('Abgegeben: {n} – warte auf die anderen…', { n: fmt(mine) })} /> : (
          <>
            <input className="input" inputMode="decimal" placeholder={`${t('Deine Schätzung')}${q.unit ? ` (${t(q.unit)})` : ''}`}
              value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9.,]/g, ''))} />
            <button className="btn primary lg" disabled={!Number.isFinite(parsePrice(val))} onClick={() => run(async () => {
              await submitGroupResult(code, round.id, me.id, { guess: parsePrice(val) });
              sfx.betJingle();
            })}>{t('Geheim abgeben')}</button>
          </>
        )}
      </div>
    );
  },
  Stage({ round, byId, big }) {
    const teams = teamsOf(round.participants, round.game.seed);
    return (
      <div className="stack">
        <EstimateQuestion round={round} big={big} />
        <TeamLists teams={teams} byId={byId} big={big} extra={(id) => (round.results?.[id]?.guess != null ? '🔒' : '…')} />
      </div>
    );
  },
  Result({ round, byId }) {
    const q = questionOf(round);
    const { teams, means } = teamEstimateState(round, q.a);
    const w = round.winnerTeam;
    return (
      <div className="stack">
        <EstimateQuestion round={round} />
        <div className="card center"><span className="kicker">{t('Richtige Antwort')}</span><div className="big-number">{fmt(q.a)} <span style={{ fontSize: 22 }}>{t(q.unit)}</span></div></div>
        <div className="card accent center pop"><h2>{w == null ? t('Unentschieden!') : t('{team} gewinnt!', { team: t(TEAM_NAMES[w]) })}</h2></div>
        <div className="grid-2">
          {teams.map((ids, i) => (
            <div key={i} className="card center stack" style={{ gap: 4, borderColor: TEAM_COLORS[i] }}>
              <TeamBadge team={i} />
              <div>{t('Team-Schnitt')}</div>
              <b style={{ fontSize: 24 }}>{fmt(means[i])}</b>
              {ids.map((id) => <div key={id} className="small"><Name p={byId[id]} />: {fmt(round.results?.[id]?.guess)}</div>)}
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// ------------------------------------------------------------------ Blind-Skizze
export function SketchView({ data, size = 140 }) {
  const strokes = decodeSketch(data);
  return (
    <svg viewBox="0 0 1000 1000" style={{ width: size, height: size, display: 'block' }}>
      {strokes.map((s, i) => (s.length === 1
        ? <circle key={i} cx={s[0][0]} cy={s[0][1]} r="12" fill="#2D3047" />
        : <polyline key={i} points={s.map((p) => p.join(',')).join(' ')} fill="none" stroke="#2D3047" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />))}
    </svg>
  );
}

function Prompt({ round, big }) {
  return <div className="card tinted center"><div className="kicker">{t('Zeichne')}</div><h2 style={{ fontSize: big ? 46 : 28 }}>{t(round.game.prompt)}</h2></div>;
}

function BlindPad({ onDone }) {
  const [phase, setPhase] = useState('count');
  const [left, setLeft] = useState(SKETCH.drawMs);
  const [dot, setDot] = useState(null);
  const [count, setCount] = useState(0);
  const strokes = useRef([]);
  const drawing = useRef(false);
  const doneRef = useRef(false);
  const ref = useRef(null);
  const n = useGo(phase === 'count', () => setPhase('draw'));
  const size = Math.min(340, (typeof window !== 'undefined' ? window.innerWidth : 360) - 40);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(encodeSketch(strokes.current));
  };
  useEffect(() => {
    if (phase !== 'draw') return undefined;
    const t0 = performance.now();
    const iv = setInterval(() => {
      const l = SKETCH.drawMs - (performance.now() - t0);
      setLeft(Math.max(0, l));
      if (l <= 0) { clearInterval(iv); sfx.gong(); finish(); }
    }, 200);
    return () => clearInterval(iv);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000)];
  };
  if (phase === 'count') return <CountdownView n={n} />;
  return (
    <div className="stack center">
      <div className="row between" style={{ width: size, fontWeight: 800 }}>
        <span>🙈 {t('{n} Striche (unsichtbar)', { n: count })}</span><span>⏱ {Math.ceil(left / 1000)} s</span>
      </div>
      <svg ref={ref} viewBox="0 0 1000 1000" className="sketch-pad" style={{ width: size, height: size }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); drawing.current = true; const p = pos(e); strokes.current.push([p]); setDot(p); setCount(strokes.current.length); }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = pos(e);
          const s = strokes.current[strokes.current.length - 1];
          const l = s[s.length - 1];
          if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 12) s.push(p);
          setDot(p);
        }}
        onPointerUp={() => { drawing.current = false; setDot(null); }} onPointerCancel={() => { drawing.current = false; setDot(null); }}>
        {dot && <circle cx={dot[0]} cy={dot[1]} r="14" fill="#A855F7" opacity="0.6" />}
      </svg>
      <button className="btn primary block" onClick={finish}>✅ {t('Fertig')}</button>
    </div>
  );
}

const BlindSketch = {
  Play({ code, round, me, byId, run }) {
    const mine = round.results?.[me.id];
    if (round.step === 'draw') {
      if (mine?.sketch != null) return <><Prompt round={round} /><Waiting text={`🙈 ${t('Abgegeben! Gleich wird aufgedeckt…')}`} /></>;
      return (
        <div className="stack">
          <Prompt round={round} />
          <BlindPad onDone={(data) => run(() => submitResultField(code, round.id, me.id, 'sketch', data))} />
        </div>
      );
    }
    const others = round.participants.filter((id) => id !== me.id && round.results?.[id]?.sketch != null);
    return (
      <div className="stack">
        <Prompt round={round} />
        {mine?.sketch != null && (
          <div className="center stack" style={{ gap: 4 }}>
            <span className="kicker">{t('Dein Kunstwerk')}</span>
            <div className="sketch-card"><SketchView data={mine.sketch} size={150} /></div>
          </div>
        )}
        <h3>{mine?.vote ? `✓ ${t('Abgestimmt – warte auf die anderen…')}` : t('Welches Bild ist am besten?')}</h3>
        <div className="sketch-grid">
          {others.map((id) => (
            <button key={id} type="button" className={`sketch-card ${mine?.vote === id ? 'on' : ''}`} disabled={!!mine?.vote}
              onClick={() => run(async () => { await submitResultField(code, round.id, me.id, 'vote', id); sfx.betJingle(); })}>
              <SketchView data={round.results[id].sketch} size={130} />
              <span>{byId[id]?.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  },
  Stage({ round, byId, big }) {
    const ids = round.participants;
    if (round.step === 'draw') {
      return (
        <div className="stack">
          <Prompt round={round} big={big} />
          <div className="row wrap center" style={{ gap: 6 }}>
            {ids.map((id) => <span key={id} className={`pill ${round.results?.[id]?.sketch != null ? 'good' : ''}`}><Name p={byId[id]} /> {round.results?.[id]?.sketch != null ? '✓' : '🖍️'}</span>)}
          </div>
        </div>
      );
    }
    const voted = ids.filter((id) => round.results?.[id]?.vote).length;
    return (
      <div className="stack">
        <Prompt round={round} big={big} />
        <p className="center muted" style={{ margin: 0, fontWeight: 700 }}>🗳️ {t('{a}/{b} haben abgestimmt', { a: voted, b: ids.length })}</p>
        <div className="sketch-grid">
          {ids.filter((id) => round.results?.[id]?.sketch != null).map((id) => (
            <div key={id} className="sketch-card"><SketchView data={round.results[id].sketch} size={big ? 220 : 130} /><span>{byId[id]?.name}</span></div>
          ))}
        </div>
      </div>
    );
  },
  Result({ round, byId }) {
    const counts = round.votes ?? sketchVotes(round);
    const max = Math.max(0, ...Object.values(counts));
    const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return (
      <div className="stack">
        <Prompt round={round} />
        <div className="sketch-grid">
          {ids.map((id) => (
            <div key={id} className={`sketch-card ${max > 0 && counts[id] === max ? 'win' : ''}`}>
              <SketchView data={round.results?.[id]?.sketch} size={130} />
              <span>{max > 0 && counts[id] === max ? '🏆 ' : ''}{byId[id]?.name} · {counts[id]} 🗳️</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const EXTRA_GROUP_GAMES = { tugOfWar: TugOfWar, teamEstimate: TeamEstimate, blindSketch: BlindSketch };
