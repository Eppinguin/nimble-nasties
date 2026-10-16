import type { Monster } from './types.ts';
import { formatLevel } from './rules.ts';

export type QuickFilter = 'all' | 'standard' | 'minion' | 'legendary' | 'fits';
export type BrowseView = 'name' | 'level' | 'family';

export interface LevelRange {
  min: number;
  max: number;
}
export interface ParsedQuery {
  words: string[];
  level: LevelRange | null;
}
export interface Match {
  monster: Monster;
  score: number;
  nameHits: string[];
  hit?: string;
}

const EPS = 0.01;
const FRACTIONS: Record<string, number> = { '¼': 0.25, '⅓': 1 / 3, '½': 0.5, '1/4': 0.25, '1/3': 1 / 3, '1/2': 0.5 };
const levelValue = (raw: string): number | null => (raw in FRACTIONS ? FRACTIONS[raw] : /^\d+$/.test(raw) ? Number(raw) : null);
const LEVEL = String.raw`(\d+(?:\/[234])?|[¼⅓½])`;

/** Pulls a level out of the search: `3`, `lv3`, `level 3`, `2-4`, `<=3`, `5+`, `1/4`.
 * Everything else stays as words, each of which has to match somewhere. */
export function parseQuery(query: string): ParsedQuery {
  const tokens = query
    .toLowerCase()
    .replace(/\b(?:level|lvl|lv)\s+(?=[\d¼⅓½<>≤≥])/g, 'lv')
    .split(/\s+/)
    .filter(Boolean);
  let level: LevelRange | null = null;
  const words: string[] = [];
  for (const token of tokens) {
    const t = token.replace(/^(?:level|lvl|lv|l)(?=[\d¼⅓½<>≤≥])/, '');
    let m: RegExpMatchArray | null;
    if ((m = t.match(new RegExp(`^${LEVEL}$`)))) {
      const v = levelValue(m[1])!;
      level = { min: v, max: v };
    } else if ((m = t.match(new RegExp(`^${LEVEL}[-–]${LEVEL}$`)))) {
      const a = levelValue(m[1])!,
        b = levelValue(m[2])!;
      level = { min: Math.min(a, b), max: Math.max(a, b) };
    } else if ((m = t.match(new RegExp(`^(?:<=|≤|<)${LEVEL}$`)))) level = { min: 0, max: levelValue(m[1])! - (t.startsWith('<') && !t.startsWith('<=') ? EPS * 2 : 0) };
    else if ((m = t.match(new RegExp(`^(?:>=|≥|>)${LEVEL}$|^${LEVEL}\\+$`)))) {
      const v = levelValue(m[1] ?? m[2])!;
      level = { min: v + (t.startsWith('>') && !t.startsWith('>=') ? EPS * 2 : 0), max: Infinity };
    } else words.push(token);
  }
  return { words, level };
}

export function describeLevel(range: LevelRange): string {
  if (range.max === Infinity) return `Level ${formatLevel(Math.ceil(range.min - EPS))}+`;
  if (range.min <= 0) return `Level ≤ ${formatLevel(range.max)}`;
  return Math.abs(range.min - range.max) < EPS ? `Level ${formatLevel(range.min)}` : `Level ${formatLevel(range.min)}–${formatLevel(range.max)}`;
}

const kindWords = (m: Monster) => [m.kind === 'minion' ? 'minion' : m.kind === 'legendary' ? 'legendary solo boss' : m.kind === 'team' ? 'team' : 'standard', m.role, m.armor === 'none' ? '' : `${m.armor} armor armored`].join(' ').toLowerCase();

/** Scores one word against a stat block: name first, then family and kind, then what it can do. */
function scoreWord(m: Monster, word: string): { score: number; name: boolean; hit?: string } | null {
  const name = m.name.toLowerCase();
  if (name.startsWith(word)) return { score: 100, name: true };
  const start = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  if (start.test(name)) return { score: 80, name: true };
  if (name.includes(word)) return { score: 60, name: true };
  if (m.family.toLowerCase().includes(word)) return { score: 40, name: false };
  if (kindWords(m).includes(word)) return { score: 30, name: false };
  const abilities = [...m.traits, ...m.actions];
  const named = abilities.find((a) => a.name.toLowerCase().includes(word));
  if (named) return { score: 25, name: false, hit: named.name };
  // Prose only matches at a word start, so "or" or "fly" doesn't hit "for" or "butterfly".
  const told = abilities.find((a) => start.test(a.description.toLowerCase()));
  if (told) return { score: 10, name: false, hit: told.name };
  if (m.bloodied && start.test(m.bloodied.toLowerCase())) return { score: 8, name: false, hit: 'Bloodied' };
  if (m.lastStandText && start.test(m.lastStandText.toLowerCase())) return { score: 8, name: false, hit: 'Last Stand' };
  if (m.actionInstructions && start.test(m.actionInstructions.toLowerCase())) return { score: 8, name: false, hit: 'Actions' };
  return null;
}

