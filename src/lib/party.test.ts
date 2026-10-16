import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isUniformParty, partyFor, partyLevel, setHeroLevel, setQuickParty } from './party.ts';
import type { Hero } from './types.ts';
const heroes: Hero[] = [
  { id: 'a', name: 'Adventurer', level: 3, hp: 17, maxHp: 19, defense: 2 },
  { id: 'b', name: 'Bard', level: 5, hp: 12, maxHp: 21, defense: 3 },
];
test('quick setup updates shared level without losing existing hero identity or stats', () => {
  const party = setQuickParty(heroes, 3, 7);
  assert.deepEqual(
    party.map((hero) => hero.level),
    [7, 7, 7],
  );
  assert.equal(party[0].id, 'a');
  assert.equal(party[0].hp, 17);
  assert.equal(party[1].name, 'Bard');
  assert.equal(party[1].defense, 3);
  assert.equal(party[2].name, 'Hero 3');
  assert.equal(isUniformParty(party), true);
});
test('quick setup safely limits number and level', () => {
  assert.equal(setQuickParty(heroes, 200, 90).length, 20);
  assert.equal(setQuickParty(heroes, 0, 0)[0].level, 1);
});
test('detailed edits retain other levels and quick mode can detect mixed levels', () => {
  const party = setHeroLevel(heroes, 'a', 10);
  assert.deepEqual(
    party.map((h) => h.level),
    [10, 5],
  );
  assert.equal(isUniformParty(party), false);
  assert.equal(partyLevel(party), 10);
  assert.equal(heroes[0].level, 3);
});

test('an imported encounter keeps your party when it already fits', () => {
  const mine = setQuickParty([], 4, 3);
  assert.equal(partyFor(mine, 4, 3), mine);
  const bigger = partyFor(mine, 5, 2);
  assert.deepEqual(
    bigger.map((h) => h.level),
    [2, 2, 2, 2, 2],
  );
  assert.equal(bigger[0].id, mine[0].id);
});
