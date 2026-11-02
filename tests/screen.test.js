import { describe, it, expect } from 'vitest';
import { GAMES } from '../src/game/gameLibrary.js';
import { libraryFor } from '../src/game/group.js';
import { SCREEN_GAME_IDS, DIRECTORS } from '../src/game/screen/index.js';
import { quizDirector, quizCell, QUIZ } from '../src/game/screen/quizShow.js';
import { HOLES, GOLF, simulateShot, golfState, golfTotal } from '../src/game/screen/minigolf.js';
import { shipDirector, shipPanels, SHIP, CONTROL } from '../src/game/screen/spaceship.js';
import { auctionDirector, AUCTION, coinsLeft, itemsWon } from '../src/game/screen/auction.js';
import { raceDirector, RACE, track } from '../src/game/screen/racer.js';
import { hiddenDirector, makeScene, objectAt } from '../src/game/screen/hiddenObject.js';
import { makeRng } from '../src/lib/random.js';

const ts = (ms) => ({ toMillis: () => ms });
const mkRound = (id, extra = {}) => ({ id: 'r1', gameId: id, participants: ['a', 'b', 'c'], results: {}, game: GAMES[id].createState(makeRng(`t:${id}`), {}), ...extra });
/** Regie laufen lassen, bis sie fertig ist (oder maxSteps). */
function runDirector(round, { step = 100, max = 4000, onTick } = {}) {
  const d = DIRECTORS[round.gameId];
  let now = 1_000_000;
  let sim = d.start(round, now);
  for (let i = 0; i < max; i++) {
    now += step;
    onTick?.(sim, round, now);
    const r = d.tick(sim, round, now);
    sim = r.sim;
    if (r.done) return { sim, done: r.done, now };
  }
  return { sim, done: null, now };
}

describe('Hauptbildschirm-Spiele: Registrierung', () => {
  it('6 Spiele, nur mit Hauptbildschirm in der Bibliothek', () => {
    expect(SCREEN_GAME_IDS).toHaveLength(6);
    for (const id of SCREEN_GAME_IDS) expect(GAMES[id].needsScreen).toBe(true);
    const withScreen = libraryFor('group', 4, [], { screen: true }).map((g) => g.id);
    const phonesOnly = libraryFor('group', 4, [], { screen: false }).map((g) => g.id);
    SCREEN_GAME_IDS.forEach((id) => { expect(withScreen).toContain(id); expect(phonesOnly).not.toContain(id); });
    expect(libraryFor('library', 4, [], { screen: false }).some((g) => g.needsScreen)).toBe(false);
    expect(libraryFor('party', 4, [], { screen: true }).some((g) => g.needsScreen)).toBe(false);
  });
});

describe('Live-Quiz-Show', () => {
  it('Buzzer: früheste Server-Zeit gewinnt, falsch kostet die Hälfte & sperrt, richtig wählt weiter', () => {
    const round = mkRound('quizShow');
    const d = quizDirector;
    let now = 0;
    let sim = d.start(round, now);
    now += QUIZ.autoPickMs; sim = d.tick(sim, round, now).sim;
    expect(sim.phase).toBe('question');
    const { value, question } = quizCell(round.game, sim.cell);
    // b buzzert vor a (Server-Zeit), beide kommen gleichzeitig an
    round.results = { a: { buzz: { k: sim.k, at: ts(500) } }, b: { buzz: { k: sim.k, at: ts(400) } } };
    now += 3000; sim = d.tick(sim, round, now).sim; // firstAt merken
    now += QUIZ.graceMs; sim = d.tick(sim, round, now).sim;
    expect(sim.phase).toBe('answer');
    expect(sim.buzzer).toBe('b');
    round.results.b.ans = { k: sim.k, i: (question.a + 1) % 4 }; // falsch
    now += 100; sim = d.tick(sim, round, now).sim;
    expect(sim.scores.b).toBe(-value / 2);
    expect(sim.locked).toEqual(['b']);
    expect(sim.phase).toBe('question');
    // jetzt kommt a (hatte auch gebuzzert) dran und liegt richtig
    now += 100; sim = d.tick(sim, round, now).sim;
    now += QUIZ.graceMs; sim = d.tick(sim, round, now).sim;
    expect(sim.buzzer).toBe('a');
    round.results.a.ans = { k: sim.k, i: question.a };
    now += 100; sim = d.tick(sim, round, now).sim;
    expect(sim.phase).toBe('reveal');
    expect(sim.scores.a).toBe(value);
    expect(sim.chooser).toBe('a');
    // a wählt ein Feld
    now += QUIZ.revealMs; sim = d.tick(sim, round, now).sim;
    expect(sim.phase).toBe('board');
    const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((c) => !sim.used.includes(c));
    round.results.a.pick = { n: sim.pickN, cell: free };
    now += 100; sim = d.tick(sim, round, now).sim;
    expect(sim.cell).toBe(free);
  });

  it('ohne Buzzer läuft die Show durch alle 9 Felder und endet', () => {
    const { sim, done } = runDirector(mkRound('quizShow'), { step: 250, max: 5000 });
    expect(sim.used).toHaveLength(9);
    expect(done.ranks).toBeTruthy();
  });
});

