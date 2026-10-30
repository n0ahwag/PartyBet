import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from '../firebase.js';

/*
 * Hält Tablets/Handys live: iPadOS/iOS-Safari pausiert die Firestore-Verbindung,
 * sobald der Bildschirm abdunkelt oder der Tab kurz im Hintergrund war, und
 * verbindet sich danach erst mit Verzögerung (Backoff) neu.
 */

let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch {
    /* nicht unterstützt oder abgelehnt (z. B. Stromsparmodus) */
  }
}

let reconnecting = null;
/** Baut die Firestore-Verbindung sofort neu auf, statt auf den Backoff zu warten. */
export function forceReconnect() {
  if (!reconnecting) {
    reconnecting = disableNetwork(db)
      .then(() => enableNetwork(db))
      .catch(() => {})
      .finally(() => { reconnecting = null; });
  }
  return reconnecting;
}

export function startLiveSync() {
  let hiddenAt = 0;
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    requestWakeLock();
    if (hiddenAt && Date.now() - hiddenAt > 1500) forceReconnect();
  };
  const onResume = () => forceReconnect();
  const onFirstTouch = () => requestWakeLock();

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onResume);
  window.addEventListener('pageshow', (e) => { if (e.persisted) onResume(); });
  window.addEventListener('pointerdown', onFirstTouch);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onResume);
    window.removeEventListener('pointerdown', onFirstTouch);
  };
}
