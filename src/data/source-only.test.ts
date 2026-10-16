import test from 'node:test';
import assert from 'node:assert/strict';
import { officialCatalog, officialGmgMonsters } from './official.ts';
import { monsterHp } from '../lib/rules.ts';
const find = (name: string) => {
  const monster = officialCatalog.find((m) => m.name === name);
  assert.ok(monster, `${name} exists`);
  return monster;
};
test('the exact same 86 bundled GMG v1 records are used without overlays', () => {
  assert.equal(officialCatalog.length, 86);
  assert.deepEqual(officialCatalog.map((m) => m.id).sort(), officialGmgMonsters.map((m) => m.id).sort());
  for (const m of officialGmgMonsters) assert.deepEqual(find(m.name), m);
});
test('first-printing monster levels, names and family traits are preserved', () => {
  assert.equal(find('Goblin').level, 1 / 3);
  assert.equal(find('Kobold Sneak').level, 0.5);
  assert.equal(find('Kobold Clanger').level, 1);
  assert.equal(find('Kobold Clanger').armor, 'heavy');
  assert.equal(find('Kobold Clanger').actions.length, 0);
  assert.equal(find('Hill Giant').level, 12);
  assert.equal(find('Seedling').name, 'Seedling');
  assert.ok(find('Treant'));
  assert.ok(find('Bandit').traits.some((t) => t.name === 'Parry'));
  assert.ok(find('Gnoll').traits.some((t) => t.name === 'Frenzy'));
  assert.ok(find('Goblin').traits.some((t) => t.name === 'Haha, Missed Me!'));
  assert.ok(find('Cultist').actions.some((a) => a.name === 'Blood Boil'));
});
test('General Flameheart and Pudge retain the printed HP instead of scaled HP', () => {
  assert.equal(find('General Flameheart').hp, 175);
  assert.equal(find('Pudge the Blunderer').hp, 75);
  assert.equal(monsterHp(find('Pudge the Blunderer'), 4), 75);
  assert.equal(monsterHp(find('Pudge the Blunderer'), 6), 75);
  assert.equal(find('Pudge the Blunderer').armor, 'medium');
});
