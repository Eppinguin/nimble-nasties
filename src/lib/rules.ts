import type { Armor, EncounterMember, Hero, Monster } from './types';

export const RULES_URL = 'https://nimble.nexus/rules/monster-levels';

export function monsterBudget(heroes: Hero[]): number {
  return heroes.reduce((sum, hero) => sum + hero.level, 0);
}

export function formatLevel(level: number): string {
  if (Math.abs(level - 0.25) < 0.001) return '¼';
  if (Math.abs(level - 1 / 3) < 0.005) return '⅓';
  if (Math.abs(level - 0.5) < 0.001) return '½';
  return Number.isInteger(level) ? String(level) : String(+level.toFixed(2));
}

/** A sum of levels, with the book's thirds and quarters: 17⅓, 6½, ¾ → .8. */
export function formatLevels(levels: number): string {
  const whole = Math.floor(levels + 0.01),
    part = levels - whole;
  return part < 0.01 ? String(whole) : `${whole || ''}${formatLevel(part).length === 1 ? formatLevel(part) : part.toFixed(1).slice(1)}`;
}

// First-printing GMG v1, p. 25: total hero levels compared against the sum
// of regular monster levels. Difficulty bands are descriptive, not exact steps.
export function difficulty(spent: number, budget: number) {
  if (budget <= 0 || spent <= 0) return { label: 'Not started', color: 'muted', ratio: 0 };
  const ratio = spent / budget;
  if (ratio < 0.5) return { label: 'Easy', color: 'easy', ratio };
  if (ratio < 0.875) return { label: 'Medium', color: 'medium', ratio };
  if (ratio <= 1) return { label: 'Hard', color: 'hard', ratio };
  if (ratio < 1.5) return { label: 'Deadly', color: 'deadly', ratio };
  return { label: 'Very deadly', color: 'deadly', ratio };
}

export function encounterStats(members: EncounterMember[], library: Monster[], heroes: Hero[], judge = difficulty) {
  const byId = new Map(library.map((m) => [m.id, m]));
  const heroCount = heroes.length;
  const budget = monsterBudget(heroes);
  let spent = 0;
  let regular = 0;
  let minions = 0;
  let legendaries = 0;
  const warnings: string[] = [];
  for (const item of members) {
    const monster = byId.get(item.monsterId);
    if (!monster) continue;
    if (monster.kind === 'minion') minions += item.count;
    else if (monster.kind === 'legendary') legendaries += item.count;
    else {
      spent += monster.level * item.count;
      regular += item.count;
    }
  }
  if (legendaries) warnings.push('Legendary monsters have special encounter rules; their level is not added to the regular monster budget.');
  if (regular > heroCount * 4) warnings.push('First-printing GMG suggests 1–4 standard monsters per hero.');
  if (minions) warnings.push(`${hordeNote(minions / Math.max(1, heroCount))} Minions aren't counted in monster levels.`);
  return { budget, spent, regular, minions, legendaries, warnings, difficulty: spent > 0 ? judge(spent, budget) : unbudgeted(legendaries, minions / Math.max(1, heroCount)) };
}

// GMG v1 p. 25 rates minions per hero rather than by level.
function hordeNote(perHero: number): string {
  const each = `${+perHero.toFixed(1)} per hero`;
  if (perHero >= 4) return `Minions at ${each}: much more challenging.`;
  if (perHero >= 2) return `Minions at ${each}: noticeably harder.`;
  if (perHero >= 1) return `Minions at ${each}: slightly harder, more tactical options.`;
  return `Minions at ${each}: a light extra.`;
}

/** With no standard monsters there are no levels to compare, but a lone
 * legendary or a horde is still a fight: name it instead of "Not started". */
function unbudgeted(legendaries: number, minionsPerHero: number) {
  if (legendaries) return { label: 'Boss fight', color: 'deadly', ratio: 0 };
  if (minionsPerHero > 0) {
    const color = minionsPerHero >= 4 ? 'deadly' : minionsPerHero >= 2 ? 'hard' : minionsPerHero >= 1 ? 'medium' : 'easy';
    return { label: 'Minion horde', color, ratio: 0 };
  }
  return { label: 'Not started', color: 'muted', ratio: 0 };
}

export function monsterHp(monster: Monster, heroCount: number): number {
  if (monster.kind === 'minion') return 1;
  return monster.hp ?? (monster.hpPerHero ? monster.hpPerHero * Math.max(1, heroCount) : 1);
}

export function monsterLastStand(monster: Monster, _heroCount: number): number | undefined {
  return monster.lastStand;
}

/** First-printing armor rules (the GMG data is first-printing).
 * Medium: only rolled dice count; ignore positive damage modifiers.
 * Heavy: half of rolled dice damage, rounded up; ignore modifiers.
 * A numeric HP command with an arithmetic suffix (e.g. 20+5) treats the
 * initial number as dice damage and the signed suffix as modifiers.
 */
export function appliedDamage(raw: number, armor: Armor, crit: boolean, opts: { vulnerable?: boolean; resistant?: boolean; ignoreArmor?: boolean; diceOnly?: number } = {}): number {
  const total = Math.max(0, Math.round(raw));
  const dice = Math.max(0, Math.round(opts.diceOnly ?? raw));
  let damage = total;
  if (!crit && !opts.ignoreArmor && !opts.vulnerable) {
    if (armor === 'medium') damage = dice;
    if (armor === 'heavy') damage = Math.ceil(dice / 2);
  }
  if (opts.vulnerable && armor === 'none') damage *= 2;
  if (opts.resistant) damage = Math.ceil(damage / 2);
  return Math.max(0, damage);
}

/** Reprint armor (July 2026 changelog): armor, vulnerability and resistance
 * are flat amounts off each attack's total. Crits still ignore armor.
 * The October 2026 playtest keeps the shape with larger armor values. */
export function flatArmorDamage(medium: number, heavy: number) {
  return (raw: number, armor: Armor, crit: boolean, opts: { vulnerable?: boolean; resistant?: boolean; ignoreArmor?: boolean; diceOnly?: number } = {}): number => {
    let damage = Math.max(0, Math.round(raw));
    if (!crit && !opts.ignoreArmor) damage -= armor === 'heavy' ? heavy : armor === 'medium' ? medium : 0;
    if (opts.vulnerable) damage += 10;
    if (opts.resistant) damage -= 10;
    return Math.max(0, damage);
  };
}
