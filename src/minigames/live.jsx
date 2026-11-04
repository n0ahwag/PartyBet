import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { GAMES, resultComplete, rankFromScores } from '../game/gameLibrary.js';
import { makeLiveReporter } from '../game/live.js';
import { FORMAT_RESULT, num } from './format.js';
import { t } from '../i18n/index.js';

/*
 * Live-Spielstand: Spiele melden über useLiveReport()/useLiveValue() ihren Zwischenstand,
 * der Hauptbildschirm zeigt daraus eine Live-Rangliste (LiveBoard).
 * Ohne LiveProvider (z. B. Übungsmodus oder „Nur Handys“) passiert einfach nichts.
 */

const LiveContext = createContext(null);
const noop = () => {};

/** Stellt den Spielen auf diesem Handy den Live-Kanal bereit (nur mit Hauptbildschirm). */
export function LiveProvider({ code, coll = 'rounds', id, uid, on, children }) {
  // Stabile Funktion für die Spiele; der eigentliche Kanal hängt in einem Ref (übersteht StrictMode-Doppel-Mount)
  const ref = useRef(null);
  const [report] = useState(() => (v) => ref.current?.(v));
  useEffect(() => {
    if (!(on && code && id && uid)) return undefined;
    const r = makeLiveReporter(code, coll, id, uid);
    ref.current = r;
    return () => { r.stop(); if (ref.current === r) ref.current = null; };
  }, [on, code, coll, id, uid]);
  return <LiveContext.Provider value={report}>{children}</LiveContext.Provider>;
}

/** report(zahl) – für Spiele, die ihren Stand in einer Schleife (Canvas, Sensor) berechnen. */
export function useLiveReport() {
  return useContext(LiveContext) ?? noop;
}

/** Meldet den Wert, sobald er sich ändert (null = noch nichts zu melden). */
export function useLiveValue(value) {
  const report = useLiveReport();
  useEffect(() => { if (value != null) report(value); }, [value, report]);
}

const s1 = (ms) => `${num(ms / 1000, 1)} s`;

/**
 * Spiele mit echtem Zwischenstand. Wert: je höher, desto besser.
 *   fmt(v, round)  Anzeige des Live-Werts
 *   final(r)       derselbe Wert aus dem fertigen Ergebnis (damit Fertige und Spielende vergleichbar sind)
 *   max(round)     optionaler Höchstwert für den Balken
 */
export const LIVE = {
  shake: { fmt: (v) => t('{n} Schüttler', { n: v }), final: (r) => r.shakes },
  spiritLevel: { fmt: (v) => t('{n} s stabil', { n: num(v / 1000, 1) }), final: (r) => r.bestMs },
  safeCracker: { fmt: (v, round) => `${Math.round(v)}° / ${round.game.degrees}°`, final: (r, round) => (r.ms != null ? round.game.degrees : r.degrees ?? 0), max: (round) => round.game.degrees },
  pixelRun: { fmt: (v) => `🏃 ${v} m`, final: (r) => r.m },
  blockStacker: { fmt: (v) => `🧱 ${t('{n} Stockwerke', { n: v })}`, final: (r) => r.floors },
  longJump: { fmt: (v) => `🦘 ${num(v)} m`, final: (r) => r.best },
  skyJumper: { fmt: (v) => `🪜 ${v} m`, final: (r) => r.m },
  levelHit: { fmt: (v) => `🎚️ ${t('{n} s in der Zone', { n: num(v / 1000, 1) })}`, final: (r) => r.inMs },
  breathBalloon: { fmt: (v) => (v < 0 ? `💥 ${t('geplatzt')}` : `🎈 ${v} %`), final: (r) => (r.popped ? -1 : r.size), max: () => 100 },
  hotWire: { fmt: (v) => `⚡ ${t('{p} % geschafft', { p: Math.round(v) })}`, final: (r) => (r.ms != null ? 100 : Math.round((r.progress ?? 0) * 100)), max: () => 100 },
  higherLower: { fmt: (v) => `🔥 ${t('{n} richtig', { n: v })}`, final: (r) => r.streak },
  stareDown: { fmt: (v) => s1(v), final: (r) => r.survivedMs },
  numberMemory: { fmt: (v) => `🧠 ${t('{n} Ziffern', { n: v })}`, final: (r) => r.digits },
  balance: { fmt: (v) => `〰️ ${t('Wackel-Wert')} ${num(v, 3)}`, final: (r) => r.wobble, low: true },

  // Zwischenstand ohne direkten Vergleich zum Endergebnis (progress): Fertige stehen oben
  speedTap: { progress: true, fmt: (v, round) => `⚡ ${v.n}/${round.game.rounds.length}${v.avg ? ` · Ø ${Math.round(v.avg)} ms` : ''}`, key: (v) => v.n, max: (round) => round.game.rounds.length },
  memoryCode: { progress: true, fmt: (v, round) => `⌨️ ${t('{a}/{b} Ziffern', { a: v, b: round.game.code.length })}`, max: (round) => round.game.code.length, idle: '👀 merkt sich den Code …' },
  rhythm: { progress: true, fmt: (v, round) => `🥁 ${t('{a}/{b} Schläge', { a: v, b: round.game.intervals.length + 1 })}`, max: (round) => round.game.intervals.length + 1, idle: '👂 hört zu …' },
  priceTag: { progress: true, fmt: (v, round) => `🏷️ ${t('{a}/{b} geschätzt', { a: v, b: round.game.items.length })}`, max: (round) => round.game.items.length, idle: '🏷️ schätzt …' },
  compass: { progress: true, low: true, fmt: (v) => `🧭 ${t('{n}° daneben', { n: Math.round(v) })}`, idle: '🧭 sucht die Richtung …' },
  emojiQuiz: { progress: true, low: true, fmt: (v) => `🤔 ${t('{n}× falsch geraten', { n: v })}`, idle: '🤔 rätselt …' },
  mathBlitz: { progress: true, low: true, fmt: (v) => `✖️ ${t('{n}× falsch', { n: v })}`, idle: '🧮 rechnet …' },
  secretNumber: { progress: true, low: true, fmt: (v) => `🔢 ${t('{n} Versuche', { n: v })}`, idle: '🔢 rät …' },
  traceLine: { progress: true, fmt: (v) => `✍️ ${t('{n} % gezeichnet', { n: Math.round(v) })}`, max: () => 100, idle: '✍️ zeichnet …' },

  // Kein Zwischenstand möglich (z. B. eine geheime Antwort) – dafür ein klarer Status statt „spielt“
  estimate: { idle: '🤔 schätzt …' },
  stopwatch: { idle: '⏱️ die Uhr läuft …' },
  f1Start: { idle: '🚦 wartet auf Grün …' },
  lightFlash: { idle: '💡 wartet auf das Signal …' },
  association: { idle: '✍️ tippt …' },
  categorySprint: { idle: '✍️ tippt …' },
  heightStretch: { idle: '💪 streckt sich …' },
  marbleMaze: { idle: '🎯 im Labyrinth …' },
  truthBluff: { idle: '🤔 überlegt …' },
};

