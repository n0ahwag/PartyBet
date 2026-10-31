/*
 * Seiten-Einstellungen: Werbung (Google AdSense) und Angaben für Impressum/Datenschutz.
 * Werte können auch beim Build per Umgebungsvariable gesetzt werden (GitHub → Settings →
 * Secrets and variables → Actions → Variables), siehe docs/ADSENSE.md.
 */
const env = import.meta.env;

export const ADSENSE = {
  /** Publisher-ID aus AdSense, z. B. "ca-pub-1234567890123456". Leer = keine Werbung. */
  client: env.VITE_ADSENSE_CLIENT || '',
  /** ID einer Anzeigeneinheit (AdSense → Anzeigen → Nach Anzeigenblock → Display-Anzeige). */
  slot: env.VITE_ADSENSE_SLOT || '',
  /** Testanzeigen (keine echten Klicks/Einnahmen) – nur für die Entwicklung. */
  test: env.VITE_ADSENSE_TEST === 'true',
};

/** Pflichtangaben fürs Impressum (§ 5 DDG). Bitte mit deinen echten Daten füllen. */
export const OWNER = {
  name: env.VITE_OWNER_NAME || '[Vor- und Nachname]',
  street: env.VITE_OWNER_STREET || '[Straße und Hausnummer]',
  city: env.VITE_OWNER_CITY || '[PLZ Ort]',
  country: env.VITE_OWNER_COUNTRY || 'Deutschland',
  email: env.VITE_OWNER_EMAIL || '[E-Mail-Adresse]',
};

export const adsEnabled = () => /^ca-pub-\d{10,20}$/.test(ADSENSE.client);
