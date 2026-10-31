import { collection, deleteDoc, getDocs, limit, query, Timestamp, where } from 'firebase/firestore';
import { db, ensureUid } from '../firebase.js';

/*
 * Räume werden 1 Tag nach dem Erstellen gelöscht: Jedes Gerät, das die App öffnet, räumt ein paar
 * abgelaufene Räume samt Unter-Sammlungen auf (die Regeln erlauben das nur nach Ablauf von expireAt).
 * Keine Einrichtung in Firebase nötig.
 */
const SUBCOLLECTIONS = ['players', 'duels', 'rounds', 'rescues', 'liveEvents', 'events'];

export async function cleanupExpiredRooms(max = 5) {
  try {
    await ensureUid();
    const expired = await getDocs(query(collection(db, 'rooms'), where('expireAt', '<', Timestamp.now()), limit(max)));
    for (const room of expired.docs) {
      for (const sub of SUBCOLLECTIONS) {
        const docs = await getDocs(collection(room.ref, sub));
        await Promise.allSettled(docs.docs.map((d) => deleteDoc(d.ref)));
      }
      await deleteDoc(room.ref).catch(() => {}); // evtl. schon von einem anderen Gerät gelöscht
    }
  } catch {
    // Aufräumen ist Nebensache – Fehler (offline, Regeln noch nicht veröffentlicht) ignorieren
  }
}

let started = false;
/** Einmal pro App-Start, kurz verzögert, damit der Start nicht gebremst wird. */
export function scheduleCleanup() {
  if (started) return;
  started = true;
  setTimeout(() => cleanupExpiredRooms(), 4000);
}
