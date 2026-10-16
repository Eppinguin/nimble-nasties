import type { Armor, Hero, Monster, EncounterMember } from './types';
import { monsterHp, monsterLastStand } from './rules.ts';
import { DEFAULT_RULES, readRules } from './rulesets.ts';
import type { Ruleset, RulesetId } from './rulesets.ts';
import { withSummons } from './summons.ts';
import type { Pack, PackRoll } from './horde.ts';

export type Lane = 'active' | 'defeated';
export const uid = (): string => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const conditionNames = ['Prone', 'Grappled', 'Dazed', 'Restrained', 'Hampered', 'Frightened', 'Poisoned', 'Blinded', 'Smoldering', 'Other'];

export interface NemesisCard {
  id: string;
  monsterId: string;
  name: string;
  hp: number;
  maxHp: number;
  lastStandRemaining?: number;
  conditions: string[];
  lane: Lane;
  armorOverride?: Armor;
  groupId?: string;
  acted?: boolean;
  /** Minion pack within its stat block; see horde.ts. */
  packId?: string;
}
export interface NemesisEncounter {
  id: string;
  name: string;
  description: string;
  /** The Nimble printing this encounter runs under; see rulesets.ts. */
  rules: RulesetId;
  heroes: Hero[];
  cards: NemesisCard[];
  groups?: { id: string; name: string }[];
  order?: string[];
  /** Minion packs, see horde.ts. */
  packs?: Pack[];
  /** This round's minion rolls; cleared each round and not saved. */
  packLog?: PackRoll[];
  /** GMG v1 p. 26 optional rule: excess damage carries over to other
   * minions in the same pack, die size as each one's durability. */
  overkill?: boolean;
  round: number;
  notes: string;
  createdAt: string;
}
export interface NemesesState {
  encounters: NemesisEncounter[];
  activeId: string;
  customMonsters: Monster[];
  /** Stored encounters on a printing this build does not know (saved by a
   * newer version). Kept verbatim so loading and saving never drops them. */
  held?: unknown[];
}
export const DEFAULT_HEROES: Hero[] = [1, 2, 3, 4].map((i) => ({ id: `hero-${i}`, name: `Hero ${i}`, level: 1, hp: 28, maxHp: 28, defense: 2 }));

export function createEncounter(name = 'Untitled encounter', heroes: Hero[] = DEFAULT_HEROES): NemesisEncounter {
  return { id: uid(), name, description: '', rules: DEFAULT_RULES, heroes: heroes.map((h) => ({ ...h, id: uid() })), cards: [], groups: [{ id: 'group-1', name: 'Group 1' }], round: 1, notes: '', createdAt: new Date().toISOString() };
}
export function spawnCard(monster: Monster, heroes: number, lane: Lane = 'active', name?: string): NemesisCard {
  const hp = monsterHp(monster, heroes);
  const lastStand = monsterLastStand(monster, heroes);
  return { id: uid(), monsterId: monster.id, name: name || monster.name, hp, maxHp: hp, lastStandRemaining: lastStand, conditions: [], lane, groupId: 'group-1', acted: false };
}
export function changeHp(card: NemesisCard, change: number): NemesisCard {
  if (!Number.isFinite(change)) return card;
  if (change >= 0) return { ...card, hp: Math.min(card.maxHp, card.hp + change), lane: card.lane === 'defeated' && change > 0 ? 'active' : card.lane };
  const amount = Math.abs(change);
  const overkill = Math.max(0, amount - card.hp);
  const hp = Math.max(0, card.hp - amount);
  const lastStandRemaining = card.lastStandRemaining == null ? undefined : Math.max(0, card.lastStandRemaining - overkill);
  return { ...card, hp, lastStandRemaining, lane: hp === 0 && !(lastStandRemaining && lastStandRemaining > 0) ? 'defeated' : card.lane };
}
/** Safe addition/subtraction; no eval, multiplication or dice parsing.
 * The first term is exposed separately for explicit damage rolls such as
 * `d18+5`, whose positive modifier is ignored by first-printing armor.
 */
