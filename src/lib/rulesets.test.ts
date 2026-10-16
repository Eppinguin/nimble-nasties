import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULES, RULESETS, RULESET_ORDER, otherPrinting, readRules, rulesFor } from './rulesets.ts';
import { applyHpEntry, createEncounter, normalizeEncounter, spawnCard } from './board.ts';
import { RULES_RELEASES } from './changelog.ts';
import type { Monster } from './types.ts';

const knight: Monster = {
  id: 'knight',
  name: 'Knight',
  kind: 'standard',
  level: 3,
  hp: 40,
  armor: 'heavy',
  source: 'homebrew',
  edition: 'unknown',
  family: 'Test',
  role: 'Test',
  traits: [],
  actions: [],
};
const saved = (extra: Record<string, unknown> = {}) => ({ name: 'Toll bridge', heroes: [{ id: 'h', name: 'Ash', level: 3 }], cards: [{ id: 'c1', monsterId: 'knight', hp: 40, maxHp: 40 }], ...extra });

test('every registered rule set is listed once and keyed by its own id', () => {
  assert.deepEqual([...RULESET_ORDER].sort(), Object.keys(RULESETS).sort());
  for (const [id, rules] of Object.entries(RULESETS)) assert.equal(rules.id, id);
  assert.equal(RULESETS['nimble-1p'].name, 'First Printing');
  assert.equal(RULESETS['nimble-jul26'].name, 'July 2026 Changelog');
});

test('July 2026 armor is flat: Medium −5, Heavy −10, crits ignore it', () => {
  const damage = RULESETS['nimble-jul26'].appliedDamage;
  assert.equal(damage(18, 'none', false), 18);
  assert.equal(damage(18, 'medium', false, { diceOnly: 12 }), 13); // modifiers count now
  assert.equal(damage(18, 'heavy', false), 8);
  assert.equal(damage(18, 'heavy', true), 18);
  assert.equal(damage(18, 'heavy', false, { ignoreArmor: true }), 18);
  assert.equal(damage(6, 'heavy', false), 0);
});

test('July 2026 vulnerability adds 10 and resistance takes 10, on top of armor', () => {
  const damage = RULESETS['nimble-jul26'].appliedDamage;
  assert.equal(damage(12, 'none', false, { vulnerable: true }), 22);
  assert.equal(damage(12, 'heavy', false, { vulnerable: true }), 12);
  assert.equal(damage(12, 'none', false, { resistant: true }), 2);
  assert.equal(damage(12, 'medium', false, { resistant: true }), 0);
});

test('new encounters get the newest rules', () => {
  assert.equal(DEFAULT_RULES, RULESET_ORDER[0]);
  assert.equal(createEncounter('Fresh').rules, 'nimble-jul26');
  assert.deepEqual(readRules(undefined), { id: DEFAULT_RULES });
  assert.equal(normalizeEncounter(saved(), [knight])?.rules, DEFAULT_RULES);
});

test('every rule set has a changelog release, newest first', () => {
  const listed = RULES_RELEASES.flatMap((r) => (r.rules ? [r.rules] : []));
  assert.deepEqual(listed, RULESET_ORDER);
  for (const release of RULES_RELEASES) for (const section of release.sections) assert.ok(section.changes.length, `${release.key}: ${section.title}`);
});

test('a stored printing survives a round trip', () => {
  const encounter = normalizeEncounter(saved({ rules: 'nimble-1p' }), [knight]);
  assert.equal(normalizeEncounter(JSON.parse(JSON.stringify(encounter)), [knight])?.rules, 'nimble-1p');
});

test('an unknown printing is refused, never guessed', () => {
  assert.deepEqual(readRules('nimble-9p'), { unknown: 'nimble-9p' });
  assert.equal(normalizeEncounter(saved({ rules: 'nimble-9p' }), [knight]), null);
});

test("HP entry runs the encounter's printing", () => {
  const card = spawnCard(knight, 4);
  const firstPrinting = rulesFor({ rules: 'nimble-1p' });
  assert.equal(applyHpEntry(card, knight, '25', firstPrinting)?.card.hp, 27); // Heavy halves dice, rounded up
  const flat = { ...firstPrinting, appliedDamage: (raw: number) => Math.max(0, raw - 10) };
  assert.equal(applyHpEntry(card, knight, '25', flat)?.card.hp, 25);
});

test('lists only call out encounters on a non-default printing', () => {
  assert.equal(otherPrinting({ rules: DEFAULT_RULES }), null);
  assert.equal(otherPrinting({ rules: 'nimble-1p' }), 'First Printing');
});

test('an encounter switched to July 2026 rules saves and reloads that way', () => {
  const encounter = normalizeEncounter(saved({ rules: 'nimble-jul26' }), [knight]);
  assert.equal(encounter?.rules, 'nimble-jul26');
  assert.equal(applyHpEntry(spawnCard(knight, 4), knight, '25', rulesFor(encounter!))?.card.hp, 25);
});

test('difficulty tiers turn the budget into monster levels for the party', () => {
  const tiers = RULESETS['nimble-jul26'].tiers.map((t) => [t.label, t.levels(4)]);
  assert.deepEqual(tiers, [
    ['Easy', 'under 2'],
    ['Medium', 'about 3'],
    ['Hard', '4'],
    ['Deadly', '4–5'],
    ['Very deadly', '6+'],
  ]);
  assert.equal(RULESETS['nimble-1p'].tiers[1].levels(6), 'about 4.5');
});
