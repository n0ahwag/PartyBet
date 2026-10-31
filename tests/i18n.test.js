import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from '../src/i18n/en.js';
import { t, tn, setLang, getLang } from '../src/i18n/index.js';
import * as gl from '../src/game/gameLibrary.js';
import * as c from '../src/game/constants.js';
import * as b from '../src/game/board.js';
import * as g from '../src/game/group.js';
import * as le from '../src/game/liveEvents.js';
import * as ex from '../src/game/extras.js';

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(jsx?|mjs)$/.test(p) ? [p] : [];
  });
}

/** Alle literalen Schlüssel aus t('…'), t("…") und tn(n, '…', '…'). */
function literalKeys() {
  const keys = new Set();
  for (const f of files(join(__dirname, '../src'))) {
    if (f.includes('/i18n/')) continue;
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
    for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(m[1]);
    for (const m of src.matchAll(/\btn\([^,]+,\s*'([^']*)',\s*'([^']*)'/g)) { keys.add(m[1]); keys.add(m[2]); }
  }
  return keys;
}

/** Alle deutschen Texte aus den Spieldaten, die über t() angezeigt werden. */
function dataKeys() {
  const out = new Set();
  const add = (s) => { if (typeof s === 'string' && s.trim()) out.add(s); };
  for (const x of Object.values(gl.GAMES)) { add(x.name); add(x.rules); add(x.groupRules); }
  Object.values(gl.CATEGORIES).forEach((x) => add(x.label));
  gl.COLORS.forEach((x) => add(x.label));
  gl.ESTIMATE_QUESTIONS.forEach((x) => { add(x.q); add(x.unit); });
  gl.COMPASS_DIRECTIONS.forEach((x) => add(x.label));
  gl.EMOJI_PUZZLES.forEach((x) => { add(x.hint); add(x.solution); });
  gl.CHAIN_CATEGORIES.forEach((x) => add(x.category));
  [gl.ASSOCIATION_WORDS, gl.SPRINT_CATEGORIES, gl.CHAIN_WORDS, c.SABOTAGE_RULES, c.EMERGENCY_TASKS, c.VIDEO_PROMPTS,
    g.WHO_MOST_QUESTIONS, g.HIVEMIND_CATEGORIES, g.STORY_STARTS].forEach((list) => list.forEach(add));
  Object.values(c.PHASES).forEach((x) => { add(x.label); add(x.tagline); });
  c.EQUIPMENT.forEach((x) => add(x.label));
  [c.POWERUPS, c.RESCUE_OPTIONS, b.FIELD_TYPES].forEach((m) => Object.values(m).forEach((x) => { add(x.label); add(x.desc); }));
  Object.values(b.BOARD_LENGTHS).forEach((x) => add(x.label));
  Object.values(c.POWERUPS).forEach((x) => { x.how.forEach(add); add(x.when); add(x.example); });
  add(c.POWERUP_SOURCE);
  Object.values(b.BOARD_THEMES).forEach((x) => add(x.label));
  for (let r = 1; r <= 5; r++) add(b.moveRule(r).label);
  [b.BOARD_PHASES, g.GROUP_PHASES].forEach((m) => Object.values(m).forEach((x) => { add(x.label); add(x.title); add(x.tagline); }));
  Object.values(le.LIVE_EVENTS).forEach((x) => { add(x.title); add(x.text); });
  ex.HIGHER_LOWER_SETS.forEach((x) => { add(x.topic); add(x.unit); x.items.forEach(([name]) => add(name)); });
  ex.PRICE_ITEMS.forEach((x) => { add(x.q); add(x.unit); });
  [Object.values(ex.SHAPE_LABELS), ex.SKETCH_PROMPTS, ex.TEAM_NAMES].forEach((list) => list.forEach(add));
  return out;
}

describe('Übersetzungen', () => {
  it('jeder t()-Text im Code hat eine englische Fassung', () => {
    const missing = [...literalKeys()].filter((k) => !(k in EN));
    expect(missing).toEqual([]);
  });

  it('jeder angezeigte Datentext (Spiele, Fragen, Rätsel …) hat eine englische Fassung', () => {
    const missing = [...dataKeys()].filter((k) => !(k in EN));
    expect(missing).toEqual([]);
  });

  it('Platzhalter stimmen zwischen Deutsch und Englisch überein', () => {
    const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    const bad = Object.entries(EN).filter(([de, en]) => ph(de) !== ph(en)).map(([de]) => de);
    expect(bad).toEqual([]);
  });

  it('t() übersetzt, setzt Platzhalter ein und fällt auf Deutsch zurück', () => {
    const before = getLang();
    setLang('en');
    expect(t('Trink {x}!', { x: tn(3, '{n} Schluck', '{n} Schlücke') })).toBe('Drink 3 sips!');
    expect(t('Gibt es nicht')).toBe('Gibt es nicht');
    setLang('de');
    expect(t('Trink {x}!', { x: tn(1, '{n} Schluck', '{n} Schlücke') })).toBe('Trink 1 Schluck!');
    setLang(before);
  });

  it('englische Emoji-Antworten werden erkannt', () => {
    const lion = gl.EMOJI_PUZZLES.find((p) => p.emojis === '🦁👑');
    expect(gl.emojiAnswerCorrect(lion, 'The Lion King')).toBe(true);
  });
});
