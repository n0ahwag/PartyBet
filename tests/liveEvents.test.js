import { describe, it, expect } from 'vitest';
import { shouldTriggerLiveEvent, createLiveEvent, statueLoser, freezeLoser, isFlat, LIVE_EVENTS, LIVE_EVENT_CHANCE } from '../src/game/liveEvents.js';
import { makeRng } from '../src/lib/random.js';

describe('Live-Events', () => {
  const room = { round: 3, lastEventRound: 1, liveEvents: true };

  it('triggert zufällig zwischen Duellen', () => {
    expect(shouldTriggerLiveEvent(room, LIVE_EVENT_CHANCE - 0.01)).toBe(true);
    expect(shouldTriggerLiveEvent(room, LIVE_EVENT_CHANCE + 0.01)).toBe(false);
  });

  it('nie vor dem ersten Duell, nie zweimal hintereinander, nicht wenn abgeschaltet', () => {
    expect(shouldTriggerLiveEvent({ ...room, round: 0 }, 0)).toBe(false);
    expect(shouldTriggerLiveEvent({ ...room, lastEventRound: 3 }, 0)).toBe(false);
    expect(shouldTriggerLiveEvent({ ...room, liveEvents: false }, 0)).toBe(false);
  });

  it('alle 7 Events existieren; Farb-Ansturm bekommt eine Farbe', () => {
    expect(Object.keys(LIVE_EVENTS)).toEqual(['lava', 'statue', 'nose', 'swap', 'color', 'freeze', 'thumb']);
    expect(createLiveEvent(makeRng('x'), 'color').color).toBeTruthy();
    expect(createLiveEvent(makeRng('x'), 'lava')).toEqual({ type: 'lava', color: null });
  });

  it('Statue: wer sich zuerst bewegt, verliert', () => {
    expect(statueLoser({ a: { movedAfterMs: 4200 }, b: { movedAfterMs: 900 } })).toBe('b');
    expect(statueLoser({})).toBeNull();
  });

  it('Gruppen-Freeze: der Letzte verliert, fehlt genau einer am Ende, verliert er', () => {
    const players = ['a', 'b', 'c'];
    expect(freezeLoser({ a: { flatAfterMs: 900 }, b: { flatAfterMs: 2100 }, c: { flatAfterMs: 1500 } }, players)).toBe('b');
    expect(freezeLoser({ a: { flatAfterMs: 900 }, b: { flatAfterMs: 2100 } }, players)).toBeUndefined();
    expect(freezeLoser({ a: { flatAfterMs: 900 }, b: { flatAfterMs: 2100 } }, players, true)).toBe('c');
    expect(freezeLoser({ a: { flatAfterMs: 900 } }, players, true)).toBeUndefined(); // mehrere fehlen → Host
    expect(isFlat({ x: 0.2, y: -0.3, z: 9.7 })).toBe(true);
    expect(isFlat({ x: 4, y: 6, z: 6 })).toBe(false);
  });
});
