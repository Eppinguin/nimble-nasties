import test from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, LEVEL_ROWS, addAbility, attackDice, blankDraft, draftToMonster, forgeMath, monsterToDraft } from './forge.ts';
import { findSummons } from './summons.ts';
import { officialCatalog } from '../data/official.ts';

const row = (level: number) => LEVEL_ROWS.findIndex((line) => line.level === level);

test('the GMG glass cannon example: a level 5 mage has 34 HP and 26 damage', () => {
  const mage = forgeMath({ ...blankDraft(row(5)), shape: 3 });
  assert.equal(mage.hp, 34);
  assert.equal(mage.damage, 26);
  assert.equal(mage.level, 5);
});

test('each ability makes the monster a level stronger, or costs an HP or damage row', () => {
  const mage = addAbility({ ...blankDraft(row(5)), shape: 3 }, ABILITIES[0]);
  assert.equal(forgeMath(mage).level, 6);
  assert.equal(forgeMath({ ...mage, payWith: 'hp' }).hp, 26);
  assert.equal(forgeMath({ ...mage, payWith: 'damage' }).damage, 24);
});

test('armor picks the HP column; d8 uses the book sample dice', () => {
  assert.equal(forgeMath({ ...blankDraft(row(4)), armor: 'heavy' }).hp, 29);
  assert.equal(attackDice(row(4), 8, 1), '2d8+9');
  assert.equal(attackDice(row(4), 8, 2), '1d8+5');
  assert.equal(attackDice(row(1 / 3), 6, 1), '1d6+2');
});

test('minions have 1 HP and roll a bare die', () => {
  const math = forgeMath({ ...blankDraft(row(1)), kind: 'minion', die: 6 });
  assert.equal(math.hp, 1);
  assert.equal(math.notation, '1d6');
});

test('a forged monster carries two attacks, the save DC and a working summon', () => {
  let draft = { ...blankDraft(row(3)), name: 'Grave Lurker', twoAttacks: true };
  draft = addAbility(
    addAbility(
      draft,
      ABILITIES.find((a) => a.id === 'fearsome')!,
    ),
    ABILITIES.find((a) => a.id === 'summoner')!,
  );
  const monster = draftToMonster(draft, 'homebrew-x');
  assert.equal(monster.actions[0].name, 'Strike (2×)');
  assert.equal(monster.actions[0].notation, '1d8+4');
  assert.match(monster.traits[0].description, /DC 12 WIL/);
  assert.equal(findSummons(monster.traits[1].description)[0]?.name, 'Lurker Spawn');
  assert.deepEqual(monsterToDraft(monster), draft);
});

test('any official stat block remixes without losing its numbers', () => {
  for (const original of officialCatalog) {
    const copy = draftToMonster(monsterToDraft(original, true), 'copy');
    assert.equal(copy.hp, original.hp, original.name);
    assert.deepEqual(
      copy.actions.map((a) => a.notation),
      original.actions.map((a) => a.notation),
      original.name,
    );
    assert.deepEqual(copy.traits, original.traits, original.name);
    assert.equal(copy.armor, original.armor);
  }
});

test('a remix keeps its level: the original traits are already paid for', () => {
  const bruiser = officialCatalog.find((m) => m.name === 'Bandit Bruiser')!;
  assert.equal(forgeMath(monsterToDraft(bruiser, true)).level, bruiser.level);
});