export function parseHpArithmetic(input: string): { total: number; diceOnly: number } | null {
  const expression = input.replace(/[−–]/g, '-').replace(/\s+/g, '');
  if (!/^\d+(?:[+-]\d+)*$/.test(expression)) return null;
  const parts = expression.match(/(?:^\d+|[+-]\d+)/g);
  if (!parts?.length) return null;
  const diceOnly = Number(parts[0]);
  let total = 0;
  for (const part of parts) {
    total += Number(part);
    if (!Number.isSafeInteger(total)) return null;
  }
  if (!Number.isSafeInteger(diceOnly) || total < 0) return null;
  return { total, diceOnly };
}

/** Table grammar: 18 or explicit d18+5 incoming, ! critical, v vulnerable,
 * r resistant, ^ armor bypass, +5 heal, -5 direct HP loss.
 * Original first-printing Medium/Heavy armor uses the first number as the
 * rolled dice portion and ignores modifiers (or halves dice for Heavy).
 */
export function applyHitCommand(card: NemesisCard, monster: Monster, input: string, rules: Ruleset): { card: NemesisCard; change: number; kind: 'damage' | 'critical' | 'heal' | 'direct' } | null {
  const value = input
    .trim()
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, '')
    .toLowerCase();
  const rawDirect = /^[+-]\d+$/.test(value);
  if (rawDirect) {
    const expression = parseHpArithmetic(value.slice(1));
    if (!expression) return null;
    const signed = value[0] === '+' ? 1 : -1;
    const amount = expression.total;
    return { card: changeHp(card, signed * amount), change: amount, kind: signed > 0 ? 'heal' : 'direct' };
  }
  const prefix = value.match(/^[!vr^]*/)?.[0] ?? '';
  if (new Set(prefix).size !== prefix.length) return null;
  const expression = parseHpArithmetic(value.slice(prefix.length));
  if (!expression) return null;
  const crit = prefix.includes('!');
  const { card: result, dealt } = damageCard(
    card,
    expression.total,
    monster,
    {
      crit,
      vulnerable: prefix.includes('v'),
      resistant: prefix.includes('r'),
      ignoreArmor: prefix.includes('^'),
      diceOnly: expression.diceOnly,
    },
    rules,
  );
  return { card: result, change: dealt, kind: crit ? 'critical' : 'damage' };
}
/** The HP box shows the current number (for example `100`). If the user
 * clicks at its end and types `-20` or `+20`, the resulting `100-20` / `100+20`
 * is an absolute HP calculation, never 120 incoming damage. This preserves
 * the user's existing text when they miss selecting the entire input.
 * Bare `18` remains a hit. `=18` sets exact HP. `d18+5` explicitly means
 * 18 rolled damage plus a 5-point modifier (used by armor calculation).
 */
export function applyHpEntry(card: NemesisCard, monster: Monster, input: string, rules: Ruleset): { card: NemesisCard; change: number; kind: 'damage' | 'critical' | 'heal' | 'direct' | 'set' } | null {
  const raw = input.trim().replace(/[−–]/g, '-');
  const explicitSet = raw.startsWith('=');
  const appendedMath = /^\s*\d+\s*[+-]\s*\d+/.test(raw);
  if (explicitSet || appendedMath) {
    const expression = parseHpArithmetic(explicitSet ? raw.slice(1) : raw);
    if (!expression) return null;
    const next = setCurrentHp(card, expression.total);
    return { card: next, change: next.hp - card.hp, kind: 'set' };
  }
  if (/^d(?=\d)/i.test(raw)) return applyHitCommand(card, monster, raw.slice(1), rules);
  return applyHitCommand(card, monster, raw, rules);
}
/** Respect Last Stand when setting exact current HP, rather than automatically
 * defeating a legendary creature the moment its regular HP reaches zero. */
