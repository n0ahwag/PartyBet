import { finishByScore } from './common.js';

/*
 * Das Biet-Duell: 5 Runden, jeder startet mit 20 Münzen und bietet verdeckt am Handy.
 * Höchstes Gebot gewinnt den Gegenstand – bei Gleichstand bekommen ihn alle Höchstbietenden.
 * Gebote sind weg, egal ob man gewinnt (wie Blind-Auktion). Wer nach 5 Runden die meisten
 * Gegenstände hat, gewinnt; bei Gleichstand entscheiden die übrigen Münzen.
 *
 * Eingaben: results.{uid}.b0 … b4 (Gebot je Runde)
 */

export const AUCTION = { rounds: 5, coins: 20, bidMs: 25000, revealMs: 5500 };

export const AUCTION_ITEMS = [
  { icon: '🦆', name: { de: 'Goldene Gummiente', en: 'Golden rubber duck' } },
  { icon: '🍞', name: { de: 'Signierter Toaster', en: 'Signed toaster' } },
  { icon: '🧦', name: { de: 'Einzelne Glückssocke', en: 'Single lucky sock' } },
  { icon: '🗿', name: { de: 'Mini-Osterinsel-Kopf', en: 'Mini Easter Island head' } },
  { icon: '🎺', name: { de: 'Verstimmte Trompete', en: 'Out-of-tune trumpet' } },
  { icon: '🦖', name: { de: 'Aufblasbarer T-Rex', en: 'Inflatable T-Rex' } },
  { icon: '🍍', name: { de: 'Ananas mit Sonnenbrille', en: 'Pineapple with sunglasses' } },
  { icon: '🪩', name: { de: 'Diskokugel XXL', en: 'XXL disco ball' } },
  { icon: '🧀', name: { de: '100 Jahre alter Käse', en: '100-year-old cheese' } },
  { icon: '🛸', name: { de: 'Gebrauchtes UFO', en: 'Used UFO' } },
  { icon: '👑', name: { de: 'Krone aus Pappe', en: 'Cardboard crown' } },
  { icon: '🐌', name: { de: 'Renn-Schnecke', en: 'Racing snail' } },
];

export const auctionCreateState = (rng) => ({ items: rng.shuffle(AUCTION_ITEMS.map((_, i) => i)).slice(0, AUCTION.rounds) });

/** Münzen, die ein Spieler nach den abgeschlossenen Runden noch hat. */
export const coinsLeft = (sim, uid) => AUCTION.coins - (sim?.history || []).reduce((s, h) => s + (h.bids[uid] ?? 0), 0);

/** Gewonnene Gegenstände (Runden-Indizes). */
export const itemsWon = (sim, uid) => (sim?.history || []).map((h, r) => (h.winners.includes(uid) ? r : -1)).filter((r) => r >= 0);

/** Gebot dieser Runde (gültig gemacht: ganze Zahl, 0 … übrige Münzen). */
export function bidOf(round, sim, uid) {
  const b = round.results?.[uid]?.[`b${sim.r}`];
  if (b == null || !Number.isFinite(b)) return null;
  return Math.max(0, Math.min(coinsLeft(sim, uid), Math.floor(b)));
}

export function settleRound(round, sim) {
  const bids = Object.fromEntries(round.participants.map((id) => [id, bidOf(round, sim, id) ?? 0]));
  const max = Math.max(...Object.values(bids));
  // Bietet niemand etwas, bleibt der Gegenstand im Auktionshaus
  const winners = max > 0 ? round.participants.filter((id) => bids[id] === max) : [];
  return { bids, winners, top: max };
}

export const auctionDirector = {
  start(round, now) { return { phase: 'bid', r: 0, history: [], endsAt: now + AUCTION.bidMs }; },
  tick(sim, round, now) {
    if (sim.phase === 'bid') {
      const all = round.participants.every((id) => bidOf(round, sim, id) != null);
      if (!all && now < sim.endsAt) return { sim };
      return { sim: { ...sim, phase: 'reveal', history: [...sim.history, settleRound(round, sim)], endsAt: now + AUCTION.revealMs } };
    }
    if (sim.phase === 'reveal') {
      if (now < sim.endsAt) return { sim };
      if (sim.r + 1 >= AUCTION.rounds) {
        const final = { ...sim, phase: 'done' };
        return { sim: final, done: auctionResult(round, final) };
      }
      return { sim: { ...sim, phase: 'bid', r: sim.r + 1, endsAt: now + AUCTION.bidMs } };
    }
    return { sim };
  },
};

export function auctionResult(round, sim) {
  // Gegenstände zählen 100, übrige Münzen entscheiden bei Gleichstand
  return finishByScore(round, (id) => itemsWon(sim, id).length * 100 + coinsLeft(sim, id), {
    extra: { auctionItems: Object.fromEntries(round.participants.map((id) => [id, itemsWon(sim, id).length])) },
  });
}