export function inLevel(m: Monster, range: LevelRange | null): boolean {
  return !range || (m.level >= range.min - EPS && m.level <= range.max + EPS);
}

/** Every word has to land somewhere; the best landing decides the order. */
export function matchMonster(m: Monster, query: ParsedQuery): Match | null {
  if (!inLevel(m, query.level)) return null;
  let score = 0;
  const nameHits: string[] = [];
  let hit: string | undefined;
  for (const word of query.words) {
    const found = scoreWord(m, word);
    if (!found) return null;
    score += found.score;
    if (found.name) nameHits.push(word);
    else if (found.hit && !hit) hit = found.hit;
  }
  return { monster: m, score, nameHits, hit: nameHits.length === query.words.length ? undefined : hit };
}

/** What each quick filter keeps. `fits` is a standard monster that still fits the level budget. */
export function passesQuick(m: Monster, quick: QuickFilter, levelsLeft: number): boolean {
  if (quick === 'all') return true;
  if (quick === 'fits') return m.kind === 'standard' && m.level <= levelsLeft + EPS;
  return m.kind === quick;
}

export function searchMonsters(list: Monster[], query: ParsedQuery, quick: QuickFilter, levelsLeft: number): Match[] {
  return list.flatMap((m) => {
    if (!passesQuick(m, quick, levelsLeft)) return [];
    const found = matchMonster(m, query);
    return found ? [found] : [];
  });
}

export interface BrowseGroup {
  key: string;
  label: string;
  matches: Match[];
}

/** A–Z ranks by relevance while searching; Level and Family keep the book's shelves.
 * A family with one member (legendaries name theirs, like "Huge Rot Dragon") would be a shelf
 * of one, so legendaries share a Legendary shelf and other strays a Lone monsters shelf. */
export function groupMatches(matches: Match[], view: BrowseView, searching: boolean): BrowseGroup[] {
  const byName = (a: Match, b: Match) => a.monster.name.localeCompare(b.monster.name);
  const byLevel = (a: Match, b: Match) => a.monster.level - b.monster.level || byName(a, b);
  if (view === 'name') {
    const sorted = [...matches].sort(searching ? (a, b) => b.score - a.score || byName(a, b) : byName);
    return sorted.length ? [{ key: 'all', label: '', matches: sorted }] : [];
  }
  if (view === 'level') {
    const shelves = new Map<number, Match[]>();
    for (const m of [...matches].sort(byName)) shelves.set(m.monster.level, [...(shelves.get(m.monster.level) ?? []), m]);
    return [...shelves.keys()].sort((a, b) => a - b).map((level) => ({ key: `level-${level}`, label: `Level ${formatLevel(level)}`, matches: shelves.get(level)! }));
  }
  const sizes = new Map<string, number>();
  for (const m of matches) sizes.set(m.monster.family, (sizes.get(m.monster.family) ?? 0) + 1);
  const shelfOf = (m: Monster) => (m.kind === 'legendary' ? 'Legendary' : (sizes.get(m.family) ?? 0) > 1 ? m.family : 'Lone monsters');
  const shelves = new Map<string, Match[]>();
  for (const m of [...matches].sort(byLevel)) shelves.set(shelfOf(m.monster), [...(shelves.get(shelfOf(m.monster)) ?? []), m]);
  const last = ['Lone monsters', 'Legendary'];
  return [...shelves.keys()].sort((a, b) => last.indexOf(a) - last.indexOf(b) || a.localeCompare(b)).map((key) => ({ key, label: key, matches: shelves.get(key)! }));
}

/** Splits a name into plain and matched runs for highlighting. */
export function highlight(name: string, words: string[]): { text: string; hit: boolean }[] {
  if (!words.length) return [{ text: name, hit: false }];
  const lower = name.toLowerCase();
  const marks = Array.from({ length: name.length }, () => false);
  for (const word of words) {
    const at = lower.indexOf(word);
    if (at >= 0) marks.fill(true, at, at + word.length);
  }
  const runs: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < name.length; i++) {
    const prev = runs[runs.length - 1];
    if (prev && prev.hit === marks[i]) prev.text += name[i];
    else runs.push({ text: name[i], hit: marks[i] });
  }
  return runs;
}
