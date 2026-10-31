import { OWNER, adsEnabled } from '../site.config.js';
import { navigate } from '../lib/router.js';
import { t, getLang } from '../i18n/index.js';
import { LangSwitch, HomeButton } from '../components/ui.jsx';

/*
 * Impressum & Datenschutzerklärung (deutsches Recht, daher auf Deutsch).
 * Vorlage – ersetzt keine Rechtsberatung. Angaben in src/site.config.js eintragen.
 */

export function LegalLinks() {
  return (
    <nav className="legal-links">
      <a href="#/impressum">{t('Impressum')}</a>
      <a href="#/datenschutz">{t('Datenschutz')}</a>
    </nav>
  );
}

function Owner() {
  return (
    <p>
      {OWNER.name}<br />
      {OWNER.street}<br />
      {OWNER.city}<br />
      {OWNER.country}<br />
      E-Mail: {OWNER.email}
    </p>
  );
}

/** Öffnet erneut die Einwilligungs-Abfrage von Google (Widerruf/Änderung der Einwilligung). */
function openConsent() {
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push(() => window.googlefc.showRevocationMessage?.());
}

function Impressum() {
  return (
    <>
      <h2>Impressum</h2>
      <p><b>Angaben gemäß § 5 DDG</b></p>
      <Owner />
      <p><b>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</b><br />{OWNER.name}, Anschrift wie oben</p>
      <p><b>Haftung für Inhalte und Links</b><br />
        Die Inhalte dieser App wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität
        übernehmen wir keine Gewähr. Für Inhalte externer Seiten (z. B. Werbung) sind ausschließlich deren Betreiber verantwortlich.</p>
      <p><b>Hinweis</b><br />
        FaceOff Party ist ein Partyspiel. Bitte trinkt verantwortungsvoll – Schlücke können jederzeit Wasser sein.
        Spiele mit Alkohol nur ab 18 Jahren – kein Alkohol an Minderjährige.</p>
    </>
  );
}

function Datenschutz() {
  const ads = adsEnabled();
  return (
    <>
      <h2>Datenschutzerklärung</h2>
      <h3>1. Verantwortlicher</h3>
      <Owner />

      <h3>2. Hosting (GitHub Pages)</h3>
      <p>Die App wird über GitHub Pages (GitHub Inc., 88 Colin P. Kelly Jr. St., San Francisco, CA 94107, USA) ausgeliefert.
        Beim Aufruf verarbeitet GitHub technisch notwendige Daten wie IP-Adresse, Zeitpunkt und abgerufene Datei
        (Server-Logfiles), um die Seite sicher bereitzustellen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an einer stabilen, sicheren Auslieferung). GitHub ist unter dem EU-US Data Privacy
        Framework zertifiziert.</p>

      <h3>3. Spielbetrieb (Google Firebase)</h3>
      <p>Für Räume und das Live-Spiel nutzen wir Firebase Authentication (anonyme Anmeldung) und Cloud Firestore der
        Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Gespeichert werden eine zufällige Geräte-ID,
        der von dir gewählte Spielername und Avatar, der Raumcode sowie Spielstände, Wetten und Ergebnisse (z. B. Zeiten
        oder Punkte). Es ist kein Konto, keine E-Mail-Adresse und kein Klarname nötig. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des von dir genutzten Spiels). Eine Übermittlung in die USA ist
        möglich; Google ist unter dem EU-US Data Privacy Framework zertifiziert. Raumdaten werden nur für das Spiel
        benötigt; nicht mehr genutzte Räume löschen wir regelmäßig. Die sofortige Löschung kannst du jederzeit per
        E-Mail verlangen.</p>
      <p>Zusätzlich zählen wir anonym, wie oft jedes Minispiel pro Woche gespielt wurde (nur Spiel und Datum, ohne
        Bezug zu Personen oder Geräten), damit seltene Spiele häufiger drankommen.</p>

      <h3>4. Speicherung auf deinem Gerät</h3>
      <p>Im lokalen Speicher deines Browsers merken wir uns Spielername, Avatar, Sprache, Ton an/aus und den letzten Raum,
        damit du nach dem Neuladen weiterspielen kannst. Das ist für die von dir gewünschte Funktion unbedingt
        erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst die Daten über die Browser-Einstellungen löschen.</p>

      <h3>5. Kamera und Bewegungssensoren</h3>
      <p>Einige Spiele nutzen – nur nach deiner Freigabe – Frontkamera, Bewegungs- und Neigungssensoren oder den
        Kompass. Die Auswertung (z. B. Blinzel-Erkennung, Helligkeit, Neigung) findet ausschließlich auf deinem Gerät
        statt; Kamerabilder werden weder gespeichert noch übertragen. An die anderen Spieler geht nur das Ergebnis
        (z. B. eine Zeit in Millisekunden).</p>

      <h3>6. Schriftarten</h3>
      <p>Die Schriftart „Outfit“ wird lokal mit der App ausgeliefert. Es findet keine Verbindung zu Google Fonts statt.</p>

      {ads ? (
        <>
          <h3>7. Werbung (Google AdSense)</h3>
          <p>Zur Finanzierung zeigen wir auf ruhigen Seiten (Start, Bibliothek, Lobby) Anzeigen von Google AdSense der
            Google Ireland Limited (Anschrift s. o.). Google verwendet dafür Cookies und ähnliche Technologien sowie
            Gerätekennungen. Personalisierte Anzeigen und das Speichern von Informationen auf deinem Gerät erfolgen nur mit
            deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG), die über die Einwilligungs-Abfrage von
            Google (IAB TCF) eingeholt wird. Ohne Einwilligung können nicht-personalisierte bzw. eingeschränkte Anzeigen
            erscheinen. Eine Übermittlung in die USA ist möglich (EU-US Data Privacy Framework). Weitere Informationen:
            policies.google.com/technologies/ads.</p>
          <p><button className="btn soft sm" onClick={openConsent}>Datenschutz-Einstellungen ändern</button></p>
        </>
      ) : null}

      <h3>{ads ? '8' : '7'}. Deine Rechte</h3>
      <p>Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der
        Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO). Eine erteilte Einwilligung
        kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Außerdem kannst du dich bei einer
        Datenschutz-Aufsichtsbehörde beschweren, z. B. bei der für uns zuständigen: Der Hessische Beauftragte für
        Datenschutz und Informationsfreiheit, Gustav-Stresemann-Ring 1, 65189 Wiesbaden, datenschutz.hessen.de.
        Für alle Anliegen genügt eine E-Mail an die oben genannte Adresse.</p>
      <p className="small muted">Stand: Oktober 2026</p>
    </>
  );
}

export function Legal({ page }) {
  return (
    <div className="page legal">
      <div className="row between">
        <button className="btn ghost sm" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))}>←</button>
        <div className="row" style={{ gap: 6 }}><LangSwitch /><HomeButton /></div>
      </div>
      {getLang() !== 'de' && <p className="small muted" style={{ margin: 0 }}>{t('Rechtliche Angaben nach deutschem Recht – nur auf Deutsch verfügbar.')}</p>}
      <div className="card">{page === 'impressum' ? <Impressum /> : <Datenschutz />}</div>
      <LegalLinks />
    </div>
  );
}
