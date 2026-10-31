import { describe, it, expect } from 'vitest';
import {
  levelFromRms, balloonGrowth, BALLOON, SHAPES, shapePoints, traceScore, traceAccuracy, makeWire, wireProgress, WIRE,
  HIGHER_LOWER_SETS, makeHigherLower, higherLowerCorrect, PRICE_ITEMS, parsePrice, priceError, teamsOf, tugResult,
  teamEstimateResult, encodeSketch, decodeSketch, sketchResult,
} from '../src/game/extras.js';
import { GAMES, priceTagError, playableFor } from '../src/game/gameLibrary.js';
import '../src/game/group.js';
import { makeRng } from '../src/lib/random.js';

describe('Erweiterungs-Spiele', () => {
  it('Mikrofon-Pegel: leise = 0, laut = 100', () => {
    expect(levelFromRms(0)).toBe(0);
    expect(levelFromRms(1)).toBe(100);
    expect(levelFromRms(0.01)).toBeGreaterThan(30);
    expect(balloonGrowth(BALLOON.blowFrom, 1)).toBe(0);
    expect(balloonGrowth(100, 1)).toBeCloseTo(BALLOON.growPerSec);
  });

  it('Linie halten: exakt nachgefahren ≈ 100 %, nur ein Stück ≈ schlecht', () => {
    for (const shape of SHAPES) {
      const path = shapePoints(shape);
      for (const [x, y] of path) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(300); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(300); }
      const perfect = traceScore(path, path);
      expect(perfect.coverage).toBe(1);
      expect(traceAccuracy(perfect.score)).toBeGreaterThanOrEqual(99);
      const part = traceScore(path, path.slice(0, 40));
      expect(part.score).toBeGreaterThan(30);
    }
    expect(traceScore(shapePoints('circle'), []).score).toBe(999);
  });

  it('Heißer Draht: Parcours im Feld, Start = 0 %, Ziel = 100 %', () => {
    for (let s = 1; s < 30; s++) {
      const path = makeWire(s);
      path.forEach(([x, y]) => { expect(x).toBeGreaterThanOrEqual(30); expect(x).toBeLessThanOrEqual(WIRE.w - 30); expect(y).toBeLessThanOrEqual(WIRE.h); });
      expect(wireProgress(path, ...path[0]).progress).toBe(0);
      expect(wireProgress(path, ...path[path.length - 1]).progress).toBeCloseTo(1);
    }
  });

  it('Höher oder Tiefer: keine gleichen Werte, Antworten stimmen', () => {
    for (const set of HIGHER_LOWER_SETS) {
      const vals = set.items.map(([, v]) => v);
      expect(new Set(vals).size).toBe(vals.length);
    }
    const g = makeHigherLower(makeRng('hl'));
    const items = HIGHER_LOWER_SETS[g.setIdx].items;
    const right = items[g.order[1]][1] > items[g.order[0]][1] ? 'higher' : 'lower';
    expect(higherLowerCorrect(g, 0, right)).toBe(true);
    expect(higherLowerCorrect(g, 0, right === 'higher' ? 'lower' : 'higher')).toBe(false);
  });

  it('Preisschild: Eingaben lesen und Abweichung in Prozent', () => {
    expect(parsePrice('12,50')).toBe(12.5);
    expect(parsePrice('1.299')).toBe(1299);
    expect(parsePrice('0.95')).toBe(0.95);
    expect(parsePrice('3.499,00 €')).toBe(3499);
    expect(priceError(110, 100)).toBe(10);
    const game = { items: [0, 1, 2] };
    expect(priceTagError(game, game.items.map((i) => PRICE_ITEMS[i].a))).toBe(0);
  });

  it('Teams: alle verteilt, gleich groß (±1), auf allen Geräten gleich', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const [x, y] = teamsOf(ids, 7);
    expect([...x, ...y].sort()).toEqual(ids);
    expect(Math.abs(x.length - y.length)).toBeLessThanOrEqual(1);
    expect(teamsOf(ids, 7)).toEqual([x, y]);
  });

  it('Tauziehen und Team-Schätzen: Siegerteam bekommt je 2 Punkte', () => {
    const participants = ['a', 'b', 'c', 'd'];
    const seed = 3;
    const [t0, t1] = teamsOf(participants, seed);
    const results = Object.fromEntries([...t0.map((id) => [id, { taps: 50, done: true, guess: 100 }]), ...t1.map((id) => [id, { taps: 20, done: true, guess: 500 }])]);
    const round = { participants, game: { seed }, results };
    const tug = tugResult(round);
    expect(tug.extra.winnerTeam).toBe(0);
    t0.forEach((id) => expect(tug.points[id]).toBe(2));
    t1.forEach((id) => expect(tug.points[id]).toBeUndefined());
    expect(teamEstimateResult(round, 120).extra.winnerTeam).toBe(0);
    expect(teamEstimateResult(round, 450).extra.winnerTeam).toBe(1);
  });

  it('Blind-Skizze: Striche bleiben erhalten, Stimmen ergeben Punkte', () => {
    const strokes = [[[10, 20], [30, 40]], [[500, 500]]];
    expect(decodeSketch(encodeSketch(strokes))).toEqual(strokes);
    const round = {
      participants: ['a', 'b', 'c'],
      results: { a: { sketch: 'x', vote: 'b' }, b: { sketch: 'x', vote: 'a' }, c: { sketch: 'x', vote: 'b' } },
    };
    const r = sketchResult(round);
    expect(r.points).toEqual({ b: 3, a: 2 });
    expect(r.extra.votes).toEqual({ a: 1, b: 2, c: 0 });
  });

  it('Mikrofon-Spiele nur, wenn alle ein Mikrofon haben; neue Spiele erzeugen einen Zustand', () => {
    const players = [{ caps: { mic: true } }, { caps: {} }];
    expect(playableFor([GAMES.levelHit], players)).toHaveLength(0);
    expect(playableFor([GAMES.levelHit], [{ caps: { mic: true } }])).toHaveLength(1);
    for (const id of ['levelHit', 'breathBalloon', 'traceLine', 'hotWire', 'higherLower', 'priceTag', 'tugOfWar', 'teamEstimate', 'blindSketch']) {
      expect(GAMES[id].createState(makeRng(id), { phase: 'warmup' })).toBeTruthy();
    }
  });
});
