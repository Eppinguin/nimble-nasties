import test from 'node:test';
import assert from 'node:assert/strict';
import { findDiceNotation, rollDice, rollHorde } from './dice.ts';
const rig = (...sequence: number[]) => {
  let i = 0;
  return (max: number) => Math.min(max, sequence[i++] ?? 1);
};
test('primary 1 misses', () => {
  const r = rollDice('2d6+3', {}, rig(1, 5));
  assert.equal(r.isMiss, true);
  assert.equal(r.total, 0);
});
test('primary max explodes', () => {
  const r = rollDice('1d6+3', {}, rig(6, 4));
  assert.equal(r.isCritical, true);
  assert.equal(r.total, 13);
});
test('minions cannot crit', () => {
  const r = rollDice('1d6+3', { minion: true }, rig(6));
  assert.equal(r.isCritical, false);
  assert.equal(r.total, 9);
});
test('n non-attack prevents crit/miss', () => {
  const r = rollDice('1d20n', {}, rig(1));
  assert.equal(r.isMiss, false);
  assert.equal(r.total, 1);
});
test('crit-only bonus applies only on crit', () => {
  const r = rollDice('1d10+5c', {}, rig(10, 3));
  assert.equal(r.total, 18);
  assert.equal(rollDice('1d10+5c', {}, rig(5)).total, 5);
});
test('extract dice from descriptions', () => assert.equal(findDiceNotation('Fireball. 2d8+5. On hit: burn'), '2d8+5'));
test('advantage stacks: each stack adds a die and drops the lowest', () => {
  const r = rollDice('1d20', { advantage: 3 }, rig(4, 17, 9, 12));
  assert.equal(r.total, 17);
});
test('disadvantage stacks drop the highest', () => {
  const r = rollDice('1d20', { advantage: -2 }, rig(4, 17, 9));
  assert.equal(r.total, 4);
});
test('advantage and disadvantage cancel one for one (net +1)', () => {
  const r = rollDice('1d20', { advantage: 2 - 1 }, rig(5, 11));
  assert.equal(r.total, 11);
});
test('edge ties drop dice left to right', () => {
  const r = rollDice('2d6', { advantage: 1 }, rig(3, 3, 5));
  assert.match(r.breakdown, /3 dropped, 3 primary, 5/);
});
test('minion horde: each 1 misses, the rest add up, no crits', () => {
  const r = rollHorde('1d6', 5, {}, rig(4, 1, 6, 3, 1));
  assert.equal(r.total, 13);
  assert.equal(r.hits, 3);
  assert.equal(r.isCritical, false);
  assert.equal(r.breakdown, '[4, 1 miss, 6, 3, 1 miss]');
});
test('minion horde misses only when every die is a 1', () => {
  assert.equal(rollHorde('1d4', 3, {}, rig(1, 1, 1)).isMiss, true);
  assert.equal(rollHorde('1d4', 3, {}, rig(1, 2, 1)).isMiss, false);
});
test('structured parts mark the primary, Adv drops, explosions and modifiers', () => {
  const r = rollDice('1d6+2', { advantage: 1 }, rig(2, 6, 3));
  assert.equal(r.edge, 1);
  assert.deepEqual(r.parts, [
    {
      kind: 'dice',
      sign: 1,
      dice: [
        { value: 2, sides: 6, state: 'dropped' },
        { value: 6, sides: 6, state: 'primary' },
      ],
    },
    { kind: 'flat', value: 2 },
    { kind: 'explosion', dice: [{ value: 3, sides: 6, state: 'exploded' }] },
  ]);
});
test('structured horde parts keep the face a missing minion showed', () => {
  const r = rollHorde('1d6+1', 3, {}, rig(4, 1, 6));
  assert.deepEqual(r.parts, [
    {
      kind: 'minions',
      hits: [
        { value: 5, miss: false },
        { value: 1, miss: true },
        { value: 7, miss: false },
      ],
    },
  ]);
});
