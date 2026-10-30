import { useSyncExternalStore } from 'react';
import { EN } from './en.js';

/*
 * Mini-i18n: Der deutsche Text ist der Schlüssel, Englisch kommt aus en.js.
 *   t('Party erstellen')                 → "Create party"
 *   t('Trink {n} Schlücke!', { n: 3 })   → "Drink 3 sips!"
 * Die Sprache gilt pro Gerät (localStorage) – jeder Spieler wählt seine eigene.
 * Spielinhalte (Fragen, Rätsel …) sind zweisprachige Objekte { de, en } → L(item).
 */

export const LANGS = [
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
];

const KEY = 'fo_lang';
function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LANGS.some((l) => l.id === saved)) return saved;
  } catch {
    /* kein Speicher */
  }
  return (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('de')) ? 'de' : 'en';
}

let lang = initialLang();
const listeners = new Set();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export const getLang = () => lang;

export function setLang(next) {
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* egal */ }
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Hook: rendert neu, wenn die Sprache wechselt. */
export function useLang() {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

/** Übersetzt einen deutschen Text; {platzhalter} werden ersetzt. */
export function t(text, vars) {
  const s = lang === 'en' ? (EN[text] ?? text) : text;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

/** Zahl mit Einzahl/Mehrzahl: tn(n, '{n} Schluck', '{n} Schlücke'). */
export function tn(n, one, many, vars = {}) {
  return t(n === 1 ? one : many, { n, ...vars });
}

/** Zweisprachiger Inhalt { de, en } (oder schon ein String). */
export function L(item) {
  if (item == null || typeof item === 'string' || typeof item === 'number') return item;
  return item[lang] ?? item.de;
}

/** Locale für Zahlenformate. */
export const locale = () => (lang === 'en' ? 'en-US' : 'de-DE');

/** Sprachcode für die Sprachausgabe. */
export const speechLang = () => (lang === 'en' ? 'en-US' : 'de-DE');
