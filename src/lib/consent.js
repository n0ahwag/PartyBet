import { useSyncExternalStore } from 'react';

/*
 * Einwilligung für Werbung (Adsterra setzt Cookies → § 25 TDDDG / DSGVO).
 * Zustand im lokalen Speicher: 'granted' | 'denied' | null (noch nicht gefragt).
 */
const KEY = 'faceoff.adConsent';
const listeners = new Set();

function read() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
let state = read();

export function getAdConsent() { return state; }

export function setAdConsent(value) {
  state = value;
  try {
    if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY);
  } catch { /* privater Modus – gilt dann nur für diese Sitzung */ }
  listeners.forEach((fn) => fn());
}

export function useAdConsent() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, getAdConsent);
}
