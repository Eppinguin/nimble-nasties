import type { Monster, MonsterSummon } from './types.ts';

/** A summon written in stat block prose, as the GMG prints it:
 *   "summon 1 blood bat minion (d10)"
 *   "Summon spiderling minions (1/hero, size: d8)"
 *   "summon 3 spiderling minions/hero"
 * The die is the minion's attack die. A phrase without one borrows it from
 * another summon of the same creature on the same stat block.
 */
export interface SummonSpec {
  key: string;
  name: string;
  count: number;
  perHero: boolean;
  die?: string;
}
export interface SummonMatch extends SummonSpec {
  index: number;
  text: string;
}

const WORD_COUNT: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const NOT_A_NAME = new Set(['the', 'his', 'her', 'its', 'their', 'your', 'all', 'more', 'any', 'some', 'those', 'these', 'of']);
const SUMMON = /\bsummon(?:s|ing)?\s+(?:(\d+|an?|one|two|three|four|five|six)\s+)?([a-z][a-z'’-]*(?:\s+[a-z][a-z'’-]*){0,3}?)\s+minions?(\s*\/\s*hero\b)?(?:\s*\(([^)]*)\))?/gi;

const titleCase = (name: string) => name.replace(/(^|[\s-])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase());
const keyOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z\d]+/g, '-')
    .replace(/^-|-$/g, '');

export function findSummons(text: string): SummonMatch[] {
  const found: SummonMatch[] = [];
  for (const match of text.matchAll(SUMMON)) {
    const [whole, rawCount, rawName, slashHero, paren = ''] = match;
    const name = rawName.trim().toLowerCase();
    if (name.split(/\s+/).some((word) => NOT_A_NAME.has(word))) continue;
    const parenCount = /(\d+)\s*\/\s*hero/i.exec(paren);
    const count = Number(parenCount?.[1] ?? (rawCount ? (WORD_COUNT[rawCount.toLowerCase()] ?? rawCount) : 1));
    if (!Number.isSafeInteger(count) || count < 1 || count > 30) continue;
    found.push({
      key: keyOf(name),
      name: titleCase(name),
      count,
      perHero: Boolean(slashHero || parenCount),
      die: /\b(d\d+)\b/i.exec(paren)?.[1].toLowerCase(),
      index: match.index,
      text: whole,
    });
  }
  return found;
}

const proseOf = (monster: Monster) => [...monster.traits.map((t) => t.description), monster.actionInstructions, ...monster.actions.map((a) => a.description), monster.bloodied, monster.lastStandText].filter((text): text is string => Boolean(text));

/** Every phrase on the stat block, each with its die filled in from its siblings. */
export function summonsIn(monster: Monster): SummonMatch[][] {
  if (monster.summon) return [];
  const perText = proseOf(monster).map(findSummons);
  const dieByKey = new Map<string, string>();
  for (const spec of perText.flat()) if (spec.die && !dieByKey.has(spec.key)) dieByKey.set(spec.key, spec.die);
  return perText.map((specs) => specs.map((spec) => ({ ...spec, die: spec.die ?? dieByKey.get(spec.key) })));
}
/** One entry per summoned creature: the first phrase that names it. */
export function monsterSummons(monster: Monster): SummonSpec[] {
  const seen = new Map<string, SummonSpec>();
  for (const spec of summonsIn(monster).flat()) if (!seen.has(spec.key)) seen.set(spec.key, spec);
  return [...seen.values()];
}
export function summonFor(monster: Monster, text: string): SummonMatch[] {
  const texts = proseOf(monster);
  const at = texts.indexOf(text);
  return at < 0 ? [] : (summonsIn(monster)[at] ?? []);
}

/** Capped like adding from the library, so a 3/hero summon at a big table stays usable. */
export const SUMMON_LIMIT = 30;
export const summonCount = (spec: SummonSpec, heroes: number) => Math.min(SUMMON_LIMIT, spec.count * (spec.perHero ? Math.max(1, heroes) : 1));
export const summonId = (summonerId: string, key: string) => `summon-${summonerId}--${key}`;
export const shortName = (name: string) => name.split(',')[0].trim();
export const plural = (name: string, count: number) => (count === 1 ? name : /(s|x|ch|sh)$/i.test(name) ? `${name}es` : `${name}s`);

/** "…and bats roll d20s instead of d10s." in Bloodied or Last Stand text. */
function boostFor(summoner: Monster, spec: SummonSpec): MonsterSummon['boost'] {
  if (!spec.die) return undefined;
  const last = spec.name.toLowerCase().split(/\s+/).at(-1) ?? '';
  for (const [phase, text] of [
    ['laststand', summoner.lastStandText],
    ['bloodied', summoner.bloodied],
  ] as const) {
    for (const match of (text ?? '').matchAll(/\b([a-z]+)\s+roll\s+(d\d+)s?\s+instead\s+of\s+(d\d+)s?/gi)) {
      const who = match[1].toLowerCase();
      if ((who === last || who === `${last}s` || who === `${last}es`) && match[3].toLowerCase() === spec.die) return { die: match[2].toLowerCase(), phase };
    }
  }
  return undefined;
}

/** A summoned creature is a plain minion stat block derived from its summoner,
 * so it never needs saving: the same text always yields the same id. */
export function summonMonster(summoner: Monster, spec: SummonSpec): Monster {
  const by = shortName(summoner.name);
  const boost = boostFor(summoner, spec);
  const when = boost?.phase === 'laststand' ? 'in Last Stand' : 'Bloodied';
  const boostText = boost && spec.die ? `While ${by} is ${when}, roll ${boost.die} instead of ${spec.die}.` : undefined;
  return {
    id: summonId(summoner.id, spec.key),
    name: spec.name,
    level: 0.25,
    kind: 'minion',
    armor: 'none',
    hp: 1,
    family: `Summoned by ${by}`,
    role: 'Minion',
    traits: [],
    actions: spec.die ? [{ id: 'action-0', name: 'Attack', notation: `1${spec.die}`, description: '(follows minion rules)' }] : [],
    bloodied: boost?.phase === 'bloodied' ? boostText : undefined,
    lastStandText: boost?.phase === 'laststand' ? boostText : undefined,
    source: summoner.source,
    edition: summoner.edition,
    summon: { by: summoner.id, byName: by, die: spec.die, boost },
  };
}

/** The library plus every creature its stat blocks can summon. Idempotent. */
export function withSummons(monsters: Monster[]): Monster[] {
  const base = monsters.filter((m) => !m.summon);
  return [...base, ...base.flatMap((m) => monsterSummons(m).map((spec) => summonMonster(m, spec)))];
}

/** The summoned stat block as it plays right now: the boosted die while the
 * summoner is in the phase that grants it. */
export function liveSummon(monster: Monster, summonerPhase: { bloodied: boolean; lastStand: boolean }): { monster: Monster; boosted: boolean } {
  const boost = monster.summon?.boost;
  const die = monster.summon?.die;
  const boosted = Boolean(boost && die && (boost.phase === 'laststand' ? summonerPhase.lastStand : summonerPhase.bloodied));
  if (!boosted || !boost || !die) return { monster, boosted: false };
  const swap = (notation?: string) => notation?.replace(new RegExp(`(\\d*)${die}\\b`, 'i'), `$1${boost.die}`);
  return { monster: { ...monster, actions: monster.actions.map((a) => ({ ...a, notation: swap(a.notation) })) }, boosted };
}
