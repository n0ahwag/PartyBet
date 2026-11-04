# ⚔️🍺 FaceOff Party

Realtime-Party- und Gesellschaftsspiel als Mobile-First Web-App. **Vite + React + Firebase (Firestore, Anonymous Auth, Hosting).**

## Drei Spielmodi (beim Erstellen wählbar)

| | 🍻 Party-Modus | 🎲 Spielfeld-Modus (alkoholfrei) | 👥 Gruppen-Modus (ohne Utensilien) |
|---|---|---|---|
| Ablauf | Zwei werden zum 1-gegen-1 ausgelost, alle anderen wetten | **Alle** spielen jede Challenge gemeinsam | **Alle** spielen gleichzeitig, rundenweise |
| Ziel | Am Ende die meisten Schlücke | Als Erster das Ziel-Feld erreichen | Die meisten Punkte (Finale ×2) |
| Ergebnis | Verlierer trinkt, Gewinner verteilt | Alle würfeln, die Platzierung bringt einen Extra-Würfel: 🥇 Gold (4–6) · 🥈 Silber (2–4) · 🥉 Bronze (1–3), jeweils plus normaler Würfel · Rest: normaler Würfel |
| Extras | Wetten, Power-ups, Pleite-Regel | Sonderfelder: 🚀 Rakete (+3) · 🌀 Portal (Platz tauschen mit dem Führenden) · 💥 Chaos (Challenge für alle, der Letzte geht 2 zurück) · 🪨 Stolperstein (1 zurück oder aussetzen) |
| Live-Events | Langsamster trinkt 5 Schlücke | Langsamster geht 1 Feld zurück |
| Phasen | Warm-up → Chaos (×2) → Sudden Death (×3) | Aufwärmen → Halbzeit-Chaos (ab 40 %) → Endspurt (ab 75 % des Führenden) |
| Wrapped | Wett-König, Pechvogel, Saboteur, … | Brettspiel-König, Turbo-Läufer, Pechvogel, Raketen-Pilot, Portal-Dieb, … |

Der **Gruppen-Modus** bringt 5 eigene Gruppen-Spiele mit und mischt alle gruppenfähigen Spiele ohne Utensilien dazu (Platz 1/2/3 = 3/2/1 Punkte):
- 🗳️ **Wer am ehesten …**: geheime Abstimmung. Wer mit der Mehrheit stimmt, bekommt +1
- 🤝 **Gruppen-Synch-Test**: kooperativ. Alle tippen im selben Moment, gemessen über Firestore-Server-Zeitstempel (unabhängig von Geräte-Uhren). Klappt es im Zeitfenster, bekommen alle +2
- 🐝 **Hivemind**: Kategorie erscheint, alle rufen gleichzeitig. Der Host markiert die Mehrheit (+2)
- 🤫 **Beicht-Quiz**: Jeder tippt ein Geheimnis ein, dann wird nacheinander geraten. Richtig geraten +1, wer die Mehrheit täuscht +2
- 📜 **Ketten-Story**: reihum je ein Wort. Am Ende liest die App die Geschichte per Sprachausgabe vor

Im Spielfeld-Modus läuft jedes Minispiel als **Gruppen-Challenge**:
- **Auto-Spiele:** Jedes Handy misst einen Wert, die App rankt automatisch (Gleichstand teilt den Platz, ohne Ergebnis bleibt man stehen).
- **Speed-Tap:** läuft hier als Reaktionstest auf dem eigenen Handy.
- **Wahrheit oder Bluff:** Ein Erzähler gegen alle.
- **Real-Life- und Utensil-Spiele:** Der Host tippt die Reihenfolge an.

