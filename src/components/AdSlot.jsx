import { useEffect, useRef } from 'react';
import { ADSENSE, adsEnabled } from '../site.config.js';
import { loadAdsense } from '../lib/ads.js';
import { t } from '../i18n/index.js';

/**
 * Responsive Werbefläche (AdSense). Nur auf ruhigen Seiten einsetzen (Start, Bibliothek, Lobby) –
 * nie im laufenden Spiel neben Knöpfen, sonst drohen versehentliche Klicks (gegen die AdSense-Richtlinien).
 */
export function AdSlot({ style }) {
  const ref = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsEnabled() || !ADSENSE.slot) return;
    loadAdsense().then((ok) => {
      if (!ok || pushed.current || !ref.current) return;
      pushed.current = true;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* Adblocker o. Ä. */ }
    });
  }, []);

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
