import test from 'node:test';
import assert from 'node:assert/strict';
import { changeHp, createEncounter, damageCard, encounterMembers, serializeBoard, sortByOrder, spawnCard, storedMonsters, toggleCardCondition } from './board.ts';
import { RULESETS } from './rulesets.ts';
import type { Monster } from './types.ts';
const monster = { id: 'test', name: 'Test', hp: 30, armor: 'medium', kind: 'standard' } as Monster;
const firstPrinting = RULESETS['nimble-1p'];
test('individual creature instances stay movable with independent HP', () => {
  const a = spawnCard(monster, 4);
  const b = spawnCard(monster, 4);
  assert.notEqual(a.id, b.id);
  assert.equal(encounterMembers([a, b])[0].count, 2);
});
test('damage uses armor and moves a defeated monster to the third lane', () => {
  const c = spawnCard(monster, 4, 'active');
  assert.equal(damageCard(c, 22, monster, { crit: false, vulnerable: false, resistant: false, ignoreArmor: false }, firstPrinting).card.hp, 8);
  const dead = changeHp(c, -40);
  assert.equal(dead.lane, 'defeated');
  assert.equal(changeHp(dead, 1).lane, 'active');
});
test('legendary last stand stays active until exhausted', () => {
  const m = { ...monster, kind: 'legendary', lastStand: 20 } as Monster;
  const c = spawnCard(m, 4, 'active');
  const injured = changeHp(c, -35);
  assert.equal(injured.lastStandRemaining, 15);
  assert.equal(injured.lane, 'active');
  assert.equal(changeHp(injured, -15).lane, 'defeated');
});
test('conditions can be toggled', () => {
  const c = spawnCard(monster, 4);
  assert.deepEqual(toggleCardCondition(toggleCardCondition(c, 'Prone'), 'Prone').conditions, []);
});

test('newly spawned creatures have default activation group and untouched turn', () => {
  const card = spawnCard(monster, 4);
  assert.equal(card.groupId, 'group-1');
  assert.equal(card.acted, false);
});
test('reordering one statblock lane preserves the other lane order', async () => {
  const { reorderStatblocks } = await import('./board.ts');
  assert.deepEqual(reorderStatblocks(['goblin', 'ogre', 'kobold'], 'kobold', 'ogre'), ['goblin', 'kobold', 'ogre']);
  assert.deepEqual(reorderStatblocks(['goblin', 'ogre'], 'missing', 'goblin'), ['goblin', 'ogre']);
});
test('encounter normalization persists activation groups, acted state and statblock order', async () => {
  const { createEncounter, normalizeEncounter } = await import('./board.ts');
  const encounter = createEncounter();
  encounter.groups = [
    { id: 'first', name: 'Front gate' },
    { id: 'second', name: 'Back door' },
  ];
  encounter.order = ['test'];
  encounter.cards = [{ ...spawnCard(monster, 4, 'active'), groupId: 'second', acted: true }];
  const restored = normalizeEncounter(JSON.parse(JSON.stringify(encounter)), [monster]);
  assert.deepEqual(restored?.groups, encounter.groups);
  assert.deepEqual(restored?.order, ['test']);
  assert.equal(restored?.cards[0].groupId, 'second');
  assert.equal(restored?.cards[0].acted, true);
});

test('unified encounter desk adds all new creatures directly to combat', () => {
  const fresh = spawnCard(monster, 4);
  assert.equal(fresh.lane, 'active');
  assert.equal(fresh.acted, false);
});

test('one-field table damage applies armor, crit, healing, and direct loss without a dialog', async () => {
  const { applyHitCommand } = await import('./board.ts');
  const card = spawnCard(monster, 4);
  const normal = applyHitCommand(card, monster, ' 22 ', firstPrinting);
  assert.equal(normal?.kind, 'damage');
  assert.equal(normal?.change, 22);
  assert.equal(normal?.card.hp, 8);
  const critical = applyHitCommand(card, monster, '!22', firstPrinting);
  assert.equal(critical?.kind, 'critical');
  assert.equal(critical?.card.hp, 8);
  assert.equal(applyHitCommand(card, monster, '+5', firstPrinting)?.card.hp, 30);
  assert.equal(applyHitCommand(card, monster, '-5', firstPrinting)?.card.hp, 25);
  assert.equal(applyHitCommand(card, monster, '', firstPrinting), null);
  assert.equal(applyHitCommand(card, monster, '1d8', firstPrinting), null);
  assert.equal(applyHitCommand(card, monster, 'bad', firstPrinting), null);
  assert.equal(applyHitCommand(card, monster, 'Infinity', firstPrinting), null);
});

test('exact HP setting keeps a legendary in its Last Stand until that pool is exhausted', async () => {
  const { setCurrentHp } = await import('./board.ts');
  const boss = { ...monster, kind: 'legendary', lastStand: 20 } as Monster;
  const card = spawnCard(boss, 4);
  const atZero = setCurrentHp(card, 0);
  assert.equal(atZero.hp, 0);
  assert.equal(atZero.lane, 'active');
  assert.equal(atZero.lastStandRemaining, 20);
  assert.equal(setCurrentHp(atZero, 10).hp, 10);
});
test('lanes follow the saved order, unlisted ones keep their place after it', () => {
  assert.deepEqual(sortByOrder(['a', 'b', 'c', 'd'], ['c', 'a']), ['c', 'a', 'b', 'd']);
  assert.deepEqual(sortByOrder(['b', 'a']), ['b', 'a']);
});
test('damaged stored homebrew is repaired or dropped instead of breaking the board', () => {
  const kept = storedMonsters([{ id: 'homebrew-1', name: 'Imp', level: 2, traits: [], actions: [] }, { id: 'homebrew-2', name: 'Broken' }, { name: 'No id' }, null, 'junk']);
  assert.deepEqual(
    kept.map((m) => m.id),
    ['homebrew-1', 'homebrew-2'],
  );
  assert.equal(kept[0].level, 2);
  assert.deepEqual([kept[1].level, kept[1].traits, kept[1].actions], [1, [], []]);
  assert.deepEqual(storedMonsters('not a list'), []);
});

test("this round's minion rolls are not saved", () => {
  const encounter = { ...createEncounter('Saved'), packLog: [{ packId: 'p', label: 'Bite', summary: '7' }] } as unknown as ReturnType<typeof createEncounter>;
  const stored = JSON.parse(serializeBoard({ encounters: [encounter], activeId: encounter.id, customMonsters: [] }));
  assert.equal('packLog' in stored.encounters[0], false);
  assert.equal(stored.encounters[0].name, 'Saved');
});