/** Sortier-Wert eines Live-Werts (höher = besser). */
const keyOf = (cfg, v) => {
  if (v == null) return -Infinity;
  const k = cfg.key ? cfg.key(v) : typeof v === 'number' ? v : 0;
  return cfg.low ? -k : k;
};

const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * Live-Rangliste während eines Spiels: wer führt gerade, wer ist schon fertig.
 * Zeilen gleiten an ihren neuen Platz, sobald sich die Reihenfolge ändert.
 */
export function LiveBoard({ round, byId, ids = round.participants, meId, big = false }) {
  const game = GAMES[round.gameId];
  const cfg = LIVE[round.gameId];
  const fmt = FORMAT_RESULT[round.gameId];
  const done = (id) => resultComplete(round.gameId, round.results?.[id]);
  const doneIds = ids.filter(done);
  const provisional = game?.groupScore
    ? rankFromScores(doneIds, (id) => game.groupScore(round.results[id], id, round))
    : {};
  const live = !!cfg?.fmt;
  const comparable = live && !!cfg.final;
  const valueOf = (id) => (done(id) ? (comparable ? cfg.final(round.results[id], round) : null) : round.live?.[id] ?? null);

  const rows = ids.map((id) => ({ id, done: done(id), v: live ? valueOf(id) : null, rank: provisional[id] }));
  rows.sort((a, b) => {
    if (comparable) {
      const d = keyOf(cfg, b.v) - keyOf(cfg, a.v);
      if (d) return d;
    }
    if (a.done !== b.done) return a.done ? -1 : 1;
    if (!a.done && live) {
      const d = keyOf(cfg, b.v) - keyOf(cfg, a.v);
      if (d) return d;
    }
    return (a.rank ?? 99) - (b.rank ?? 99) || ids.indexOf(a.id) - ids.indexOf(b.id);
  });
  const barOf = (v) => (cfg?.key ? cfg.key(v) : v);
  const showBar = live && !cfg.low;
  const max = Math.max(1e-9, cfg?.max?.(round) ?? 0, ...rows.map((r) => (r.v != null ? barOf(r.v) : 0)));
  const anyValue = rows.some((r) => r.v != null || r.done);
  const rowH = big ? 66 : 54;

  return (
    <div className="card stack live-board" style={{ gap: 10 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}><span className="live-dot" /> {t('Live-Stand')}</h3>
        <span className="pill">{t('{a}/{b} fertig', { a: doneIds.length, b: ids.length })}</span>
      </div>
      <div className="live-rows" style={{ height: rows.length * rowH }}>
        {ids.map((id) => {
          const i = rows.findIndex((r) => r.id === id);
          const r = rows[i];
          const p = byId[id];
          const lead = anyValue && i === 0 && (r.v != null || r.done);
          let status;
          if (r.done) status = `✓ ${fmt ? fmt(round.results[id], round, id) : t('fertig')}`;
          else if (live && r.v != null) status = cfg.fmt(r.v, round);
          else status = t(cfg?.idle ?? 'spielt …');
          return (
            <div key={id} className={`live-row ${id === meId ? 'me' : ''} ${r.done ? 'done' : ''} ${lead ? 'lead' : ''}`}
              style={{ transform: `translateY(${i * rowH}px)`, height: rowH - 8, '--c': p?.color ?? 'var(--accent)' }}>
              <span className="live-pos">{anyValue && (r.v != null || r.done) ? MEDAL[i] ?? `${i + 1}.` : '·'}</span>
              <span className="avatar" style={{ background: `color-mix(in srgb, ${p?.color ?? '#999'} 22%, var(--card))` }}>{p?.avatar}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row between" style={{ gap: 8 }}>
                  <b className="ellipsis">{p?.name}</b>
                  <span className={`small live-status ${r.done ? '' : 'muted'}`}>{status}</span>
                </div>
                {showBar && (
                  <div className="bar live-bar"><div style={{ width: `${Math.max(0, Math.min(1, (r.v != null ? barOf(r.v) : r.done && !comparable ? max : 0) / max)) * 100}%` }} /></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
