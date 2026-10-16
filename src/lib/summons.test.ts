import test from 'node:test';
import assert from 'node:assert/strict';
import { findSummons, liveSummon, monsterSummons, summonCount, summonMonster, withSummons } from './summons.ts';
import { officialCatalog } from '../data/official.ts';

const byName = (name: string) => officialCatalog.find((m) => m.name.startsWith(name))!;

test('reads the GMG summon phrasings', () => {
  const [bat] = findSummons("After each hero's turn, summon 1 blood bat minion (d10) within 8 spaces, then choose 1:");
  assert.deepEqual({ name: bat.name, count: bat.count, perHero: bat.perHero, die: bat.die, text: bat.text }, { name: 'Blood Bat', count: 1, perHero: false, die: 'd10', text: 'summon 1 blood bat minion (d10)' });
  const [brood] = findSummons('Summon spiderling minions (1/hero, size: d8); they act only when commanded.');
  assert.deepEqual({ name: brood.name, count: brood.count, perHero: brood.perHero, die: brood.die }, { name: 'Spiderling', count: 1, perHero: true, die: 'd8' });
  const [avenge] = findSummons('At 80 HP, summon 3 spiderling minions/hero anywhere within Reach 8.');
  assert.deepEqual({ count: avenge.count, perHero: avenge.perHero, die: avenge.die }, { count: 3, perHero: true, die: undefined });
  assert.equal(findSummons('He spends his next turn moving up to 6 spaces and summoning Bane.').length, 0);
  assert.equal(findSummons('Command all of your spiderling minions to move.').length, 0);
});

test('a die-less phrase borrows the die from the same stat block', () => {
  const aranya = byName('Queen Aranya');
  const specs = monsterSummons(aranya);
  assert.equal(specs.length, 1);
  assert.equal(specs[0].die, 'd8');
  assert.equal(summonCount(specs[0], 4), 4);
});

test('summoned minions are derived, stable, and follow minion rules', () => {
  const alaric = byName('Alaric');
  const bat = summonMonster(alaric, monsterSummons(alaric)[0]);
  assert.equal(bat.id, 'summon-official-alaric-draegoth-the-crimson-count--blood-bat');
  assert.equal(bat.kind, 'minion');
  assert.equal(bat.actions[0].notation, '1d10');
  assert.equal(bat.family, 'Summoned by Alaric Draegoth');
  const library = withSummons(officialCatalog);
  assert.equal(withSummons(library).length, library.length);
  assert.ok(library.some((m) => m.id === bat.id));
});

test("Alaric's bats roll d20s while he is in Last Stand", () => {
  const alaric = byName('Alaric');
  const bat = summonMonster(alaric, monsterSummons(alaric)[0]);
  assert.deepEqual(bat.summon?.boost, { die: 'd20', phase: 'laststand' });
  assert.equal(liveSummon(bat, { bloodied: true, lastStand: false }).monster.actions[0].notation, '1d10');
  const live = liveSummon(bat, { bloodied: false, lastStand: true });
  assert.ok(live.boosted);
  assert.equal(live.monster.actions[0].notation, '1d20');
});

test('a per-hero summon is capped at the library add limit', () => {
  assert.equal(summonCount({ key: 'x', name: 'X', count: 3, perHero: true }, 20), 30);
  assert.equal(summonCount({ key: 'x', name: 'X', count: 3, perHero: true }, 4), 12);
});