export function setCurrentHp(card: NemesisCard, hp: number): NemesisCard {
  if (!Number.isFinite(hp)) return card;
  return changeHp(card, Math.max(0, Math.min(card.maxHp, Math.round(hp))) - card.hp);
}
export function damageCard(card: NemesisCard, base: number, monster: Monster, options: { crit: boolean; vulnerable: boolean; resistant: boolean; ignoreArmor: boolean; diceOnly?: number }, rules: Ruleset): { card: NemesisCard; dealt: number } {
  const dealt = rules.appliedDamage(Math.max(0, base), card.armorOverride || monster.armor, options.crit, options);
  return { card: changeHp(card, -dealt), dealt };
}
export function toggleCardCondition(card: NemesisCard, name: string): NemesisCard {
  return { ...card, conditions: card.conditions.includes(name) ? card.conditions.filter((c) => c !== name) : [...card.conditions, name] };
}
/** One gesture removes a whole shared stat block, regardless of how many copies it holds. */
export function extractStatblock(cards: NemesisCard[], monsterId: string): { removed: NemesisCard[]; remaining: NemesisCard[] } {
  return {
    removed: cards.filter((card) => card.monsterId === monsterId),
    remaining: cards.filter((card) => card.monsterId !== monsterId),
  };
}
export function encounterMembers(cards: NemesisCard[]): EncounterMember[] {
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.monsterId, (counts.get(card.monsterId) ?? 0) + 1);
  return [...counts].map(([monsterId, count]) => ({ id: monsterId, monsterId, count }));
}
function rawObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
export function normalizeEncounter(value: unknown, library: Monster[]): NemesisEncounter | null {
  const raw = rawObject(value);
  if (typeof raw.name !== 'string' || !Array.isArray(raw.heroes)) return null;
  const rules = readRules(raw.rules);
  if ('unknown' in rules) return null;
  const baseline = createEncounter(raw.name);
  const heroes = (raw.heroes as Hero[]).filter((h) => h && typeof h.name === 'string' && Number.isFinite(Number(h.level))).map((h) => ({ ...h, id: h.id || uid() }));
  const monsterById = new Map(library.map((m) => [m.id, m]));
  const cards: NemesisCard[] = [];
  if (Array.isArray(raw.cards)) {
    for (const potential of raw.cards) {
      const r = rawObject(potential);
      const monster = monsterById.get(String(r.monsterId));
      if (!monster) continue;
      const fresh = spawnCard(monster, heroes.length);
      const maxHp = Math.max(1, Number(r.maxHp) || fresh.maxHp);
      cards.push({
        ...fresh,
        id: typeof r.id === 'string' ? r.id : uid(),
        name: typeof r.name === 'string' ? r.name : monster.name,
        maxHp,
        hp: Math.max(0, Math.min(maxHp, Number(r.hp) || 0)),
        lane: r.lane === 'defeated' ? 'defeated' : 'active',
        conditions: Array.isArray(r.conditions) ? r.conditions.filter((s): s is string => typeof s === 'string') : [],
        lastStandRemaining: typeof r.lastStandRemaining === 'number' ? r.lastStandRemaining : fresh.lastStandRemaining,
        groupId: typeof r.groupId === 'string' ? r.groupId : 'group-1',
        acted: r.acted === true,
        packId: typeof r.packId === 'string' && r.packId ? r.packId : undefined,
        armorOverride: r.armorOverride === 'none' || r.armorOverride === 'medium' || r.armorOverride === 'heavy' ? r.armorOverride : undefined,
      });
    }
  }
  const rawGroups = Array.isArray(raw.groups)
    ? raw.groups
        .map(rawObject)
        .filter((g) => typeof g.id === 'string' && typeof g.name === 'string')
        .map((g) => ({ id: g.id as string, name: g.name as string }))
    : [];
  const packs = Array.isArray(raw.packs)
    ? raw.packs
        .map(rawObject)
        .filter((p) => typeof p.id === 'string' && p.id && typeof p.monsterId === 'string' && typeof p.name === 'string')
        .map((p) => ({ id: p.id as string, monsterId: p.monsterId as string, name: p.name as string }))
    : [];
  return {
    ...baseline,
    rules: rules.id,
    ...(packs.length ? { packs } : {}),
    ...(raw.overkill === true ? { overkill: true } : {}),
    groups: rawGroups.length ? rawGroups : baseline.groups,
    order: Array.isArray(raw.order) ? raw.order.filter((id): id is string => typeof id === 'string') : [],
    id: typeof raw.id === 'string' ? raw.id : uid(),
    heroes: heroes.length ? heroes : baseline.heroes,
    cards,
    name: raw.name.trim() || baseline.name,
    description: typeof raw.description === 'string' ? raw.description : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    round: Math.max(1, Number(raw.round) || 1),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : baseline.createdAt,
  };
}
export function starterEncounter(library: Monster[]): NemesisEncounter {
  const initial = createEncounter('The Goblin Toll');
  initial.groups = [
    { id: 'group-1', name: 'The toll collectors' },
    { id: 'group-2', name: 'The ambush' },
  ];
  initial.description = 'A crooked bridge. A toll demanded. Trouble waiting in the reeds.';
  const name = (v: string) => library.find((m) => m.name === v);
  const goblin = name('Goblin');
  const minion = name('Goblin Minion');
  const taskmaster = name('Goblin Taskmaster');
  if (goblin) {
    initial.cards.push(spawnCard(goblin, 4, 'active', 'Grin the Knife'), spawnCard(goblin, 4, 'active', 'Goblin Scout'));
  }
  if (taskmaster) initial.cards.push({ ...spawnCard(taskmaster, 4, 'active', 'Tollkeeper Grak'), groupId: 'group-1' });
  if (minion) {
    initial.cards.push({ ...spawnCard(minion, 4, 'active', 'Goblin Minion A'), groupId: 'group-2' }, { ...spawnCard(minion, 4, 'active', 'Goblin Minion B'), groupId: 'group-2' });
  }
  return initial;
}
export const STORAGE_KEY = 'nimble-nasties-v1';
/** Stored homebrew is our own JSON, but a damaged entry must not take the whole
 * app down: anything without an id and name is dropped, missing lists are empty. */
