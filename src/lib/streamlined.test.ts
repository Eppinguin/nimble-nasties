import test from 'node:test';
import assert from 'node:assert/strict';
import { rollDice } from './dice.ts';
import { applyHitCommand, extractStatblock, spawnCard } from './board.ts';
import { RULESETS } from './rulesets.ts';
import type { Monster } from './types.ts';

const firstPrinting = RULESETS['nimble-1p'];
const rng = (...values: number[]) => {
  let i = 0;
  return (_sides: number) => values[i++] ?? 1;
};
const monster: Monster = {
  id: 'test',
  name: 'Target',
  kind: 'standard',
  level: 3,
  hp: 30,
  armor: 'heavy',
  source: 'homebrew',
  edition: 'unknown',
  family: 'Test',
  role: 'Test',
  traits: [],
  actions: [],
};
test('advantage modifies the entire first pool and drops the lowest before choosing primary', () => {
  const result = rollDice('2d6+3', { advantage: 1 }, rng(1, 2, 6));
  assert.equal(result.isMiss, false);
  assert.equal(result.total, 11);
  assert.match(result.breakdown, /1 dropped/);
});
test('disadvantage discards the leftmost tied maximum before primary selection', () => {
  const result = rollDice('2d6', { advantage: -1 }, rng(6, 6, 1, 3));
  assert.equal(result.isCritical, true); // leftmost surviving 6 crits
  assert.equal(result.total, 6 + 1 + 3);
  assert.match(result.breakdown, /6 dropped/);
});
test('two stacks discard two dice, not one', () => {
  const result = rollDice('2d8+2', { advantage: 2 }, rng(1, 2, 4, 8));
  assert.equal(result.isMiss, false);
  assert.equal(result.total, 14);
});
test('minions ignore both advantage and disadvantage', () => {
  assert.equal(rollDice('1d8', { minion: true, advantage: 2 }, rng(4)).total, 4);
  assert.equal(rollDice('1d8', { minion: true, advantage: -2 }, rng(4)).total, 4);
});
test('advantage can preserve a crit by discarding a low die', () => {
  const result = rollDice('2d6', { advantage: 1 }, rng(6, 1, 5, 2));
  assert.equal(result.isCritical, true);
  assert.equal(result.total, 6 + 5 + 2);
});
test('GMG v1 heavy armor, resistance, vulnerability and crit commands', () => {
  const card = spawnCard(monster, 4);
  assert.equal(applyHitCommand(card, monster, '18', firstPrinting)?.change, 9);
  assert.equal(applyHitCommand(card, monster, 'v18', firstPrinting)?.change, 18);
  assert.equal(applyHitCommand(card, monster, 'r18', firstPrinting)?.change, 5);
  assert.equal(applyHitCommand(card, monster, '^18', firstPrinting)?.change, 18);
  assert.equal(applyHitCommand(card, monster, '!18', firstPrinting)?.change, 18);
  assert.equal(applyHitCommand(card, monster, 'v!18', firstPrinting)?.change, 18);
  assert.equal(applyHitCommand(card, monster, 'vv18', firstPrinting), null);
});
test('whole-statblock removal preserves other types and can be undone as a group', () => {
  const other: Monster = { ...monster, id: 'other' };
  const a = spawnCard(monster, 4),
    b = spawnCard(monster, 4),
    c = spawnCard(other, 4);
  const { removed, remaining } = extractStatblock([a, c, b], 'test');
  assert.deepEqual(
    removed.map((card) => card.id),
    [a.id, b.id],
  );
  assert.deepEqual(
    remaining.map((card) => card.id),
    [c.id],
  );
  assert.equal(new Set([...remaining, ...removed].map((card) => card.id)).size, 3);
});

test('one HP input uses bare damage and = for exact HP, respecting armor', async () => {
  const { applyHpEntry } = await import('./board.ts');
  const first = spawnCard(monster, 4);
  const normal = applyHpEntry(first, monster, '25', firstPrinting);
  assert.equal(normal?.kind, 'damage');
  assert.equal(normal?.card.hp, first.hp - 13); // half dice damage, rounded up
  const set = applyHpEntry(normal!.card, monster, '=18', firstPrinting);
  assert.equal(set?.kind, 'set');
  assert.equal(set?.card.hp, 18);
  assert.equal(applyHpEntry(first, monster, '+5', firstPrinting)?.kind, 'heal');
  assert.equal(applyHpEntry(first, monster, '!18', firstPrinting)?.kind, 'critical');
  assert.equal(applyHpEntry(first, monster, '==18', firstPrinting), null);
  assert.equal(applyHpEntry(first, monster, '=not-a-number', firstPrinting), null);
  assert.equal(applyHpEntry(first, monster, '=18.5', firstPrinting), null);
});

test('exact =0 HP entry preserves Last Stand until remaining HP is depleted', async () => {
  const { applyHpEntry } = await import('./board.ts');
  const legend = { ...monster, id: 'legend-9', kind: 'legendary' as const, lastStand: 16 };
  const first = spawnCard(legend, 4);
  const after = applyHpEntry(first, legend, '=0', firstPrinting);
  assert.equal(after?.card.hp, 0);
  assert.equal(after?.card.lane, 'active');
  assert.ok((after?.card.lastStandRemaining ?? 0) > 0);
});

test('appending arithmetic to displayed HP edits HP rather than treating the number as damage', async () => {
  const { applyHpEntry, parseHpArithmetic } = await import('./board.ts');
  const big = { ...monster, hp: 400 } as Monster;
  const at100 = { ...spawnCard(big, 4), hp: 100 };
  assert.deepEqual(parseHpArithmetic('100+20'), { total: 120, diceOnly: 100 });
  assert.equal(applyHpEntry(at100, big, '100+20', firstPrinting)?.card.hp, 120);
  assert.equal(applyHpEntry(at100, big, '100-20', firstPrinting)?.card.hp, 80);
  assert.equal(applyHpEntry(at100, big, '100−20', firstPrinting)?.card.hp, 80); // pasted typographic minus
  assert.equal(applyHpEntry(at100, big, '100 + 15 - 3', firstPrinting)?.card.hp, 112);
  assert.equal(applyHpEntry(at100, big, '100+20', firstPrinting)?.kind, 'set');
  assert.equal(applyHpEntry(at100, big, '100-20', firstPrinting)?.kind, 'set');
  // The damage parser still treats the same expression as dice + modifier
  // when explicitly requested, with heavy armor applied only to rolled dice.
  assert.equal(applyHpEntry(at100, big, 'd18+5', firstPrinting)?.change, 9);
  assert.equal(applyHpEntry(at100, big, '!18+5', firstPrinting)?.change, 23);
  assert.equal(applyHpEntry(at100, big, '18', firstPrinting)?.change, 9);
  assert.equal(applyHpEntry(at100, big, '=100+20', firstPrinting)?.card.hp, 120);
  assert.equal(applyHpEntry(at100, big, '100+xyz', firstPrinting), null);
  assert.equal(applyHpEntry(at100, big, '100*10', firstPrinting), null);
  assert.equal(applyHpEntry(at100, big, '=100/10', firstPrinting), null);
  assert.equal(applyHpEntry(at100, big, '100-200', firstPrinting), null);
  assert.equal(applyHpEntry(at100, big, '=9999999999999999999999', firstPrinting), null);
});
