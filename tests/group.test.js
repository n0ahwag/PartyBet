import { describe, it, expect } from 'vitest';
import {
  libraryFor, pointsForRanks, tallyVotes, syncResult, syncWindow, hivemindResult, confessionResult,
  storyState, storyWordsPerPlayer, GROUP_ONLY_IDS,
} from '../src/game/group.js';
import { GAMES } from '../src/game/gameLibrary.js';

const P = ['a', 'b', 'c', 'd'];

describe('Gruppen-Modus: Bibliothek', () => {
  it('Gruppen-Spiele nur im Gruppen-Modus, dort keine Utensil-Spiele', () => {
    const party = libraryFor('party', 4, ['cards']).map((g) => g.id);
    const board = libraryFor('board', 4, ['cards']).map((g) => g.id);
    const group = libraryFor('group', 4, ['cards']).map((g) => g.id);
    for (const id of GROUP_ONLY_IDS) {
      expect(party).not.toContain(id);
      expect(board).not.toContain(id);
      expect(group).toContain(id);
    }
    expect(group).not.toContain('highCard');
    expect(group).not.toContain('bluffCard');
    expect(group).toContain('stopwatch');
  });

  it('mit 2 Spielern keine Abstimmung/Hivemind/Beicht-Quiz', () => {
    const ids = libraryFor('group', 2).map((g) => g.id);
    expect(ids).toContain('syncTest');
    expect(ids).toContain('chainStory');
    expect(ids).not.toContain('whoMost');
    expect(ids).not.toContain('confession');
    expect(GAMES.hivemind.judge).toBe('host');
  });

  it('Platz 1/2/3 = 3/2/1 Punkte, ohne Ergebnis 0', () => {
    expect(pointsForRanks({ a: 1, b: 2, c: 3, d: 5 }, 4)).toEqual({ a: 3, b: 2, c: 1, d: 0 });
  });
});

describe('Wer am ehesten', () => {
  it('zählt Stimmen; wer mit der Mehrheit stimmt, bekommt 1 Punkt; Gleichstand = mehrere Top', () => {
    const round = { participants: P, results: { a: { vote: 'b' }, b: { vote: 'b' }, c: { vote: 'a' }, d: { vote: 'b' } } };
    const t = tallyVotes(round);
    expect(t.counts).toEqual({ a: 1, b: 3, c: 0, d: 0 });
    expect(t.top).toEqual(['b']);
    expect(t.points).toEqual({ a: 1, b: 1, d: 1 });
    expect(t.stats.b.votesReceived).toBe(3);
    const tie = tallyVotes({ participants: P, results: { a: { vote: 'c' }, b: { vote: 'd' } } });
    expect(tie.top.sort()).toEqual(['c', 'd']);
  });
});

describe('Synch-Test', () => {
  it('Erfolg innerhalb des Zeitfensters (Server-Zeitstempel), sonst keine Punkte', () => {
    const t = (ms) => ({ at: { toMillis: () => ms } });
    const ok = syncResult({ participants: P, results: { a: t(1000), b: t(1100), c: t(1180), d: t(1050) } });
    expect(ok.spread).toBe(180);
    expect(ok.success).toBe(true);
    expect(ok.points).toEqual({ a: 2, b: 2, c: 2, d: 2 });
    const bad = syncResult({ participants: P, results: { a: t(1000), b: t(1900), c: t(1100), d: t(1050) } });
    expect(bad.success).toBe(false);
    expect(syncWindow(4)).toBe(330);
    expect(syncResult({ participants: P, results: { a: t(1000) } }).success).toBe(false);
  });
});

describe('Hivemind & Beicht-Quiz & Ketten-Story', () => {
  it('Hivemind: Mehrheit bekommt je 2 Punkte', () => {
    expect(hivemindResult(['a', 'c']).points).toEqual({ a: 2, c: 2 });
  });

  it('Beicht-Quiz: richtig Ratende +1, Besitzer +2 wenn weniger als die Hälfte richtig lag', () => {
    const round = {
      participants: ['a', 'b', 'c'],
      order: ['a', 'b'],
      results: {
        a: { fact: 'x', guesses: { 1: 'b' } },
        b: { fact: 'y', guesses: { 0: 'c' } },
        c: { guesses: { 0: 'b', 1: 'a' } },
      },
    };
    // Geheimnis 0 (a): b→c, c→b → niemand richtig → a +2
    // Geheimnis 1 (b): a→b richtig, c→a falsch → 1 von 2 = nicht weniger als die Hälfte
    const r = confessionResult(round);
    expect(r.points).toEqual({ a: 3 });
    expect(r.stats.a).toEqual({ confessFooled: 1, confessCorrect: 1 });
  });

  it('Ketten-Story: reihum, Zielwortzahl, Text wird zusammengesetzt', () => {
    const round = { participants: ['a', 'b'], game: { start: 'Es war einmal' }, results: { a: { words: { 0: 'ein', 2: 'Pinguin' } }, b: { words: { 1: 'sehr' } } } };
    const st = storyState(round);
    expect(st.text).toBe('Es war einmal ein sehr Pinguin');
    expect(st.turn).toBe('b');
    expect(st.total).toBe(2 * storyWordsPerPlayer(2));
    expect(st.done).toBe(false);
  });
});
