# Firestore-Datenbankstruktur

Alle Daten einer Party liegen unter **einem Raum-Dokument** mit vier Subcollections.
Jedes Gerät meldet sich per **Firebase Anonymous Auth** an; die UID ist gleichzeitig
die `playerId` (bzw. `hostId` beim TV).

```
rooms/{CODE}                         ← 4-stelliger Raumcode, z. B. "KXQP"
├── players/{uid}                    ← ein Dokument pro Spieler
├── duels/{r01, r02, …}              ← ein Dokument pro Duell / Runde
├── rescues/{autoId}                 ← Pleite-Rettungen (Aufgabe, Video, Kredit, Bank)
├── liveEvents/{e<timestamp>}        ← Spontane Live-Events (Sensor-Reaktionen der Spieler)
├── rounds/{r01, r02, …}             ← Spielfeld-Modus: Gruppen-Challenges (alle spielen)
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
| `lastGameId`, `lastDuelists` | | Damit nicht dasselbe Paar direkt wiederkommt |
| `playedGames` | string[] | Bereits gespielte Spiele – jedes Spiel nur einmal pro Party |
| `gameMode` | `'party' \| 'board' \| 'group'` | Party-, Spielfeld- oder Gruppen-Modus |
| `board` | `{ length, fields[] }` | Nur Spielfeld: `fields[i]` = `start`, `normal`, `rocket`, `portal`, `chaos`, `stumble`, `goal` |
| `currentRoundId`, `winnerId` | string | Nur Spielfeld: aktuelle Challenge, Sieger |
| `liveEvents` | bool | Live-Events an/aus |
| `liveEvent` | object \| null | Aktives Event: `{ id, type, color, status: 'active'\|'done', loserId, thenDraw, startedAt }` – alle Geräte zeigen daraus den Vollbild-Alarm |
| `lastEventRound` | number | Verhindert zwei Events direkt hintereinander |

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
| `position`, `skipNext` | number, bool | Nur Spielfeld: Feld & Aussetzen in der nächsten Runde |
| `points` | number | Nur Gruppen-Modus: Punktestand |
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

## `rooms/{CODE}/rounds/{id}` (Spielfeld- und Gruppen-Modus)

| Feld | Geschrieben von | Beschreibung |
|---|---|---|
| `gameId`, `game`, `participants` | Host | Challenge für **alle** Spieler |
| `playerA` | Host | Nur bei „Wahrheit oder Bluff“: der Erzähler |
| `stage` | Host | `intro → playing → review → resolved` |
| `results.{uid}` | **Teilnehmer** (nur eigener Key, nur `playing`) | Messwert des Spiels |
| `ranks` | Host (automatisch oder per Eingabe) | `{ uid: Platz }`, ohne Ergebnis: Platz n+1 (zieht nicht) |
| `rolls.{uid}` | **Teilnehmer** (nur eigener Key, nur `review`) | Spielfeld: „zum Würfeln angetippt“ (`true`). Die Augen stehen über `rollDiceFor(code:rundenId, uid, Platz)` fest |
| `reviewAt` | Host | Beginn der Würfel-Phase (nach 25 s würfelt die App für alle) |
| `moves` | Host beim Ziehen | `{ uid: { rank, dice: [{ kind: gold|silver|bronze|normal, value }], roll (Summe), steps, from, landed, to, field, effect, skipped } }` |
| `chaos`, `chaosDone`, `winnerId` | Host | Chaos-Feld betreten? / Sieger |
| `step`, `order`, `quizIndex`, `revealed` | Host | Gruppen-Modus, Beicht-Quiz: Sammel-/Rate-Phase |
| `points`, `multiplier` | Host | Gruppen-Modus: vergebene Punkte dieser Runde |

Gruppen-Spiele schreiben in `results.{uid}`:
- `{ vote }` (Wer am ehesten)
- `{ at: serverTimestamp }` (Synch-Test)
- `{ fact, guesses: { idx: uid } }` (Beicht-Quiz)
- `{ words: { idx: wort } }` (Ketten-Story)

Raum-Feld `board.theme`: `city | jungle | arcade` (Themen-Welt, ändert nur der Host).

Hinweis: Geheimnisse und Stimmen sind in Firestore für alle Teilnehmer lesbar. Die Anonymität gilt nur in der App-Oberfläche.

## `rooms/{CODE}/liveEvents/{id}`

| Feld | Geschrieben von | Beschreibung |
|---|---|---|
| `type`, `color`, `status`, `loserId` | Host | `lava`, `statue`, `nose`, `swap`, `color` |
| (im Raum) `liveEvent.penalty`, `.source` | Host | Spielfeld: Felder zurück (1 Live-Event, 2 Chaos-Feld) |
| `reactions.{uid}` | **Spieler** (nur eigener Key, nur solange `active`) | `{ movedAfterMs }` bei „Statue!“ |

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

## `gameStats/{YYYY-MM-DD}` (universelle Spiel-Statistik)

Ein Dokument pro Tag (UTC) über **alle** Partys: `{ counts: { gameId: n }, last, day }`.

- **Wer schreibt:** jedes Host-Gerät beim Start einer Runde bzw. eines Duells, dazu frei gewählte Spiele in der Bibliotheks-Lobby.
- **Was die Regeln erlauben:** jeder angemeldete Nutzer darf lesen. Pro Schreibvorgang darf nur **ein** Zähler um genau **1** steigen (`last` = dieses Spiel).
- **Wofür:** Die Spielauswahl (`pickGame` → `leastPlayed`) summiert die letzten 7 Tage und wählt nur unter den am wenigsten gespielten Kandidaten. Die Regel „jedes Spiel nur einmal pro Party“ gilt weiter.
- **Bei Ausfall:** Fehlt die Regel oder das Netz, wird ohne Statistik gewählt.


## Automatisches Löschen nach 1 Tag (TTL)

Jedes Dokument unter `rooms/{code}` (Raum, `players`, `duels`, `rounds`, `rescues`, `liveEvents`, `events`)
bekommt beim Anlegen das Feld `expireAt` = jetzt + 24 h (`expiry()` in `src/firebase.js`).
Firestore löscht Dokumente automatisch (meist innerhalb von 24 h nach Ablauf), sobald für jede
Sammlungsgruppe eine TTL-Richtlinie auf `expireAt` aktiv ist. Einmalig einrichten – entweder in der
Firebase-/Google-Cloud-Konsole (Firestore → TTL bzw. „Time-to-live“ → Richtlinie erstellen,
Sammlungsgruppe + Feld `expireAt`) oder per Cloud Shell:

```bash
for g in rooms players duels rounds rescues liveEvents events; do
  gcloud firestore fields ttls update expireAt --collection-group=$g --enable-ttl --project=partybe-d44b7 --async
done
```

Ein Raum wird so einen Tag nach dem Erstellen gelöscht (auch wenn noch gespielt würde).

## Kontaktformular

Nachrichten landen in `contact/{id}` (nur anlegen erlaubt, in der App nicht lesbar).
Lesen: Firebase-Konsole → Firestore → `contact`. Optional E-Mail-Weiterleitung über web3forms.com
(GitHub-Variable `CONTACT_FORM_KEY`).