Das Spielfeld ist eine **lebendige 3D-Map** (Three.js, wird nur im Spielfeld-Modus nachgeladen; ohne WebGL greift eine einfache SVG-Karte):
- **Länge:** Kurz 90 / Normal 120 / Lang 150 Felder, das sind ca. 14 / 18 / 23 Challenges (per Simulation gewählt, mindestens ~10).
- **Maps (zufällig gewählt):** ☁️ *Himmelsinseln* (schwebende Inseln, Hängebrücken, Trittsteine zum Leuchtturm), 🌋 *Vulkan-Festung* (Burgplattformen im Lavasee, Krater-Gipfel), 💎 *Kristall-Canyon* (Felsterrassen, Leitern, Wasserfall, Schatztruhe). Mehrere Ebenen, Licht & Schatten, animierte Deko (Vögel, Schafe, Schmetterlinge, Ballon, Fledermäuse, Glut, Rauch, springende Fische, Glühwürmchen …). Die Maps wachsen mit der Feldzahl (`src/game/maps/defs.js`).
- **Hindernisse (ohne Schild – sie zeigen sich erst, wenn man dort ankommt):** Man bleibt davor stehen und muss sie eigens bewältigen, danach läuft man die restlichen Schritte weiter. 🪨 *Felsbrocken* – neuer Einzelwurf, 4–6 bricht durch. ⬇️ *Ducken* – Reaktionsprobe am Handy. 🦘 *Kaputte Brücke* – Sprung-Timing, wer fällt, muss 3 Felder zurück. Wer ein Hindernis bewältigt, räumt es für alle weg (Fels zerbröselt, Brücke wird repariert).
- **Einmal benutzt = weg:** Jedes Sonderfeld (Rakete, Portal, Chaos, Stolperstein) wirkt nur für den Ersten, der darauf landet, danach ist es ein normales Feld.
- **Automatischer Ablauf:** Challenge startet nach 10 s Regeln-Lesen, nach dem Ziehen geht es 4 s später automatisch weiter (Host kann pausieren oder sofort starten).
- **Würfeln:** Nach jeder Challenge würfelt **jeder** und **tippt dafür auf seinem Handy auf seine Würfel** (2D-Würfel mit Dreh-Effekt). Platz 1 bekommt zusätzlich einen Gold-Würfel (4–6), Platz 2 einen Silber-Würfel (2–4) und Platz 3 einen Bronze-Würfel (1–3). Die Augen sind pro Runde, Spieler und Würfel fest (`diceFor`), sodass alle Geräte dasselbe sehen. Wer aussetzen muss, würfelt nicht. Sind alle fertig, ziehen die Figuren automatisch. Nach 40 s würfelt die App für Säumige.
- **Handy:** Die Karte folgt der eigenen Figur, man kann wischen. „Ganzes Feld“ zeigt die Übersicht.

## 🆕 Erweiterung: Mikrofon, Teams & Zeichnen

- **🎤 Mikrofon:** Pegel-Treffer (Lautstärke in der Zielzone halten), Atem-Ballon (aufpusten, vor der geheimen Platzgrenze stoppen)
- **✍️ Geschick:** Linie halten (Form in einem Zug nachfahren), Heißer Draht (Kugel per Neigen durch den Parcours)
- **💡 Wissen:** Höher oder Tiefer (längste Serie), Preisschild (Preise schätzen, kleinste Abweichung in %)
- **👥 Gruppen:** Team-Tauziehen (Tipp-Duell zweier Teams), Team-Schätzen (Team-Mittelwert zählt), Blind-Skizze (blind zeichnen, dann abstimmen)
- **⚡ Live-Events:** Gruppen-Freeze (Handy flach hinlegen – der Letzte verliert), Daumen-Krieg (Daumen halten – wer zuerst loslässt, verliert)

## 🤝 Team-Spiele (Team vs. Team & kooperativ)

