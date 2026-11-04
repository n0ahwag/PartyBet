import { describe, it, expect } from 'vitest';
import { crewId, nameKey, applyParty, applyRecords, applyWeekBoard, crewHooks, earnedBadges, finalRanking } from '../src/game/crew.js';
import { weekKey, weekInfo, roundMods, WEEK_RULES } from '../src/game/weekly.js';
import { moveRule, applyRound, generateBoard } from '../src/game/board.js';
import { GAMES } from '../src/game/gameLibrary.js';
import '../src/game/group.js';

const P = (name, extra = {}) => ({ id: name.toLowerCase(), name, stats: {}, ...extra });
const groupRoom = { gameMode: 'group' };

describe('Crew', () => {
  it('gleiche Namen = gleiche Crew, egal in welcher Reihenfolge / Schreibweise', () => {
    expect(crewId(['Ana', 'Ben', 'Cem'])).toBe(crewId(['cem', ' BEN', 'Ana ']));
    expect(crewId(['Ana', 'Ben'])).not.toBe(crewId(['Ana', 'Ben', 'Cem']));
    expect(crewId(['Solo'])).toBe(null);
    expect(nameKey('Jörg Müller')).toBe('jorg_muller');
  });

  it('Siege, Serie, direkter Vergleich und Abzeichen werden über Partys gezählt', () => {
    let crew = null;
    let fresh;
    for (let i = 0; i < 3; i++) {
      ({ crew, newBadges: fresh } = applyParty(crew, { room: groupRoom, players: [P('Ana', { points: 10 }), P('Ben', { points: 5 }), P('Cem', { points: 1 })] }));
    }
    expect(crew.parties).toBe(3);
    expect(crew.wins.ana).toBe(3);
    expect(crew.streak).toEqual({ nk: 'ana', n: 3 });
    expect(crew.h2h['ana|ben']).toEqual({ ana: 3 });
    expect(earnedBadges(crew, 'ana')).toEqual(expect.arrayContaining(['firstWin', 'hattrick']));
    expect(fresh.ana).toEqual(['hattrick']); // in der 3. Party neu dazugekommen
    // Ben gewinnt → Serie reißt
    ({ crew } = applyParty(crew, { room: groupRoom, players: [P('Ana', { points: 1 }), P('Ben', { points: 9 }), P('Cem', { points: 2 })] }));
    expect(crew.streak).toEqual({ nk: 'ben', n: 1 });
    expect(crew.totals.ana.bestStreak).toBe(3);
  });

  it('Gleichstand an der Spitze: kein Sieger', () => {
    const { winner } = applyParty(null, { room: groupRoom, players: [P('Ana', { points: 5 }), P('Ben', { points: 5 })] });
    expect(winner).toBe(null);
  });

  it('Endstand je Modus: Spielfeld nach Ziel/Position, Party nach Schlücken', () => {
    const board = { gameMode: 'board', winnerId: 'ben', board: { fields: new Array(30).fill('normal') } };
    expect(finalRanking([P('Ana', { position: 25 }), P('Ben', { position: 29 })], board)[0].nk).toBe('ben');
    expect(finalRanking([P('Ana', { balance: 3 }), P('Ben', { balance: 12 })], { gameMode: 'party' })[0].nk).toBe('ben');
  });

  it('Haken für „noch eine Runde“: Rückstand, knappe Duelle, nächstes Abzeichen', () => {
    let crew = null;
    ({ crew } = applyParty(crew, { room: groupRoom, players: [P('Ana', { points: 9 }), P('Ben', { points: 1 })] }));
    ({ crew } = applyParty(crew, { room: groupRoom, players: [P('Ana', { points: 9 }), P('Ben', { points: 1 })] }));
    const hooks = crewHooks(crew, 'ben');
    expect(hooks.find((h) => h.type === 'gap')).toMatchObject({ leader: 'ana', n: 2 });
    expect(hooks.find((h) => h.type === 'h2h')).toMatchObject({ a: 'ben', b: 'ana', va: 0, vb: 2 });
    expect(crewHooks(crew, 'ana').find((h) => h.type === 'badge')).toMatchObject({ badge: 'hattrick', missing: 1 });
  });
});

