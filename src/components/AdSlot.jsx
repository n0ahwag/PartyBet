import { useEffect, useRef } from 'react';
import { ADSENSE, ADSTERRA, adsEnabled, adsterraEnabled } from '../site.config.js';
import { loadAdsense } from '../lib/ads.js';
import { useAdConsent } from '../lib/consent.js';
import { t } from '../i18n/index.js';

const SIZES = { banner: { w: 320, h: 50 }, box: { w: 300, h: 250 } };

/**
 * Adsterra-Banner in einem eigenen iframe: Das Adsterra-Skript nutzt document.write, das in einer
 * laufenden App die Seite leeren würde. Die Sandbox verhindert ungefragte Weiterleitungen der App.
 */
function AdsterraFrame({ size }) {
  const key = ADSTERRA[size] || ADSTERRA.banner || ADSTERRA.box;
  const { w, h } = key === ADSTERRA[size] ? SIZES[size] : SIZES[key === ADSTERRA.box ? 'box' : 'banner'];
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>
<script>atOptions={key:${JSON.stringify(key)},format:'iframe',height:${h},width:${w},params:{}};<\/script>
<script src="https://${ADSTERRA.host}/22/${key}"><\/script></body></html>`;
  return (
    <iframe title={t('Anzeige')} srcDoc={html} width={w} height={h} scrolling="no"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      style={{ border: 0, display: 'block', margin: '0 auto', maxWidth: '100%' }} />
  );
}

/**
 * Werbefläche. Nur auf ruhigen Seiten einsetzen (Start, Bibliothek, Lobby) – nie im laufenden Spiel
 * neben Knöpfen, sonst drohen versehentliche Klicks.
 * size: 'banner' (320 × 50) oder 'box' (300 × 250) – gilt für Adsterra.
 */
export function AdSlot({ style, size = 'banner' }) {
  const ref = useRef(null);
  const pushed = useRef(false);
  const consent = useAdConsent();

  useEffect(() => {
    if (!adsEnabled() || !ADSENSE.slot) return;
    loadAdsense().then((ok) => {
      if (!ok || pushed.current || !ref.current) return;
      pushed.current = true;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* Adblocker o. Ä. */ }
    });
  }, []);

  if (adsterraEnabled()) {
    if (consent !== 'granted') return null;
    return (
      <div className="ad-slot" style={style}>
        <div className="ad-label">{t('Anzeige')}</div>
        <AdsterraFrame size={size} />
      </div>
    );
  }
  if (!adsEnabled() || !ADSENSE.slot) return null;
  return (
    <div className="ad-slot" style={style}>
      <div className="ad-label">{t('Anzeige')}</div>
      <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }}
        data-ad-client={ADSENSE.client} data-ad-slot={ADSENSE.slot}
        data-ad-format="auto" data-full-width-responsive="true"
        {...(ADSENSE.test ? { 'data-adtest': 'on' } : {})} />
    </div>
  );
}
