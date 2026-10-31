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

/** Pflichtangaben fürs Impressum (§ 5 DDG). Werte kommen aus den GitHub-Variablen OWNER_*. */
export const OWNER = {
  name: env.VITE_OWNER_NAME || '[Vor- und Nachname]',
  street: env.VITE_OWNER_STREET || '[Straße und Hausnummer]',
  city: env.VITE_OWNER_CITY || '[PLZ Ort]',
  country: env.VITE_OWNER_COUNTRY || 'Deutschland',
  email: env.VITE_OWNER_EMAIL || '[E-Mail-Adresse]',
};

export const adsEnabled = () => /^ca-pub-\d{10,20}$/.test(ADSENSE.client);

/**
 * Adsterra-Banner (nur genutzt, solange AdSense nicht aktiv ist). Die Schlüssel stehen ohnehin
 * öffentlich im Seitenquelltext; per GitHub-Variable überschreibbar.
 */
export const ADSTERRA = {
  host: env.VITE_ADSTERRA_HOST || 'bauval.org',
  // Vorerst deaktiviert. Wieder einschalten: Schlüssel eintragen (oder GitHub-Variablen ADSTERRA_BANNER/ADSTERRA_BOX):
  // Banner 320 × 50: 'f74078a06e96dc85c4430d131b9a7a05' · Box 300 × 250: 'b98efcf79dcf2716dd95eee011450712'
  banner: env.VITE_ADSTERRA_BANNER || '', // 320 × 50
  box: env.VITE_ADSTERRA_BOX || '', // 300 × 250
};
export const adsterraEnabled = () => !adsEnabled() && !!(ADSTERRA.banner || ADSTERRA.box);
/** Werbung, die eine eigene Einwilligung braucht (AdSense bringt seine eigene Abfrage mit). */
export const needsOwnConsent = () => adsterraEnabled();

/**
 * Kontaktformular: Nachrichten landen immer in Firestore (Sammlung „contact“).
 * Optional zusätzlich per E-Mail über web3forms.com – dafür den kostenlosen Access Key
 * als GitHub-Variable CONTACT_FORM_KEY setzen.
 */
export const CONTACT = { web3formsKey: env.VITE_CONTACT_FORM_KEY || '' };
