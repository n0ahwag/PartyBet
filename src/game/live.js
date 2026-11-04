import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

/*
 * Live-Spielstand für den Hauptbildschirm: Während eines Spiels meldet jedes Handy
 * seinen Zwischenstand (eine Zahl) unter live.{uid} – gedrosselt, damit es bei
 * vielen Spielern nicht zu viele Schreibvorgänge werden. Nur der eigene Schlüssel
 * (siehe firestore.rules), Fehler werden still ignoriert: der Live-Stand ist nur Deko,
 * das echte Ergebnis kommt wie immer über results.
 */

const LIVE_EVERY_MS = 700;

/**
 * @param coll 'rounds' (Gruppe/Spielfeld/Bibliothek) oder 'duels' (Party-Modus)
 * @returns report(value) mit report.stop() zum Aufräumen
 */
export function makeLiveReporter(code, coll, id, uid) {
  let last = 0;
  let pending = null;
  let sent;
  let timer = null;
  let stopped = false;
  const send = () => {
    timer = null;
    const json = JSON.stringify(pending);
    if (stopped || json === sent) return;
    last = Date.now();
    sent = json;
    updateDoc(doc(db, 'rooms', code, coll, id), { [`live.${uid}`]: pending }).catch(() => {});
  };
  const round2 = (v) => Math.round(v * 100) / 100;
  /** value: Zahl oder kleines Objekt mit Zahlen (z. B. { n: 3, avg: 290 }) */
  const report = (value) => {
    if (stopped || value == null) return;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return;
      pending = round2(value);
    } else if (typeof value === 'object') {
      pending = Object.fromEntries(Object.entries(value).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => [k, round2(v)]));
    } else return;
    if (!timer) timer = setTimeout(send, Math.max(0, last + LIVE_EVERY_MS - Date.now()));
  };
  report.stop = () => { stopped = true; clearTimeout(timer); };
  return report;
}
