# Firestore-Datenbankstruktur

Alle Daten einer Party liegen unter **einem Raum-Dokument** mit vier Subcollections.
Jedes Gerät meldet sich per **Firebase Anonymous Auth** an; die UID ist gleichzeitig
die `playerId` (bzw. `hostId` beim TV).

```
rooms/{CODE}                         ← 4-stelliger Raumcode, z. B. "KXQP"
├── players/{uid}                    ← ein Dokument pro Spieler
├── duels/{r01, r02, …}              ← ein Dokument pro Duell / Runde
├── rescues/{autoId}                 ← Pleite-Rettungen (Aufgabe, Video, Kredit, Bank)
└── events/{autoId}                  ← Protokoll für das Party-Wrapped
```

## `rooms/{CODE}`

| Feld | Typ | Beschreibung |
|---|---|---|
| `code` | string | Raumcode |
| `hostId` | string | UID des Host-Geräts (TV oder Host-Handy) |
| `mode` | `'screen' \| 'mobile'` | Hauptbildschirm + Controller **oder** nur Handys |
| `status` | `'lobby' \| 'playing' \| 'finished'` | |
| `expectedPlayers` | number | Festgelegte Spieleranzahl |
| `equipment` | string[] | `cards`, `coins`, `dice`, `cups` (leer = gar nichts) |
| `library` | string[] | Game-IDs nach Filter (Spieleranzahl + Utensilien) |
| `totalRounds` | number | Anzahl Duelle |
| `round` | number | Aktuelle Runde (1-basiert) |
| `phase` | `'warmup' \| 'chaos' \| 'suddenDeath'` | |
| `phaseChangedAt` | number (ms) | Löst auf allen Geräten den Alarm-Screen aus |
| `currentDuelId` | string \| null | Zeigt auf `duels/{id}` |
| `lastGameId`, `lastDuelists` | | Damit nicht dasselbe Spiel bzw. Paar direkt wiederkommt |

## `rooms/{CODE}/players/{uid}`

| Feld | Typ | Beschreibung |
|---|---|---|
| `name`, `avatar`, `color` | string | |
| `balance` | number | Schlücke, Start = **20** |
| `inventory` | `{ shield, doubleDown, sabotage, joker }` | Anzahl Power-ups (1 zufälliges zum Start, +1 pro Duellsieg) |
| `debts` | `[{ to: uid \| 'bank', amount }]` | Werden automatisch aus Gewinnen getilgt |
| `bankrupt` | bool | `balance == 0` |
| `caps` | `{ touch, motion }` | Gerätefähigkeiten (Gyroskop → Handy-Balance) |
| `isHost` | bool | |
| `stats` | object | `duelsWon/Lost`, `betsWon/Lost`, `betProfit`, `sipsDrunk`, `sipsWon`, `sabotages`, `sabotaged`, `bankruptcies`, `biggestBet`, `powerupsUsed`, `shieldSaves`, `rescues`, `loansGiven` |

## `rooms/{CODE}/duels/{id}`

| Feld | Geschrieben von | Beschreibung |
|---|---|---|
| `round`, `phase`, `gameId` | Host | |
| `game` | Host | Spielzustand aus einem Seed (Farbe, Code, Frage, Tap-Verzögerungen …) |
| `playerA`, `playerB` | Host | Duellanten |
| `stage` | Host | `intro → betting → playing → review → resolved` |
| `bettingEndsAt` | Host | Countdown-Ende (ms) |
| `bets.{uid}` | **Zuschauer** (nur eigener Key) | `{ on, amount }` (Roh-Einsatz) |
| `powerups.{uid}` | **Spieler** (nur eigener Key) | `{ type, target }` (Absicht) |
| `results.{key}` | **Duellanten** | Spiel-Ergebnis (`{input, ms}`, `{guess}`, `{wobble}`, `shared.rounds`) |
| `stakes`, `bets`, `odds` | Host beim Sperren | Effektive (×Phase) Einsätze, Quoten 2 / 3 |
| `activePowerups`, `sabotage`, `jokerSwap` | Host | Geprüfte Power-ups |
| `winnerId` | Host / Auto-Auswertung | `null` = Unentschieden |
| `settlement` | Host | `{ credits, net, outcome, repayments, reward }` |

## `rooms/{CODE}/rescues/{id}`

| Feld | Beschreibung |
|---|---|
| `playerId` | Pleite-Spieler |
| `type` | `task` · `video` · `loan` · `borrow` |
| `prompt` | Zufällige Aufgabe / Video-Ansage |
| `lenderId`, `amount` | Bei Kredit |
| `status` | `pending` → `approved/rejected`; Kredit: `asked` → `accepted/declined` (Kreditgeber) → `approved` (Host) |

## `rooms/{CODE}/events/{id}`

Ein Eintrag pro abgerechnetem Duell (`type: 'duel'`, Gewinner, Netto pro Spieler,
Sabotage). Grundlage für Statistiken im Wrapped.

---

## Autoritäts-Modell (wer darf was?)

```
 Spieler-Handy                     Firestore                       Host-Gerät
 ─────────────                     ─────────                       ──────────
 Wette / Power-up / Ergebnis ──►  duels/{id}.bets|powerups|results
 Rettungsanfrage ─────────────►  rescues/{id}
                                        │  onSnapshot
                                        ▼
                                  Host liest alles, rechnet ──►  runTransaction:
                                                                   Guthaben, Stage,
                                                                   Statistiken, Events
```

* **Kontostände ändert ausschließlich der Host** – immer in `runTransaction`, damit
  parallele Wetten/Rettungen nicht kollidieren.
* Spieler schreiben nur „Absichten" unter ihrem eigenen Map-Key; `firestore.rules`
  erzwingt das (`onlyOwnKey`, Stage-Prüfungen).
* Einsätze werden erst beim **Sperren** abgebucht (Escrow) und dabei auf das Guthaben
  gekappt – Spieler können also nicht mehr setzen als sie haben.
* **Produktions-Ausbau:** Die Host-Transaktionen (`src/game/engine.js`) lassen sich
  1:1 in Cloud Functions verschieben, dann ist auch ein manipulierter Host-Client kein Problem.
