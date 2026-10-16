import test from 'node:test';
import assert from 'node:assert/strict';
import { appliedDamage, difficulty, monsterHp, monsterLastStand, encounterStats, formatLevels } from './rules.ts';
import type { Monster } from './types.ts';
test('GMG v1 monster armor: Medium uses dice only, Heavy halves dice only', () => {
  assert.equal(appliedDamage(28, 'medium', false), 28);
  assert.equal(appliedDamage(28, 'heavy', false), 14);
  assert.equal(appliedDamage(28, 'medium', false, { diceOnly: 20 }), 20);
  assert.equal(appliedDamage(28, 'heavy', false, { diceOnly: 20 }), 10);
  assert.equal(appliedDamage(28, 'heavy', true, { diceOnly: 20 }), 28);
});
test('GMG v1 vulnerability bypasses armor or doubles unarmored, resistance halves', () => {
  assert.equal(appliedDamage(20, 'none', false, { vulnerable: true }), 40);
  assert.equal(appliedDamage(20, 'heavy', false, { vulnerable: true }), 20);
  assert.equal(appliedDamage(20, 'none', false, { resistant: true }), 10);
  assert.equal(appliedDamage(21, 'heavy', false, { resistant: true }), 6);
});
test('GMG v1 descriptive difficulty bands track monster levels', () => {
  assert.equal(difficulty(4, 12).label, 'Easy');
  assert.equal(difficulty(9, 12).label, 'Medium');
  assert.equal(difficulty(12, 12).label, 'Hard');
  assert.equal(difficulty(15, 12).label, 'Deadly');
  assert.equal(difficulty(18, 12).label, 'Very deadly');
});
test('original legendary HP and Last Stand stay fixed with changing party size', () => {
  const boss = { kind: 'legendary', hp: 75, lastStand: 20 } as Monster;
  assert.equal(monsterHp(boss, 3), 75);
  assert.equal(monsterHp(boss, 6), 75);
  assert.equal(monsterLastStand(boss, 6), 20);
});
test('minions and legendaries do not add imaginary monster levels to budget', () => {
  const heroes = [1, 2, 3, 4].map((i) => ({ id: String(i), name: 'Hero', level: 3, hp: 25, maxHp: 25, defense: 1 }));
  const monsters: Monster[] = [{ id: 'a', name: 'Goblin', level: 1 / 3, kind: 'standard', armor: 'none', hp: 15 } as Monster, { id: 'b', name: 'Goblin Minion', level: 1 / 4, kind: 'minion', armor: 'none', hp: 1 } as Monster, { id: 'c', name: 'Pudge', level: 2, kind: 'legendary', armor: 'medium', hp: 75 } as Monster];
  const result = encounterStats(
    [
      { id: 'a', monsterId: 'a', count: 3 },
      { id: 'b', monsterId: 'b', count: 4 },
      { id: 'c', monsterId: 'c', count: 1 },
    ],
    monsters,
    heroes,
  );
  assert.equal(result.spent, 1);
  assert.equal(result.regular, 3);
  assert.equal(result.minions, 4);
  assert.equal(result.legendaries, 1);
});
test('a lone legendary is a boss fight, not an empty encounter', () => {
  const heroes = [1, 2, 3, 4].map((i) => ({ id: String(i), name: 'Hero', level: 3, hp: 25, maxHp: 25, defense: 1 }));
  const boss = { id: 'c', name: 'Pudge', level: 3, kind: 'legendary', armor: 'medium', hp: 75 } as Monster;
  const result = encounterStats([{ id: 'c', monsterId: 'c', count: 1 }], [boss], heroes);
  assert.equal(result.spent, 0);
  assert.equal(result.difficulty.label, 'Boss fight');
});
test('a minion-only encounter is rated by minions per hero', () => {
  const heroes = [1, 2, 3, 4].map((i) => ({ id: String(i), name: 'Hero', level: 3, hp: 25, maxHp: 25, defense: 1 }));
  const minion = { id: 'b', name: 'Goblin Minion', level: 1 / 4, kind: 'minion', armor: 'none', hp: 1 } as Monster;
  const rate = (count: number) => encounterStats([{ id: 'b', monsterId: 'b', count }], [minion], heroes);
  assert.equal(rate(4).difficulty.color, 'medium');
  assert.equal(rate(10).difficulty.color, 'hard');
  assert.equal(rate(16).difficulty.color, 'deadly');
  assert.equal(rate(16).difficulty.label, 'Minion horde');
  assert.match(rate(16).warnings[0], /4 per hero: much more challenging/);
});
test('standard monsters keep the level-based difficulty alongside minions and legendaries', () => {
  const heroes = [1, 2].map((i) => ({ id: String(i), name: 'Hero', level: 2, hp: 25, maxHp: 25, defense: 1 }));
  const monsters: Monster[] = [{ id: 'a', name: 'Ogre', level: 4, kind: 'standard', armor: 'none', hp: 40 } as Monster, { id: 'b', name: 'Goblin Minion', level: 1 / 4, kind: 'minion', armor: 'none', hp: 1 } as Monster];
  const result = encounterStats(
    [
      { id: 'a', monsterId: 'a', count: 1 },
      { id: 'b', monsterId: 'b', count: 8 },
    ],
    monsters,
    heroes,
  );
  assert.equal(result.difficulty.label, 'Hard');
});

test('level sums print with the book fractions', () => {
  assert.deepEqual([formatLevels(17 + 1 / 3), formatLevels(6.5), formatLevels(4), formatLevels(0.25)], ['17⅓', '6½', '4', '¼']);
});
