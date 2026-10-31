import { ADSENSE, adsEnabled } from '../site.config.js';

/*
 * Google AdSense: Das Skript wird erst geladen, wenn eine Anzeigenfläche sichtbar wird
 * (und nur, wenn eine Publisher-ID eingetragen ist). Die Einwilligungs-Abfrage (DSGVO/TCF)
 * liefert Google selbst mit aus – sie wird in AdSense unter „Datenschutz & Mitteilungen“ aktiviert.
 */
let loading = null;

export function loadAdsense() {
  if (!adsEnabled()) return Promise.resolve(false);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.client}`;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false); // z. B. Adblocker – App läuft normal weiter
    document.head.appendChild(s);
  });
  return loading;
}
