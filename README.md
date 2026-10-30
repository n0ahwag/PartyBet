# ⚔️🍺 FaceOff Party

Realtime-Party-Spiel als Mobile-First Web-App: Zwei Spieler werden zum Duell ausgelost,
alle anderen wetten Schlücke. **Vite + React + Firebase (Firestore, Anonymous Auth, Hosting).**

## Features

- **Zwei Host-Modi:** 📺 Hauptbildschirm (Laptop/TV) + Handys als Controller, oder 📱 nur Handys per Raumcode (Host spielt mit)
- **Lobby:** feste Spieleranzahl, Utensilien-Filter (Kartendeck, Münzen, Würfel, Becher, nichts), QR-Code zum Beitreten
- **Wirtschaft:** 20 Schlücke Start, automatischer Pflicht-Einsatz für Duellanten, Zuschauerwetten
  - **Verlierer** trinken ihren Einsatz
  - **Gewinner** bekommen ihren Einsatz zurück und **verteilen** in echt genauso viele Schlücke (beim Außenseiter-Tipp doppelt so viele)
  - **Finale:** Wer am Ende die meisten Schlücke hat, darf alle seine verbleibenden verteilen
- **Live-Sync für Tablets:** Bildschirm bleibt an (Wake Lock), sofortiges Neuverbinden nach Standby/Hintergrund, Banner bei Verbindungsverlust
- **Pleite-Regel:** Notfall-Aufgabe, peinliches Video, Kredit bei Mitspielern (+50 % Zinsen) oder Bank-Darlehen. Schulden werden automatisch aus Gewinnen getilgt
- **17 Spiele in 8 Kategorien:**
  - Real-Life: Farb-Sprint, Handy-Balance
  - Digital: Speed-Tap (Split-Screen), Memory-Code, Emoji-Hit-Raten
  - Multi-Device: Schätz-Duell
  - Sensor: Schüttel-Manie, Kompass-Axt
  - Frontkamera: Starr-Duell (Blinzel-/Lach-Erkennung per MediaPipe Face-Tracking)
  - Audio: Rhythmus-Echo
  - Social: Wahrheit oder Bluff
  - Utensilien: Kartenduell, Bluff-Karten-Duell, Münz-Orakel, Münz-Sprint, Würfel-Showdown, Becher-Flip
- **⚡ Spontane Live-Events:** Zwischen den Duellen (35 % Chance bei „Nächstes Duell“ oder per Knopf) erscheint auf allen Geräten gleichzeitig ein Vollbild-Alarm: „Der Boden ist Lava!“, „Statue!“, „An die Nase!“, „Handy-Tausch!“ oder „Farb-Ansturm!“. Nach 3 Sekunden tippt der Host den Langsamsten an. Bei „Statue!“ messen die Handys per Sensor, wer sich zuerst bewegt. Wer verliert, trinkt 5 Schlücke. Abschaltbar beim Erstellen
- **📚 Bibliothek:** alle Spiele nach Kategorie oder Spieleranzahl, mit **Übungsmodus** ohne ganze Runde (Hot-Seat auf einem Gerät, läuft ohne Anmeldung)
- **Phasen:** Warm-up → Chaos-Runde (Alarm-Screen, Einsätze ×2) → Sudden Death (Doom-Screen, ×3, die zwei Führenden)
- **Power-ups:** 🛡️ Schild, ✌️ Double-Down, 🧪 Sabotage-Trank, 🔄 Joker-Tausch
- **Party-Wrapped:** Story-Karten mit Wett-König, Pechvogel, Saboteur, High Roller, Pleitegeier, …
- **Sounds:** per WebAudio synthetisiert (Countdown, Gong, Tusch, Wett-Jingle, Alarm). Keine Audio-Dateien nötig

## Ordnerstruktur

```
├── index.html                 Vite-Einstieg
├── firebase.json              Hosting (SPA-Rewrite) + Emulator-Config
├── firestore.rules            Security Rules (Host-Autorität, eigene Keys)
├── docs/DATABASE.md           Firestore-Datenmodell & Autoritäts-Modell
├── tests/                     Vitest: Wirtschaft, Filter, Auswertung, Wrapped
└── src/
    ├── main.jsx · App.jsx     Hash-Routing: #/ · #/create · #/join/CODE · #/host/CODE · #/play/CODE
    ├── firebase.js            Init, anonyme Anmeldung, Emulator-Schalter
    ├── game/                  ★ Spiellogik (framework-unabhängig)
    │   ├── constants.js       Startguthaben, Phasen, Power-ups, Rettungen
    │   ├── gameLibrary.js     Spielebibliothek + Filter + Auto-Auswertung
    │   ├── economy.js         Einsätze sperren, Quoten, Auszahlung (pure Functions)
    │   ├── engine.js          Alle Firestore-Schreibvorgänge / Transaktionen
    │   └── wrapped.js         Statistik → Wrapped-Karten
    ├── hooks/                 useRoom (Realtime-Abo), usePhaseFx, Countdown, Auth
    ├── components/            Lobby, DuelVs, BetPanel, PowerupPanel, HostControls, Rescue, …
    ├── minigames/             Ein Modul pro Spiel: { Play, Stage, Review }
    ├── screens/               Home, CreateRoom, JoinRoom, HostScreen, PlayerController, Wrapped, Library, Practice
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
3. Pro Duell: **Intro** (Joker-Tausch möglich) → **Wetten** (25 s, Power-ups) → **Spiel** → **Review** → **Auszahlung** („Trink X Schlücke!")
4. Bei Real-Life-Spielen tippt der Host den Gewinner an, digitale Spiele werden automatisch ausgewertet
5. Nach dem Sudden-Death-Duell kommt das Party-Wrapped

> Bitte verantwortungsvoll trinken. Schlücke können auch Wasser sein 💧