Die App teilt die Gruppe in **Team Blau** und **Team Orange** (bei ungleich großen Teams zählt der Schnitt pro Kopf). Siegerteam: je 2 Punkte, Gleichstand je 1.
- 🛶 **Wildwasser-Rafting** (kooperativ, ab 2): Rollen *links rudern / rechts rudern / Tempo*, gedrückt halten = rudern. Der Host simuliert das Boot, alle sehen dasselbe. 3 Felsen = gekentert, Ziel = alle 3 Punkte.
- 📳 **Schüttel-Marathon**: 5 s schütteln, live Seil zwischen den Teams.
- ⚖️ **Team-Wippe**: Wellen kippen die Brücke, Handys gegenkippen – Zeit im Gleichgewicht zählt.
- 🎡 **Kompass-Riesenrad**: im Kreis drehen, Ziel 900° pro Person, 30 s.
- 💡 **Team-Lichtblitz**: Frontkamera abdecken, Team-Schnitt der Reaktionszeit.
- 🧮 **Mathe-Staffel**: einer nach dem anderen, gleiche 6 Aufgaben, Server-Zeit entscheidet.
- 🎯 **Touch-Parcours**: Kugel steht beim Schnitt aller Schieberegler des Teams, 3 Leben.
- 🧠 **Team-Mehrheits-Duell**: größter Anteil exakt gleicher Begriffe im Team gewinnt.

## 📺 Hauptbildschirm-Spiele (TV/Laptop + Handys als Controller)

Nur verfügbar, wenn der Raum mit **Hauptbildschirm** erstellt wurde (Gruppen-Modus & Bibliotheks-Lobby, ab 2 Spielern). Der große Bildschirm zeigt das Geschehen im farbenfrohen Konsolen-Look, die Handys sind helle, aufgeräumte Controller.
- 🎙️ **Die Live-Quiz-Show**: Spielbrett mit 3 Kategorien × 100/200/300. Buzzer am Handy (Server-Zeit entscheidet), wer zuerst drückt, antwortet (A–D). Richtig = Wert, falsch = −½ Wert und gesperrt, die anderen dürfen nachbuzzern. Wer richtig lag, wählt das nächste Feld.
- ⛳ **Party-Minigolf**: 3 Bahnen (Wände, Bumper, Sand), alle gleichzeitig. Schleuder-Mechanik am Handy (zurückziehen & loslassen), der Ball rollt auf dem TV. Max. 6 Schläge pro Bahn, wenige Schläge gewinnen.
- 🚀 **Raumschiff-Chaos** (kooperativ): Jedes Handy ist ein anderes Schaltpult (Schalter, Knöpfe, Regler 0–3). Befehle erscheinen meist bei jemand anderem – laut zurufen! Erledigt = Kurs zum Planeten, verpasst = Hüllenschaden. Landung = alle 3 Punkte.
- 🔨 **Das Biet-Duell**: 5 Runden, 20 Münzen, verdeckte Gebote. Höchstes Gebot gewinnt (Gleichstand: alle Höchstbietenden), Gebote sind weg. Live-Preiskurve auf dem TV. Meiste Gegenstände gewinnen (Münzen als Tiebreak).
- 🏎️ **Party-Rennen**: Rundkurs aus der Vogelperspektive, 3 Runden. Handy: ◀ ▶ und ⚡ Boost (am PC Pfeiltasten + Leertaste). Öl = Schleudern, Hütchen = Bremse, Blitze = Boost auffüllen.
- 🔍 **Wimmelbild-Rennen**: Riesiges Wimmelbild (aus dem Seed auf allen Geräten identisch). Gesucht: z. B. „Pinguin mit Krone“. Am Handy zoomen/verschieben und antippen – der schnellste Treffer (Server-Zeit) holt den Punkt, falsch = 2 s Sperre.

**Echtzeit-Architektur** (`rooms/{code}/rounds/{id}`):

| Feld | Wer schreibt | Inhalt |
|---|---|---|
| `game` | Host beim Start | fester Startzustand aus dem Seed (Fragen, Bahnen, Strecke, Wimmelbild …) |
| `results.{uid}` | **nur das eigene Handy** (Firestore-Regeln) | Eingaben: Buzzer `{k, at: serverTimestamp}`, Schläge, Schalter, Gebote, Lenkung |
| `sim` | **nur der Hauptbildschirm** (Regie) | Phase, Timer, Punkte, Positionen – 10 Hz gerechnet, nur bei Änderung geschrieben (Rennen ≤ 5×/s) |

