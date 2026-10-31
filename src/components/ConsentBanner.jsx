import { needsOwnConsent } from '../site.config.js';
import { setAdConsent, useAdConsent } from '../lib/consent.js';
import { t } from '../i18n/index.js';

/** Einwilligungs-Abfrage für Werbung – erscheint einmal, bis zugestimmt oder abgelehnt wurde. */
export function ConsentBanner() {
  const consent = useAdConsent();
  if (!needsOwnConsent() || consent) return null;
  if (/#\/(impressum|datenschutz|kontakt)/.test(window.location.hash)) return null; // Rechtstexte frei lesbar
  return (
    <div className="consent-banner" role="dialog" aria-label={t('Werbung & Cookies')}>
      <b>🍪 {t('Werbung & Cookies')}</b>
      <p className="small" style={{ margin: '4px 0 10px' }}>
        {t('FaceOff Party ist kostenlos und finanziert sich über Werbung. Mit deiner Zustimmung zeigen wir Anzeigen unseres Partners Adsterra, der dafür Cookies und ähnliche Technologien nutzt. Ohne Zustimmung gibt es keine Werbung – spielen kannst du so oder so.')}
        {' '}<a href="#/datenschutz">{t('Mehr erfahren')}</a>
      </p>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn soft sm" style={{ flex: 1 }} onClick={() => setAdConsent('denied')}>{t('Ablehnen')}</button>
        <button className="btn primary sm" style={{ flex: 1 }} onClick={() => setAdConsent('granted')}>{t('Akzeptieren')}</button>
      </div>
    </div>
  );
}
