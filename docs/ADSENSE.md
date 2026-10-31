# Werbung mit Google AdSense

Mit **Google AdSense** zeigst du Anzeigen in deiner App und verdienst daran. „Google Ads“ ist das Gegenstück, mit dem man selbst Werbung schaltet.

Die App ist fertig vorbereitet:

- **Anzeigenflächen** erscheinen nur auf ruhigen Seiten und sind als „Anzeige“ gekennzeichnet: Startseite, Bibliothek, Übungs-Übersicht und Lobby (Warten auf den Host). Im laufenden Spiel gibt es keine Werbung.
- **`ads.txt`** und das **Bestätigungs-Tag** im `<head>` werden automatisch erzeugt, sobald eine Publisher-ID gesetzt ist.
- **Impressum** (`#/impressum`) und **Datenschutzerklärung** (`#/datenschutz`) sind eingebaut. Die Datenschutzerklärung enthält einen AdSense-Abschnitt und einen Button „Datenschutz-Einstellungen ändern“.
- **Die Schrift wird lokal ausgeliefert.** Es gibt keine Verbindung zu Google Fonts, was nach DSGVO wichtig ist.
- **Ohne Publisher-ID** läuft die App wie bisher, ohne jede Werbung.

> ⚠️ Impressum und Datenschutz sind Vorlagen und keine Rechtsberatung. Lass sie im Zweifel prüfen, z. B. mit einem Generator wie e-recht24 oder durch einen Anwalt.

---

## Schritt 1: Eigene Domain (Pflicht)

AdSense nimmt **keine `github.io`-Adressen** an, du brauchst eine eigene Domain, z. B. `faceoff-party.de`. Die kostet ca. 1–15 € pro Jahr, etwa bei IONOS, Strato, Namecheap oder Cloudflare.

1. Domain kaufen.
2. In GitHub die Domain eintragen: **Settings → Pages → Custom domain**, dort die Domain eintragen und **Save** drücken.
3. Beim Domain-Anbieter im DNS eintragen:
   - Für `faceoff-party.de` (ohne www) **vier A-Einträge**: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Für `www.faceoff-party.de` einen **CNAME** auf `n0ahwag.github.io`
4. Nach einigen Minuten bis Stunden in GitHub **„Enforce HTTPS“** anhaken.
5. In der **Firebase Console → Authentication → Settings → Authorized domains** die neue Domain hinzufügen.

## Schritt 2: AdSense-Konto anlegen

1. Auf <https://adsense.google.com> mit deinem Google-Konto anmelden.
2. Deine Domain als Website eintragen.
3. Die angezeigte **Publisher-ID** notieren. Sie sieht aus wie `ca-pub-1234567890123456`.
4. Zahlungs- und Steuerdaten ausfüllen.

## Schritt 3: Werte in GitHub eintragen (keine Code-Änderung nötig)

Öffne **GitHub → Repository → Settings → Secrets and variables → Actions → Tab „Variables“**. Dort legst du über **New repository variable** an:

| Name | Wert |
|---|---|
| `ADSENSE_CLIENT` | deine Publisher-ID, z. B. `ca-pub-1234567890123456` |
| `ADSENSE_SLOT` | ID der Anzeigeneinheit (kommt in Schritt 5, vorerst leer lassen) |
| `OWNER_NAME` | dein Vor- und Nachname (Impressum) |
| `OWNER_STREET` | Straße und Hausnummer |
| `OWNER_CITY` | PLZ und Ort |
| `OWNER_EMAIL` | E-Mail-Adresse |
| `OWNER_COUNTRY` | optional, Standard ist „Deutschland“ |

Danach unter **Actions → Deploy to GitHub Pages → Run workflow** neu veröffentlichen. Jetzt ist das Bestätigungs-Tag im Code und `https://deine-domain/ads.txt` ist erreichbar.

## Schritt 4: Website prüfen lassen

In AdSense unter **Websites** auf **„Überprüfen“** bzw. **„Zur Überprüfung anfordern“** klicken. Google prüft dann ein paar Tage bis Wochen.

- Mögliche Ablehnungsgründe sind „Inhalte von geringem Wert“ oder Richtlinien zu **Alkohol**.
- **Alkohol:** Trinkspiele sind „eingeschränkte Inhalte“. Das heißt meist weniger Werbepartner und damit geringere Einnahmen, im schlimmsten Fall eine Ablehnung.
- **Gegenargument für die Prüfung:** Die alkoholfreien Modi (Spielfeld, Gruppe, Bibliothek) und der Hinweis „Schlücke können Wasser sein“ helfen.

## Schritt 5: Anzeigenblock anlegen

1. In AdSense: **Anzeigen → Nach Anzeigenblock → Display-Anzeigen**.
2. Typ **„Responsiv“** wählen, einen Namen vergeben, z. B. „FaceOff Startseite“, und erstellen.
3. Aus dem Code die Zahl bei `data-ad-slot="…"` kopieren.
4. In GitHub die Variable **`ADSENSE_SLOT`** auf diese Zahl setzen und den Workflow erneut ausführen.

Ab jetzt erscheinen die Anzeigen. Nach Freischaltung kann es noch einige Stunden dauern, bis echte Anzeigen ausgeliefert werden.

## Schritt 6: Einwilligungs-Banner (DSGVO, Pflicht in der EU)

Google verlangt in der EU eine zertifizierte Einwilligungs-Abfrage. Die von Google selbst ist kostenlos und braucht keinen Code:

1. In AdSense: **Datenschutz und Mitteilungen → Europäische Vorschriften → Mitteilung erstellen**.
2. Deine Domain auswählen und den Link zur Datenschutzerklärung eintragen: `https://deine-domain/#/datenschutz`.
3. Optionen „Einwilligen“, „Nicht einwilligen“ und „Optionen verwalten“ aktivieren.
4. Speichern und **veröffentlichen**.

Der Banner erscheint dann automatisch beim ersten Besuch. Der Button „Datenschutz-Einstellungen ändern“ in der Datenschutzerklärung öffnet ihn erneut.

## Hinweise

- **Nicht selbst auf Anzeigen klicken.** Bitte auch Freunde nicht darum, das führt zur Kontosperrung.
- **Einnahmen sind steuerpflichtig.** Je nach Umfang ist eine Gewerbeanmeldung nötig (Kleinunternehmerregelung beachten).
- **Zum Testen** im Browser kann man lokal `VITE_ADSENSE_TEST=true` setzen. Dann kommen Testanzeigen ohne Abrechnung.
- **Mehr oder weniger Werbung:** Die Komponente `src/components/AdSlot.jsx` lässt sich auf weiteren ruhigen Seiten einfügen. Im Spiel neben Knöpfen bitte nicht, das verstößt gegen die Richtlinien (versehentliche Klicks).