Die Regie (`director.start / tick`) ist pro Spiel eine reine Funktion ohne Firebase – dadurch komplett mit Vitest getestet (`tests/screen.test.js`). Lädt der Hauptbildschirm neu, geht es mit `round.sim` weiter. Soundeffekte (Buzzer, Auktions-Hammer, Renn-Jingle, Ticken) spielt der Hauptbildschirm.

## 🔁 Wiederspielen: Crew, Rekorde & Spiel der Woche

- **Revanche:** Am Ende startet der Host mit einem Tipp eine neue Party mit denselben Einstellungen – alle Handys treten automatisch bei (`room.rematch`).
- **Crew-Bilanz (ohne Anmeldung):** Gleiche Spielernamen = gleiche Crew (`crews/{crewId}`). Ewige Tabelle, Siegesserie, direkter Vergleich und Sätze wie „Nur noch 1 Sieg bis zum Gleichstand mit Ben!“ auf dem Endbildschirm.
- **Rekorde:** Persönliche Bestwerte pro Spiel (je Crew-Mitglied) mit „🔥 NEUER REKORD!“ und eine **Wochen-Bestenliste** (Top 5) je Spiel über alle Partys (`weekRecords/{2026-W45}`).
- **16 Abzeichen** (z. B. Hattrick, Portal-Pirat, Rekordjäger, Erzrivale) mit Fortschritt „🎖️ 3/16“.
- **Spiel der Woche & Wochen-Regel** (aus der Kalenderwoche, auf allen Geräten gleich): Das Spiel der Woche eröffnet jede Party und zählt doppelt. Regeln: 💥 Chaos (doppelt so viele Sonderfelder), 🚀 Raketen (+5), ⚡ Speed (kürzere Wartezeiten), 🐢 Underdog (Bonus für den Letzten), 💰 Jackpot (jede 3. Runde doppelt).
- Logik rein & getestet: `src/game/crew.js`, `src/game/weekly.js` (`tests/crew.test.js`), Firestore-Teil in `src/game/crewEngine.js`.

## 🤫 Stealth-/Uni-Modus

Der Modus lässt sich beim Erstellen jeder Party und der Bibliotheks-Lobby einschalten. Es gibt dann nur **leise, unauffällige Spiele** (Flag `quiet`): kein Rufen, kein Aufstehen, kein Ton nötig. Dazu gehören z. B. Der fliegende Teppich, Wasserwaage, Kopfrechnen, Zahlen-Merker, die Arcade-Spiele, „Wer am ehesten“ und das Beicht-Quiz. Alle Geräte der Party sind lautlos (Vibration bleibt), die Ketten-Story wird nicht vorgelesen, und Live-Events sind aus. In der Bibliotheks-Lobby filtert „🤫 Leise“ die Auswahl.

## Abwechslung über alle Partys

Die App zählt in Firestore (`gameStats`, ein Dokument pro Tag), wie oft jedes Spiel **in allen Partys** gespielt wurde. Bei jeder Auswahl gewinnen die Spiele, die in den **letzten 7 Tagen am wenigsten** gespielt wurden. Party, Spielfeld und Gruppe werten das automatisch aus. Die Bibliothek zeigt die meist- und wenigstgespielten Spiele der Woche.

## Sprachen

**Deutsch** und **Englisch**, umschaltbar auf der Startseite und über den 🌐-Knopf auf jedem Bildschirm. Die Sprache gilt **pro Gerät**: In einer Party kann jeder Spieler seine eigene Sprache nutzen, Spielinhalte wie Fragen und Rätsel erscheinen auf jedem Handy in dessen Sprache. Beim ersten Start wird die Browser-Sprache übernommen.

- `src/i18n/index.js`: `t('Deutscher Text', { platzhalter })`. Der deutsche Text ist der Schlüssel
- `src/i18n/en.js`: englische Übersetzungen
- `tests/i18n.test.js`: prüft, dass jeder Text im Code und jeder Spielinhalt eine englische Fassung hat und die Platzhalter übereinstimmen

