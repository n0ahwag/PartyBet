import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';

/*
 * Gemeinsame Bausteine der Hauptbildschirm-Spiele:
 *  - TvFrame: farbenfroher Konsolen-Look für den großen Bildschirm
 *  - PadFrame: helle, aufgeräumte Controller-Oberfläche fürs Handy
 *  - useNow / Timer / ScoreStrip / usePhaseSound
 */

/** Aktuelle Zeit, neu gerendert alle `ms` Millisekunden (für Timer & Animationen). */
export function useNow(ms = 200) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [ms]);
  return now;
}

export const secsLeft = (until, now) => Math.max(0, Math.ceil(((until ?? now) - now) / 1000));

/** Runder Timer (Restzeit bis `until`, Gesamtdauer `total`). */
export function Timer({ until, total, now, size = 64 }) {
  const left = Math.max(0, (until ?? now) - now);
  const p = total ? Math.min(1, left / total) : 0;
  const r = size / 2 - 5;
  const C = 2 * Math.PI * r;
  const urgent = left < 4000;
  return (
    <div className={`tv-timer ${urgent ? 'urgent' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} style={{ transition: 'stroke-dasharray .25s linear' }} />
      </svg>
      <b>{Math.ceil(left / 1000)}</b>
    </div>
  );
}

/** Großer Konsolen-Rahmen für den Hauptbildschirm. */
export function TvFrame({ game, subtitle, right, children, className = '' }) {
  return (
    <div className={`tv-console ${className}`} style={{ '--tv-accent': game.accent }}>
      <div className="tv-head">
        <span className="tv-logo">{game.icon}</span>
        <div className="grow">
          <div className="tv-title">{t(game.name)}</div>
          {subtitle && <div className="tv-sub">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Heller Controller-Rahmen fürs Handy. */
export function PadFrame({ children, top }) {
  return (
    <div className="pad stack">
      {top && <div className="pad-top">{top}</div>}
      {children}
    </div>
  );
}

/** Punkte-/Platz-Leiste mit allen Spielern. */
export function ScoreStrip({ ids, byId, value, label, highlight, big = true }) {
  const sorted = [...ids].sort((a, b) => (value(b) ?? 0) - (value(a) ?? 0));
  return (
    <div className="tv-scores">
      {sorted.map((id, i) => (
        <div key={id} className={`tv-score ${highlight === id ? 'hot' : ''}`} style={{ '--c': byId[id]?.color ?? '#888' }}>
          <span className="tv-rank">{i + 1}</span>
          <span className="tv-ava" style={{ fontSize: big ? 26 : 18 }}>{byId[id]?.avatar}</span>
          <span className="tv-name">{byId[id]?.name}</span>
          <b className="tv-val">{label ? label(id) : value(id) ?? 0}</b>
        </div>
      ))}
    </div>
  );
}

/** Spielt einen Sound, wenn sich `key` ändert (nur auf dem Gerät, das ihn aufruft). */
export function usePhaseSound(key, play) {
  const last = useRef(key);
  useEffect(() => {
    if (last.current === key) return;
    last.current = key;
    play?.();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Hinweis „gleich geht's los“, solange die Regie noch keinen Zustand geschrieben hat. */
export function Booting({ big }) {
  return <div className={big ? 'tv-console center' : 'card center muted'} style={{ minHeight: big ? 280 : 0, display: 'grid', placeItems: 'center' }}><b>📺 {t("Gleich geht's los…")}</b></div>;
}

/**
 * Canvas in Gerätepixeln (scharf auf Retina). Liefert einen Callback-Ref mit `.current`
 * und `.node` – so wird die Größe auch gesetzt, wenn das Canvas erst später eingehängt wird.
 */
export function useCanvas(width, height) {
  const [node, setNode] = useState(null);
  const ref = useMemo(() => {
    const f = (el) => { f.current = el; setNode(el); };
    f.current = null;
    return f;
  }, []);
  ref.node = node;
  useLayoutEffect(() => {
    if (!node) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    node.width = Math.round(width * dpr);
    node.height = Math.round(height * dpr);
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
    node.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [node, width, height]);
  return ref;
}

/** Verfügbare Breite eines Elements (für skalierte Canvas-Ansichten). */
export function useWidth(fallback = 900) {
  const [node, setNode] = useState(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!node) return undefined;
    setW(Math.max(200, Math.floor(node.getBoundingClientRect().width)));
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.floor(e.contentRect.width))));
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, w];
}