describe('Minigolf', () => {
  it('Schläge sind deterministisch und bleiben auf der Bahn', () => {
    const a = simulateShot(0, HOLES[0].start, -1.2, 0.7);
    const b = simulateShot(0, HOLES[0].start, -1.2, 0.7);
    expect(a).toEqual(b);
    for (let i = 0; i < 40; i++) {
      const r = simulateShot(i % 3, HOLES[i % 3].start, (i / 40) * Math.PI * 2, (i % 10) / 10 + 0.05);
      expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x).toBeLessThanOrEqual(GOLF.w);
      expect(r.y).toBeGreaterThanOrEqual(0); expect(r.y).toBeLessThanOrEqual(GOLF.h);
    }
  });

  it('jede Bahn ist mit höchstens 6 Schlägen einlochbar', () => {
    for (let h = 0; h < HOLES.length; h++) {
      let pos = { ...HOLES[h].start }; let holed = false; let n = 0;
      while (!holed && n < GOLF.maxStrokes) {
        let best = null;
        for (let ai = 0; ai < 72; ai++) {
          for (let pi = 1; pi <= 20; pi++) {
            const r = simulateShot(h, pos, (ai / 72) * Math.PI * 2, pi / 20);
            const d = r.in ? -1 : Math.hypot(r.x - HOLES[h].cup.x, r.y - HOLES[h].cup.y);
            if (!best || d < best.d) best = { d, r };
          }
        }
        n += 1; pos = { x: best.r.x, y: best.r.y }; holed = best.r.in;
      }
      expect(holed, `Bahn ${h + 1}`).toBe(true);
    }
  });

  it('Wertung: nicht eingelocht zählt 7, fertig nach 3 Bahnen', () => {
    const shots = [{ h: 0, x: 50, y: 22, in: true }, ...Array.from({ length: 6 }, () => ({ h: 1, x: 10, y: 140, in: false })), { h: 2, x: 50, y: 22, in: true }];
    const st = golfState(shots);
    expect(st.done).toBe(true);
    expect(golfTotal(shots)).toBe(1 + 7 + 1);
  });
});

describe('Raumschiff-Chaos', () => {
  it('jeder hat eigene Schaltpulte, Befehle werden erledigt oder kosten Hülle', () => {
    const round = mkRound('spaceship');
    const panels = shipPanels(round);
    const all = Object.values(panels).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(panels.a.length).toBe(SHIP.perPanel);
    // Alle Befehle sofort erfüllen → Ziel erreicht
    const { sim, done } = runDirector(round, {
      onTick: (s, r) => {
        for (const cmd of Object.values(s.cmds || {})) {
          const owner = Object.keys(panels).find((id) => panels[id].includes(cmd.ctl));
          r.results[owner] = r.results[owner] || { c: {} };
          const c = r.results[owner].c;
          c[cmd.ctl] = CONTROL[cmd.ctl].type === 'button' ? (c[cmd.ctl] ?? 0) + 1 : cmd.val;
        }
      },
    });
    expect(sim.win).toBe(true);
    expect(sim.hull).toBe(SHIP.hull);
    expect(done.points.a).toBe(3);
  });

  it('niemand reagiert → die Hülle bricht', () => {
    const { sim, done } = runDirector(mkRound('spaceship'), { step: 500 });
    expect(sim.hull).toBeLessThanOrEqual(0);
    expect(sim.win).toBe(false);
    expect(done.points).toEqual({});
  });
});

