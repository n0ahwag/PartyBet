import { COLORS } from './gameLibrary.js';

/** Spontane Live-Events: Vollbild-Alarm auf allen Geräten, der Langsamste trinkt in echt. */

export const LIVE_EVENT_SIPS = 5;
export const LIVE_EVENT_CHANCE = 0.35;
export const REACTION_MS = 3000; // Timer nach dem Alarm
export const STATUE_MS = 10000; // Messfenster bei "Statue!"

export const LIVE_EVENTS = {
  lava: {
    id: 'lava', title: 'Der Boden ist Lava!', icon: '🌋',
    text: 'Füße hoch – SOFORT!', colors: ['#F97316', '#DC2626'],
  },
  statue: {
    id: 'statue', title: 'Statue!', icon: '🗿',
    text: 'Erstarrt! Handy in der Hand ruhig halten – wer sich zuerst bewegt, verliert.', colors: ['#64748B', '#1E293B'],
    sensor: true,
  },
  nose: {
    id: 'nose', title: 'An die Nase!', icon: '👃',
    text: 'Zeigefinger an die Nase!', colors: ['#EC4899', '#BE185D'],
  },
  swap: {
    id: 'swap', title: 'Handy-Tausch!', icon: '🔄',
    text: 'Handy an den rechten Nachbarn weiterreichen!', colors: ['#3B82F6', '#1D4ED8'],
  },
  color: {
    id: 'color', title: 'Farb-Ansturm!', icon: '🎨',
    text: 'Berühre etwas in dieser Farbe!', colors: ['#8B5CF6', '#6D28D9'],
  },
};

export const LIVE_EVENT_IDS = Object.keys(LIVE_EVENTS);

/** Löst der Klick auf "Nächstes Duell" stattdessen ein Event aus? */
export function shouldTriggerLiveEvent(room, rand = Math.random()) {
  if (room.liveEvents === false) return false;
  if (room.round < 1) return false; // nicht vor dem ersten Duell
  if (room.lastEventRound === room.round) return false; // nie zweimal hintereinander
  return rand < LIVE_EVENT_CHANCE;
}

export function createLiveEvent(rng, type) {
  const def = LIVE_EVENTS[type] ?? rng.pick(Object.values(LIVE_EVENTS));
  return {
    type: def.id,
    color: def.id === 'color' ? rng.pick(COLORS.filter((c) => c.id !== 'white')).id : null,
  };
}

/** Statue: wer sich (nach eigenem Gerät gemessen) zuerst bewegt hat. */
export function statueLoser(reactions = {}) {
  const moved = Object.entries(reactions).filter(([, r]) => r?.movedAfterMs != null);
  if (!moved.length) return null;
  return moved.sort((a, b) => a[1].movedAfterMs - b[1].movedAfterMs)[0][0];
}
