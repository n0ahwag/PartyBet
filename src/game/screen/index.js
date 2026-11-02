import { GAMES, CATEGORIES } from '../gameLibrary.js';
import { quizDirector, quizCreateState } from './quizShow.js';
import { golfDirector, golfCreateState } from './minigolf.js';
import { shipDirector, shipCreateState } from './spaceship.js';
import { auctionDirector, auctionCreateState } from './auction.js';
import { raceDirector, raceCreateState } from './racer.js';
import { hiddenDirector, hiddenCreateState } from './hiddenObject.js';

/*
 * Hauptbildschirm-Spiele 📺: laufen nur, wenn ein zentraler Bildschirm (TV/Laptop/Tablet)
 * dabei ist (room.mode === 'screen'). Der Bildschirm zeigt das Geschehen, die Handys sind Controller.
 *
 *   src/game/screen/       Spiellogik & Regie (rein, testbar)
 *   src/minigames/screen/  Ansichten: Stage (Hauptbildschirm) · Play (Handy-Controller) · Result
 *   src/components/group/useScreenDirector.js  Regie-Schleife auf dem Hauptbildschirm
 */

CATEGORIES.screen = { label: 'Hauptbildschirm-Spiele', icon: '📺' };

const base = { kind: 'screen', judge: 'auto', groupOnly: true, needsScreen: true, minPlayers: 2, devices: 'own', equipment: [] };

Object.assign(GAMES, {
  quizShow: {
    ...base, id: 'quizShow', name: 'Die Live-Quiz-Show', icon: '🎙️', accent: '#7C3AED', quiet: true,
    rules: 'Quiz-Show wie im Fernsehen: Auf dem Bildschirm steht ein Spielbrett mit 3 Kategorien. Wer zuerst auf dem Handy buzzert, darf antworten – richtig gibt den Wert (100–300), falsch kostet die Hälfte. Wer richtig lag, wählt das nächste Feld.',
    createState: quizCreateState,
  },
  minigolf: {
    ...base, id: 'minigolf', name: 'Party-Minigolf', icon: '⛳', accent: '#16A34A', quiet: true,
    rules: 'Drei Bahnen, alle spielen gleichzeitig. Zieh auf dem Handy wie eine Schleuder zurück und lass los – der Ball rollt auf dem großen Bildschirm. Wenige Schläge gewinnen (höchstens 6 pro Bahn).',
    createState: golfCreateState,
  },
  spaceship: {
    ...base, id: 'spaceship', name: 'Raumschiff-Chaos', icon: '🚀', accent: '#0EA5E9',
    rules: 'Ihr steuert gemeinsam ein Raumschiff! Jedes Handy ist ein anderes Schaltpult. Auf deinem Handy steht ein Befehl – meist für einen Schalter, den jemand anderes hat. Ruft euch die Befehle laut zu! Erledigte Befehle bringen euch ans Ziel, verpasste beschädigen die Hülle.',
    createState: shipCreateState,
  },
  auction: {
    ...base, id: 'auction', name: 'Das Biet-Duell', icon: '🔨', accent: '#B45309', quiet: true,
    rules: 'Fünf absurde Gegenstände kommen unter den Hammer. Jeder hat 20 Münzen für alle Runden und bietet verdeckt am Handy. Das höchste Gebot gewinnt (bei Gleichstand alle Höchstbietenden) – Gebote sind immer weg. Wer am Ende die meisten Gegenstände hat, gewinnt.',
    createState: auctionCreateState,
  },
  partyRacer: {
    ...base, id: 'partyRacer', name: 'Party-Rennen', icon: '🏎️', accent: '#DC2626',
    rules: 'Alle Autos fahren auf einer Strecke, die ganz auf dem Bildschirm zu sehen ist. Am Handy lenkst du links/rechts und zündest den Boost. Öl lässt dich schleudern, Hütchen bremsen, Blitze füllen den Boost. 3 Runden – wer zuerst im Ziel ist, gewinnt.',
    createState: raceCreateState,
  },
  hiddenObject: {
    ...base, id: 'hiddenObject', name: 'Wimmelbild-Rennen', icon: '🔍', accent: '#DB2777', quiet: true,
    rules: 'Auf dem Bildschirm ist ein riesiges Wimmelbild. Gesucht wird eine bestimmte Figur – z. B. ein Pinguin mit Krone. Such sie auf deinem Handy (zoomen & verschieben) und tipp sie an. Wer sie zuerst findet, holt den Punkt. Falsch getippt = 2 Sekunden Pause.',
    createState: hiddenCreateState,
  },
});

export const SCREEN_GAME_IDS = ['quizShow', 'minigolf', 'spaceship', 'auction', 'partyRacer', 'hiddenObject'];

/** Regie je Spiel: start(round, now) → sim · tick(sim, round, now) → { sim, done? } */
export const DIRECTORS = {
  quizShow: quizDirector,
  minigolf: golfDirector,
  spaceship: shipDirector,
  auction: auctionDirector,
  partyRacer: raceDirector,
  hiddenObject: hiddenDirector,
};
