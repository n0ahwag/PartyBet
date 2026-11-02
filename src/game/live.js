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
    if (stopped || pending === sent) return;
    last = Date.now();
    sent = pending;
    updateDoc(doc(db, 'rooms', code, coll, id), { [`live.${uid}`]: pending }).catch(() => {});
  };
  const report = (value) => {
    if (stopped || value == null || !Number.isFinite(value)) return;
    pending = Math.round(value * 100) / 100;
    if (!timer) timer = setTimeout(send, Math.max(0, last + LIVE_EVERY_MS - Date.now()));
  };
  report.stop = () => { stopped = true; clearTimeout(timer); };
  return report;
}
