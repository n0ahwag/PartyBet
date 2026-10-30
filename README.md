# ⚔️🍺 FaceOff Party

Realtime-Party-Spiel als Mobile-First Web-App: Zwei Spieler werden zum Duell ausgelost,
alle anderen wetten Schlücke. **Vite + React + Firebase (Firestore, Anonymous Auth, Hosting).**

## Features

- **Zwei Host-Modi:** 📺 Hauptbildschirm (Laptop/TV) + Handys als Controller, oder 📱 nur Handys per Raumcode (Host spielt mit)
- **Lobby:** feste Spieleranzahl, Utensilien-Filter (Kartendeck, Münzen, Würfel, Becher, nichts), QR-Code zum Beitreten
- **Wirtschaft:** 20 Schlücke Start, automatischer Pflicht-Einsatz für Duellanten, Zuschauerwetten mit Quote ×2 (Favorit) / ×3 (Außenseiter)
- **Pleite-Regel:** Notfall-Aufgabe, peinliches Video, Kredit bei Mitspielern (+50 % Zinsen) oder Bank-Darlehen. Schulden werden automatisch aus Gewinnen getilgt
- **5 Kern-Minispiele:** Farb-Sprint, Split-Screen Speed-Tap, Handy-Balance (Gyroskop), Memory-Code, Schätz-Duell, dazu 4 Utensilien-Spiele (Kartenduell, Münz-Orakel, Würfel-Showdown, Becher-Flip)
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
    ├── screens/               Home, CreateRoom, JoinRoom, HostScreen, PlayerController, Wrapped
    ├── lib/                   Sound, Seed-RNG, Router, Geräte-Fähigkeiten
    └── styles/global.css      Design-Tokens: Off-White, dynamische --accent-Farbe
```

## Setup

```bash
npm install
```

In der [Firebase-Konsole](https://console.firebase.google.com/) für das Projekt:

1. **Firestore Database** anlegen (Region z. B. `europe-west3`)
2. **Authentication → Anmeldemethode → Anonym** aktivieren

Ohne `.env` nutzt die App das Projekt `partybe-d44b7`. Für ein anderes Projekt `.env.example` nach `.env` kopieren.

### Lokal entwickeln

```bash
npm run dev
```

Die App läuft auf `http://<deine-IP>:5173`, damit Handys im selben WLAN beitreten können.

### Komplett offline mit Emulatoren (braucht Java)

```bash
npm i -g firebase-tools
```

```bash
npm run emulators
```

```bash
VITE_USE_EMULATOR=true VITE_FIREBASE_PROJECT_ID=demo-faceoff npm run dev
```

(Den Emulator dann mit `--project demo-faceoff` starten, damit die Projekt-IDs übereinstimmen.)

### Tests

```bash
npm test
```

### Deploy

```bash
firebase login
```

```bash
npm run deploy
```

Baut nach `dist/` und deployt Hosting + Firestore-Rules.

## Spielablauf

1. Host erstellt die Party (Modus, Spieleranzahl, Utensilien, Anzahl Duelle)
2. Spieler treten per Code/QR bei. Start, sobald alle da sind
3. Pro Duell: **Intro** (Joker-Tausch möglich) → **Wetten** (25 s, Power-ups) → **Spiel** → **Review** → **Auszahlung** („Trink X Schlücke!")
4. Bei Real-Life-Spielen tippt der Host den Gewinner an, digitale Spiele werden automatisch ausgewertet
5. Nach dem Sudden-Death-Duell kommt das Party-Wrapped

> Bitte verantwortungsvoll trinken. Schlücke können auch Wasser sein 💧