Weitere Sprache hinzufügen: in `LANGS` eintragen, ein Wörterbuch wie `en.js` anlegen und in `t()` auswählen.

## Features

- **Zwei Host-Modi:** 📺 Hauptbildschirm (Laptop/TV) + Handys als Controller, oder 📱 nur Handys per Raumcode (Host spielt mit)
- **Lobby:** feste Spieleranzahl, Utensilien-Filter (Kartendeck, Münzen, Würfel, Becher, nichts), QR-Code zum Beitreten
- **Wirtschaft:** 20 Schlücke Start, automatischer Pflicht-Einsatz für Duellanten, Zuschauerwetten
  - **Verlierer** trinken ihren Einsatz
  - **Gewinner** bekommen ihren Einsatz zurück und **verteilen** in echt genauso viele Schlücke (beim Außenseiter-Tipp doppelt so viele)
  - **Finale:** Wer am Ende die meisten Schlücke hat, darf alle seine verbleibenden verteilen
- **Live-Sync für Tablets:** Bildschirm bleibt an (Wake Lock), sofortiges Neuverbinden nach Standby/Hintergrund, Banner bei Verbindungsverlust
- **Pleite-Regel:** Notfall-Aufgabe, peinliches Video, Kredit bei Mitspielern (+50 % Zinsen) oder Bank-Darlehen. Schulden werden automatisch aus Gewinnen getilgt
- **26 Spiele in 9 Kategorien:**
  - 🌍 Überall spielbar (ohne Utensilien & Sensoren): Mentale Stoppuhr, Blitz-Kopfrechnen, Wortketten-Duell, Formel-1-Frühstart, Geheime Zahlen knacken, Assoziations-Blitz, Kategorie-Sprint, Zahlen-Merker, Echtes Schere-Stein-Papier (K.-o.-Turnier)
  - Real-Life: Farb-Sprint, Der fliegende Teppich (Handy-Balance)
  - Digital: Speed-Tap (Split-Screen), Memory-Code, Emoji-Hit-Raten
  - Multi-Device: Schätz-Duell
  - 🕹️ Arcade (Canvas, gleicher Parcours für alle): Pixel-Sprint (Endless-Runner), Block-Stacker (Turm-Stapler), Weitsprung-Challenge (Tempo und Winkel timen), Vertikal-Jumper (Plattformen, Steuern per Neigen oder Drücken)
  - Sensor: Schüttel-Manie, Kompass-Axt, Die virtuelle Wasserwaage (Gyroskop), Der Tresor-Dreher (Kompass, 360°-Drehung), Der Höhen-Strecker (Beschleunigung, Hub geschätzt), Der Lichtsensor-Blitz (Umgebungslicht-Sensor, sonst Frontkamera als Lichtmesser), Das Kugel-Labyrinth (Neigung)
  - Frontkamera: Starr-Duell (Blinzel-/Lach-Erkennung per MediaPipe Face-Tracking)
  - Audio: Rhythmus-Echo
  - Social: Wahrheit oder Bluff
  - Utensilien: Kartenduell, Bluff-Karten-Duell, Münz-Orakel, Münz-Sprint, Würfel-Showdown, Becher-Flip
