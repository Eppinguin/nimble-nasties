import type { RollPart, RollResult } from './types';

export type RollMode = 'normal' | 'advantage' | 'disadvantage';
export type RollOptions = { mode?: RollMode; advantage?: number; minion?: boolean; noCrit?: boolean; missOn?: number[]; label?: string; level?: number };
export type RandomInt = (max: number) => number;

const die: RandomInt = (max) => Math.floor(Math.random() * max) + 1;
const sanitize = (input: string) => input.replace(/\s/g, '').replace(/[−–]/g, '-');

/** Nimble attack dice: leftmost die is primary; 1 misses, max explodes.
 *  Supports XdY, multiple groups, flat modifiers, ^primary modifier,
 *  c crit-only flat modifier and n non-attack dice (no miss/crit).
 */
export function rollDice(expression: string, options: RollOptions = {}, rng: RandomInt = die): RollResult {
  const notation = sanitize(expression);
  if (!notation) throw new Error('Enter a dice expression, such as 2d6+3.');
  const raw = notation.replace(/LVL/gi, String(options.level ?? 1));
  const tokens = raw.match(/[+-]?\d*d\d+(?:\^[-+]?\d+)?n?|[+-]\d+c?|^\d+c?/gi);
  if (!tokens || tokens.join('') !== raw) throw new Error(`Unsupported dice notation: ${expression}`);
  let total = 0;
  let primary: { value: number; size: number; normal: boolean } | null = null;
  let first = true;
  const parts: string[] = [];
  const structured: RollPart[] = [];
  let critBonus = 0;
  let appliedEdge = 0;
  // Stacks cancel before dice are rolled. Minions ignore both effects.
  const requestedEdge = options.advantage ?? (options.mode === 'advantage' ? 1 : options.mode === 'disadvantage' ? -1 : 0);
  const edge = options.minion ? 0 : Math.max(-10, Math.min(10, Math.trunc(requestedEdge)));
  for (const token of tokens) {
    const diceToken = /^([+-]?)(\d*)d(\d+)(?:\^([+-]?\d+))?(n)?$/i.exec(token);
    if (!diceToken) {
      const flat = /^([+-]?\d+)(c)?$/i.exec(token);
      if (!flat) throw new Error(`Invalid modifier ${token}`);
      if (flat[2]) critBonus += Number(flat[1]);
      else {
        total += Number(flat[1]);
        parts.push(token);
        structured.push({ kind: 'flat', value: Number(flat[1]) });
      }
      continue;
    }
    const count = Number(diceToken[2] || 1);
    const sides = Number(diceToken[3]);
    const sign = diceToken[1] === '-' ? -1 : 1;
    const primaryShift = Number(diceToken[4] || 0);
    const nonAttack = Boolean(diceToken[5]);
    if (count > 100 || sides < 2 || sides > 10000 || count < 1) throw new Error('Dice count or size out of range.');
    // Nimble adds one die per advantage/disadvantage to the FIRST pool,
    // then discards dice before selecting the leftmost surviving primary die.
    const usingEdge = first && !nonAttack && sign > 0 ? edge : 0;
    if (usingEdge) appliedEdge = usingEdge;
    const rolls: number[] = [];
    for (let i = 0; i < count + Math.abs(usingEdge); i++) {
      const face = rng(sides);
      if (face < 1 || face > sides || !Number.isInteger(face)) throw new Error('Random generator returned an invalid die.');
      rolls.push(face);
    }
    const discarded = new Set<number>();
    if (usingEdge !== 0) {
      const sorted = rolls.map((value, index) => ({ value, index })).sort((a, b) => (usingEdge > 0 ? a.value - b.value || a.index - b.index : b.value - a.value || a.index - b.index));
      for (const item of sorted.slice(0, Math.abs(usingEdge))) discarded.add(item.index);
    }
    const kept = rolls.filter((_, index) => !discarded.has(index));
    const leadIndex = rolls.findIndex((_, i) => !discarded.has(i));
    const isPrimaryGroup = first;
    if (first) {
      // Apply any ^ modifier after discards; only the primary determines miss/crit.
      const value = Math.max(1, Math.min(sides, kept[0] + primaryShift));
      primary = { value, size: sides, normal: !nonAttack };
      kept[0] = value;
      first = false;
    }
    total += kept.reduce((sum, value) => sum + value * sign, 0);
    structured.push({
      kind: 'dice',
      sign: sign > 0 ? 1 : -1,
      dice: rolls.map((value, index) => (discarded.has(index) ? { value, sides, state: 'dropped' } : isPrimaryGroup && index === leadIndex ? { value: kept[0], sides, state: primary?.normal ? 'primary' : undefined } : { value, sides })),
    });
    parts.push(`${token}${usingEdge ? ` (${usingEdge > 0 ? '+' : ''}${usingEdge} edge)` : ''}: [${rolls.map((value, index) => (discarded.has(index) ? `${value} dropped` : index === rolls.findIndex((_, i) => !discarded.has(i)) && usingEdge ? `${kept[0]} primary` : String(value))).join(', ')}]`);
  }
  const isMiss = !!primary?.normal && (primary.value === 1 || Boolean(options.missOn?.includes(primary.value)));
  const isCritical = !!primary?.normal && primary.value === primary.size && !isMiss && !options.minion && !options.noCrit;
  if (isCritical && primary) {
    const exploded: number[] = [];
    for (let i = 0; i < 100; i++) {
      const face = rng(primary.size);
      exploded.push(face);
      total += face;
      if (face !== primary.size) break;
    }
    parts.push(`critical explosion: [${exploded.join(', ')}]`);
    const sides = primary.size;
    structured.push({ kind: 'explosion', dice: exploded.map((value) => ({ value, sides, state: 'exploded' })) });
    total += critBonus;
    if (critBonus) {
      parts.push(`crit bonus: ${critBonus}`);
      structured.push({ kind: 'flat', value: critBonus, critOnly: true });
    }
  }
  if (isMiss) total = 0;
  return { label: options.label ?? 'Dice roll', notation: expression, breakdown: parts.join(' · '), parts: structured, edge: appliedEdge, total, isCritical, isMiss, date: new Date().toISOString() };
}