export function storedMonsters(value: unknown): Monster[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(rawObject)
    .filter((m) => typeof m.id === 'string' && m.id && typeof m.name === 'string')
    .map((m) => ({ ...m, level: Number.isFinite(m.level) ? m.level : 1, traits: Array.isArray(m.traits) ? m.traits : [], actions: Array.isArray(m.actions) ? m.actions : [] }) as unknown as Monster);
}
export function loadBoard(library: Monster[]): NemesesState {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const raw = rawObject(JSON.parse(stored));
        const customMonsters = storedMonsters(raw.customMonsters);
        const available = withSummons([...library, ...customMonsters]);
        const saved = [...(Array.isArray(raw.encounters) ? raw.encounters : []), ...(Array.isArray(raw.held) ? raw.held : [])];
        const held = saved.filter((e) => 'unknown' in readRules(rawObject(e).rules));
        const encounters = saved
          .filter((e) => !held.includes(e))
          .map((e) => normalizeEncounter(e, available))
          .filter((e): e is NemesisEncounter => e !== null);
        if (!encounters.length && held.length) encounters.push(createEncounter('Encounter 1'));
        if (encounters.length) return { encounters, activeId: typeof raw.activeId === 'string' && encounters.some((e) => e.id === raw.activeId) ? raw.activeId : encounters[0].id, customMonsters, ...(held.length ? { held } : {}) };
      }
    } catch {
      /* Skip damaged or inaccessible storage. */
    }
  }
  const encounter = createEncounter('Encounter 1');
  return { encounters: [encounter], activeId: encounter.id, customMonsters: [] };
}
/** The stored form: this round's minion rolls stay in the session. */
export function serializeBoard(state: NemesesState): string {
  return JSON.stringify(state, (key, value) => (key === 'packLog' ? undefined : value));
}
/** False when the browser refused the write (storage full, blocked or private mode). */
export function saveBoard(state: NemesesState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serializeBoard(state));
    return true;
  } catch {
    return false;
  }
}
export function exportJson(name: string, payload: unknown): void {
  downloadJson(name, JSON.stringify(payload, null, 2));
}
/** Saves JSON text as a file through the browser's download. */
export function downloadJson(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Monster ids in lane order: listed ones first, in `order`, the rest after in their given order. */
export function sortByOrder(ids: string[], order: string[] = []): string[] {
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? order.length : i;
  };
  return [...ids].sort((a, b) => rank(a) - rank(b));
}
/** Move one statblock page in the horizontal run board before another. */
export function reorderStatblocks(ids: string[], moving: string, before: string): string[] {
  if (moving === before || !ids.includes(moving) || !ids.includes(before)) return [...ids];
  const rest = ids.filter((id) => id !== moving);
  rest.splice(rest.indexOf(before), 0, moving);
  return rest;
}