- **⚡ Spontane Live-Events:** Zwischen den Duellen (35 % Chance bei „Nächstes Duell“ oder per Knopf) erscheint auf allen Geräten gleichzeitig ein Vollbild-Alarm: „Der Boden ist Lava!“, „Statue!“, „An die Nase!“, „Handy-Tausch!“ oder „Farb-Ansturm!“. Nach 3 Sekunden tippt der Host den Langsamsten an. Bei „Statue!“ messen die Handys per Sensor, wer sich zuerst bewegt. Wer verliert, trinkt 5 Schlücke. Abschaltbar beim Erstellen
- **📚 Bibliothek:** oben **Lobby erstellen** – erst treten alle per Raumcode bei (auch später noch jederzeit), dann wählt der Host frei Spiele aus, die zur Spielerzahl und den Geräten passen (beliebig oft, alle gleichzeitig, 3/2/1 Punkte; „Nochmal“ / „Anderes Spiel“, am Ende Wrapped). Darunter alle Spiele nach Kategorie oder Spieleranzahl, mit **Übungsmodus** auf einem Gerät
- **Jedes Spiel nur einmal pro Party:** Die Anzahl Duelle ist auf die verfügbaren Spiele begrenzt
- **Phasen:** Warm-up → Chaos-Runde (Alarm-Screen, Einsätze ×2) → Sudden Death (Doom-Screen, ×3, die zwei Führenden)
- **Power-ups:** 🛡️ Schild, ✌️ Double-Down, 🧪 Sabotage-Trank, 🔄 Joker-Tausch. Große Karten mit „So funktioniert's“, Zeitpunkt und Rechenbeispiel; Antippen der Power-ups in der Kopfzeile öffnet die Erklärung aller Booster
- **Party-Wrapped:** Story-Karten mit Wett-König, Pechvogel, Saboteur, High Roller, Pleitegeier, …
- **Sounds:** per WebAudio synthetisiert (Countdown, Gong, Tusch, Wett-Jingle, Alarm). Keine Audio-Dateien nötig

## Werbung, Impressum & Datenschutz

Google AdSense ist vorbereitet (Anzeigen nur auf ruhigen Seiten, `ads.txt`, Bestätigungs-Tag) und ist abgeschaltet, solange keine Publisher-ID gesetzt ist. Impressum (`#/impressum`) und Datenschutz (`#/datenschutz`) sind eingebaut, die Schrift wird lokal ausgeliefert. Die Einrichtung Schritt für Schritt steht in **[docs/ADSENSE.md](docs/ADSENSE.md)**.

## Ordnerstruktur

```
├── index.html                 Vite-Einstieg
├── firebase.json              Hosting (SPA-Rewrite) + Emulator-Config
├── firestore.rules            Security Rules (Host-Autorität, eigene Keys)
├── docs/DATABASE.md           Firestore-Datenmodell & Autoritäts-Modell
├── docs/ADSENSE.md            Werbung einrichten (AdSense, Domain, Einwilligung)
├── tests/                     Vitest: Wirtschaft, Spielfeld, Gruppen-Ranking, Live-Events, Auswertung, Wrapped
└── src/
    ├── main.jsx · App.jsx     Hash-Routing: #/ · #/create · #/join/CODE · #/host/CODE · #/play/CODE
    ├── firebase.js            Init, anonyme Anmeldung, Emulator-Schalter
    ├── game/                  ★ Spiellogik (framework-unabhängig)
    │   ├── constants.js       Startguthaben, Phasen, Power-ups, Rettungen
    │   ├── gameLibrary.js     Spielebibliothek + Filter + Auto-Auswertung
    │   ├── economy.js         Einsätze sperren, Quoten, Auszahlung (pure Functions)
    │   ├── engine.js          Firestore-Transaktionen: Raum, Duelle, Rettungen, Live-Events
    │   ├── board.js           Spielfeld-Modus: Feld erzeugen, Platzierung → Zug, Sonderfelder (pure)
    │   ├── board3d.js         3D-Karte: Pfad, Deko, Iso-Projektion (pure)
    │   ├── boardEngine.js     Spielfeld-Modus: Gruppen-Challenges & Züge in Firestore
    │   ├── liveEvents.js      Live-Event-Katalog & Trigger-Regeln
    │   ├── group.js           Gruppen-Modus: Gruppen-Spiele, Bibliothek je Modus, Punkte (pure)
    │   ├── groupEngine.js     Gruppen-Modus: Runden & Punkte in Firestore
    │   ├── screen/            📺 Hauptbildschirm-Spiele: Logik & Regie (pure, getestet)
    │   │   ├── index.js       Registrierung (GAMES, Kategorie) + DIRECTORS
    │   │   ├── common.js      Echtzeit-Modell, Auswertung, Server-Zeit-Helfer
    │   │   └── quizShow.js · minigolf.js · spaceship.js · auction.js · racer.js · hiddenObject.js
    │   └── wrapped.js         Statistik → Wrapped-Karten (Party & Spielfeld)
    ├── hooks/                 useRoom (Realtime-Abo), usePhaseFx, Countdown, Auth
    ├── components/            Lobby, DuelVs, BetPanel, PowerupPanel, HostControls, Rescue, LiveEventOverlay, …
    │   ├── board/             Board3D (isometrische Karte & Themen), Dice (Würfel), BoardRound, BoardHostControls
    │   └── group/             GroupRound, PointsBoard, GroupHostControls, useHostSim, useScreenDirector (Regie-Schleife)
    ├── minigames/             Ein Modul pro Spiel: { Play, Stage, Review, GroupPlay?, GroupStage? } + format.js
    │   └── screen/            📺 TV-Ansicht (Stage) + Handy-Controller (Play) je Hauptbildschirm-Spiel, ui.jsx (Konsolen-Look)
    ├── screens/               Home, CreateRoom, JoinRoom, HostScreen, PlayerController, Wrapped, Library, Practice
    ├── i18n/                  Übersetzungen (Deutsch/Englisch), t(), Sprachwahl
    ├── lib/                   Sound, Seed-RNG, Router, Geräte-Fähigkeiten
    └── styles/global.css      Design-Tokens: Off-White, dynamische --accent-Farbe
```