export function findDiceNotation(input: string): string | undefined {
  // Matches the first contiguous Nimble dice expression in prose.
  const match = input.match(/\b\d*d\d+(?:\^[-+]?\d+)?n?(?:(?:\s*[+−-]\s*\d+c?)|(?:\s*[+−-]\s*\d*d\d+))*/i);
  return match?.[0].replace(/\s/g, '').replace(/−/g, '-');
}

/** The face of a roll's deciding die (what a minion's miss actually showed). */
function leadFace(result: RollResult): number {
  const group = result.parts?.find((part) => part.kind === 'dice');
  return group?.kind === 'dice' ? (group.dice.find((d) => d.state !== 'dropped')?.value ?? 1) : 1;
}

/** Minions act together (GMG v1 p. 26): every minion attacking one hero
 * rolls its own die at once, each 1 misses, and the rest add up into a
 * single attack the hero Defends once. Minions never crit. */
export function rollHorde(expression: string, attackers: number, options: RollOptions = {}, rng: RandomInt = die): RollResult & { hits: number } {
  const count = Math.max(1, Math.min(100, Math.trunc(attackers)));
  const each = Array.from({ length: count }, () => rollDice(expression, { ...options, minion: true, advantage: 0, mode: 'normal' }, rng));
  const hits = each.filter((r) => !r.isMiss).length;
  return {
    label: options.label ?? 'Minion attack',
    notation: `${count}× ${expression}`,
    breakdown: `[${each.map((r) => (r.isMiss ? '1 miss' : String(r.total))).join(', ')}]`,
    parts: [{ kind: 'minions', hits: each.map((r) => ({ value: r.isMiss ? leadFace(r) : r.total, miss: r.isMiss })) }],
    total: each.reduce((sum, r) => sum + r.total, 0),
    isCritical: false,
    isMiss: hits === 0,
    date: new Date().toISOString(),
    hits,
  };
}