describe('Biet-Duell', () => {
  it('Gleichstand: alle Höchstbietenden bekommen den Gegenstand, Gebote werden abgezogen', () => {
    const round = mkRound('auction');
    round.results = { a: { b0: 5 }, b: { b0: 5 }, c: { b0: 99 } }; // c bietet mehr als er hat → 20
    let now = 0;
    let sim = auctionDirector.start(round, now);
    sim = auctionDirector.tick(sim, round, ++now).sim;
    expect(sim.phase).toBe('reveal');
    expect(sim.history[0].winners).toEqual(['c']);
    expect(coinsLeft(sim, 'c')).toBe(0);
    expect(coinsLeft(sim, 'a')).toBe(15);
    now += AUCTION.revealMs; sim = auctionDirector.tick(sim, round, now).sim;
    round.results.a.b1 = 7; round.results.b.b1 = 7; round.results.c.b1 = 3; // c hat nichts mehr → 0
    sim = auctionDirector.tick(sim, round, ++now).sim;
    expect(sim.history[1].winners).toEqual(['a', 'b']);
    expect(itemsWon(sim, 'a')).toEqual([1]);
  });

  it('nach 5 Runden: meiste Gegenstände gewinnen', () => {
    const round = mkRound('auction');
    const { sim, done } = runDirector(round, {
      onTick: (s, r) => { if (s.phase === 'bid') { r.results.a = { ...r.results.a, [`b${s.r}`]: 4 }; r.results.b = { ...r.results.b, [`b${s.r}`]: 1 }; } },
    });
    expect(sim.history).toHaveLength(5);
    expect(itemsWon(sim, 'a')).toHaveLength(5);
    expect(done.ranks.a).toBe(1);
  });
});

describe('Party-Rennen', () => {
  it('Strecke ist geschlossen, Autos fahren 3 Runden ins Ziel, Lenken bleibt begrenzt', () => {
    const { L } = track();
    expect(L).toBeGreaterThan(1500);
    const round = mkRound('partyRacer');
    round.results = { a: { in: { b: true } }, b: { in: { l: true } }, c: { in: {} } };
    const { sim, done } = runDirector(round, { step: 100, max: 2000 });
    const finished = sim.cars.filter((c) => c.fin != null);
    expect(finished.length).toBeGreaterThan(0);
    expect(sim.cars.find((c) => c.id === 'b').d).toBeGreaterThanOrEqual(-1.3);
    expect(Object.keys(done.ranks)).toHaveLength(3);
    expect(sim.t * 1000).toBeLessThanOrEqual(RACE.timeMs + 200);
  });
});

describe('Wimmelbild', () => {
  it('jede gesuchte Figur gibt es genau einmal und ist antippbar', () => {
    for (const seed of [1, 42, 777, 123456]) {
      const scene = makeScene(seed);
      expect(scene.targets).toHaveLength(5);
      for (const i of scene.targets) {
        const o = scene.objects[i];
        expect(scene.objects.filter((x) => x.e === o.e && x.acc === o.acc)).toHaveLength(1);
        expect(objectAt(scene, o.x, o.y)).toBe(i);
      }
    }
  });

  it('der schnellste Treffer (Server-Zeit) holt den Punkt', () => {
    const round = mkRound('hiddenObject');
    let now = 0;
    let sim = hiddenDirector.start(round, now);
    round.results = { a: { hit: { k: 0, at: ts(900) } }, c: { hit: { k: 0, at: ts(800) } } };
    sim = hiddenDirector.tick(sim, round, ++now).sim;
    now += 400; sim = hiddenDirector.tick(sim, round, now).sim;
    expect(sim.phase).toBe('reveal');
    expect(sim.scores).toEqual({ c: 1 });
  });
});