## Setup

Die App läuft auf **GitHub Pages** (Frontend) und nutzt **Firebase** nur als Datenbank und Anmeldung.
Live-URL: **https://n0ahwag.github.io/PartyBet/**

### 1. Firebase vorbereiten (einmalig, alles in der [Firebase-Konsole](https://console.firebase.google.com/))

1. Projekt `partybe-d44b7` öffnen
2. **Build → Firestore Database → Datenbank erstellen** (Standort z. B. `europe-west1`, Produktionsmodus)
3. **Firestore → Regeln**: Inhalt von [`firestore.rules`](firestore.rules) einfügen und **Veröffentlichen**
4. **Build → Authentication → Anmeldemethode → Anonym** aktivieren
5. **Authentication → Einstellungen → Autorisierte Domains**: `n0ahwag.github.io` hinzufügen

### 2. GitHub Pages aktivieren (einmalig)

Im Repo: **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.

Ab dann baut und veröffentlicht der Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
die App bei jedem Push auf `main` automatisch (inkl. Tests). Manuell starten:
**Actions → Deploy to GitHub Pages → Run workflow**.

Ohne `.env` nutzt die App das Firebase-Projekt `partybe-d44b7`. Die Web-Config ist nicht geheim, geschützt wird über die Firestore-Regeln.

### Lokal entwickeln (optional)

```bash
npm install
```

```bash
npm run dev
```

### Tests

```bash
npm test
```

### Alternative: Firebase Hosting

```bash
npm run deploy
```

Baut nach `dist/` und deployt Hosting und Firestore-Regeln (braucht `firebase login`).

## Spielablauf

1. Host erstellt die Party (Modus, Spieleranzahl, Utensilien, Anzahl Duelle)
2. Spieler treten per Code/QR bei. Start, sobald alle da sind
3. Pro Duell: **Intro** – Spiel und Regeln stehen auf allen Geräten fest, bevor gewettet wird (Joker-Tausch möglich) → **Wetten** (25 s, Power-ups) → **Spiel** → **Review** → **Auszahlung** („Trink X Schlücke!")
4. Bei Real-Life-Spielen tippt der Host den Gewinner an, digitale Spiele werden automatisch ausgewertet
5. Nach dem Sudden-Death-Duell kommt das Party-Wrapped

> Bitte verantwortungsvoll trinken. Schlücke können auch Wasser sein 💧