describe('Rekorde & Wochen-Bestenliste', () => {
  it('nur ein besserer Wert ist ein neuer Rekord (erster Eintrag zählt nicht als gebrochen)', () => {
    let { crew, records } = applyRecords(null, { gameId: 'shake', entries: [{ uid: 'a', nk: 'ana', name: 'Ana', s: -20, txt: '20' }] });
    expect(records.a).toEqual({ prev: null, first: true });
    ({ crew, records } = applyRecords(crew, { gameId: 'shake', entries: [{ uid: 'a', nk: 'ana', name: 'Ana', s: -15, txt: '15' }] }));
    expect(records.a).toBeUndefined();
    ({ crew, records } = applyRecords(crew, { gameId: 'shake', entries: [{ uid: 'a', nk: 'ana', name: 'Ana', s: -31, txt: '31' }] }));
    expect(records.a).toEqual({ prev: '20', first: false });
    expect(crew.totals.ana.records).toBe(1);
    expect(crew.parties).toBe(0);
  });

  it('Wochen-Liste: Top 5, pro Name nur der beste Wert', () => {
    let list = [];
    list = applyWeekBoard(list, [1, 2, 3, 4, 5, 6].map((s) => ({ nk: `p${s}`, name: `P${s}`, s, txt: String(s) })));
    expect(list.map((x) => x.nk)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    list = applyWeekBoard(list, [{ nk: 'p5', name: 'P5', s: 0, txt: '0' }]);
    expect(list[0].nk).toBe('p5');
    expect(list.filter((x) => x.nk === 'p5')).toHaveLength(1);
  });
});

describe('Spiel der Woche & Wochen-Regeln', () => {
  it('Kalenderwoche ist stabil, alle Geräte bekommen dieselbe Regel und dasselbe Spiel', () => {
    expect(weekKey(new Date(2026, 10, 4))).toBe('2026-W45');
    expect(weekKey(new Date(2026, 0, 1))).toBe('2026-W01');
    const a = weekInfo('2026-W45'); const b = weekInfo('2026-W45');
    expect(a).toEqual(b);
    expect(WEEK_RULES[a.rule]).toBeTruthy();
    expect(GAMES[a.game].judge).toBe('auto');
    // über viele Wochen kommen alle Regeln vor
    const rules = new Set(Array.from({ length: 40 }, (_, i) => weekInfo(`2027-W${String(i + 1).padStart(2, '0')}`).rule));
    expect(rules.size).toBe(Object.keys(WEEK_RULES).length);
  });

  it('Spiel der Woche & Jackpot: Gold-Würfel für Platz 1 – auch bei nur 2 Spielern', () => {
    const week = { key: 'k', rule: 'jackpot', game: 'shake' };
    expect(roundMods(week, 1, 'shake').gold1).toBe(true);
    expect(roundMods(week, 3, 'pixelRun').jackpot).toBe(true);
    expect(roundMods(week, 2, 'pixelRun').gold1).toBe(false);
    expect(moveRule(1, 2, { gold1: true }).dice).toEqual(['gold', 'normal']);
  });

  it('Underdog: der Letzte bekommt Bronze · Raketen-Woche: +5', () => {
    expect(moveRule(4, 4, { bronzeLast: true }).bonus).toBe('bronze');
    expect(moveRule(3, 4, { bronzeLast: true }).bonus).toBe(null);
    const fields = ['start', 'normal', 'rocket', ...new Array(30).fill('normal'), 'goal'];
    const r = applyRound({ players: [{ id: 'a', position: 0 }], ranks: { a: 1 }, fields, seed: 's', fixedRolls: { a: [2] }, mods: { rocket: 5 } });
    expect(r.moves.a.to).toBe(7);
  });

  it('Chaos-Woche: doppelt so viele Sonderfelder', () => {
    const count = (f) => f.filter((x) => ['rocket', 'chaos', 'stumble', 'portal'].includes(x)).length;
    expect(count(generateBoard(90, 'x', null, 2))).toBeGreaterThan(count(generateBoard(90, 'x', null, 1)) * 1.6);
  });
});
