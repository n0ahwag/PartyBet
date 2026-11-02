import { QuizShow } from './QuizShow.jsx';
import { Minigolf } from './Minigolf.jsx';
import { Spaceship } from './Spaceship.jsx';
import { Auction } from './Auction.jsx';
import { PartyRacer } from './PartyRacer.jsx';
import { HiddenObject } from './HiddenObject.jsx';

/** Hauptbildschirm-Spiele: gameId → { Stage (TV), Play (Handy-Controller) } – Schnittstelle wie GROUP_GAMES. */
export const SCREEN_GAMES = {
  quizShow: QuizShow,
  minigolf: Minigolf,
  spaceship: Spaceship,
  auction: Auction,
  partyRacer: PartyRacer,
  hiddenObject: HiddenObject,
};
