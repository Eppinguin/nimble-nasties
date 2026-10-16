import { test } from 'node:test';
import assert from 'node:assert/strict';
import { officialCatalog } from '../data/official.ts';
import { describeLevel, groupMatches, highlight, parseQuery, searchMonsters } from './browse.ts';

const find = (q: string, quick: Parameters<typeof searchMonsters>[2] = 'all', left = 99) => searchMonsters(officialCatalog, parseQuery(q), quick, left);

test('levels come out of the search, words stay', () => {
  assert.deepEqual(parseQuery('goblin 2'), { words: ['goblin'], level: { min: 2, max: 2 } });
  assert.deepEqual(parseQuery('level 3').level, { min: 3, max: 3 });
  assert.deepEqual(parseQuery('lv2-4').level, { min: 2, max: 4 });
  assert.deepEqual(parseQuery('1/4').level, { min: 0.25, max: 0.25 });
  assert.equal(parseQuery('5+').level?.max, Infinity);
  assert.equal(parseQuery('<=3').level?.max, 3);
  assert.deepEqual(parseQuery('d6').words, ['d6']);
  assert.equal(describeLevel({ min: 2, max: 4 }), 'Level 2–4');
  assert.equal(describeLevel({ min: 0, max: 3 }), 'Level ≤ 3');
});

test('every word has to match, and names outrank abilities', () => {
  const goblins = find('goblin');
  assert.ok(goblins.length > 1);
  assert.match(goblins.sort((a, b) => b.score - a.score)[0].monster.name, /^Goblin/);
  assert.ok(find('goblin 2').every((m) => m.monster.level === 2));
  assert.equal(find('zzzz').length, 0);
});

test('a word found only in an ability names the ability', () => {
  const hits = find('poison');
  assert.ok(hits.length > 0);
  assert.ok(hits.some((m) => m.hit));
});

test('quick filters: kinds, and standard monsters that still fit the budget', () => {
  assert.ok(find('', 'minion').every((m) => m.monster.kind === 'minion'));
  assert.ok(find('', 'fits', 2).every((m) => m.monster.kind === 'standard' && m.monster.level <= 2));
});

test('the in-encounter filter keeps only fielded monsters, and still searches within them', () => {
  const goblin = find('goblin').find((m) => m.monster.name === 'Goblin')!.monster;
  const ogre = officialCatalog.find((m) => m.kind === 'standard' && m.id !== goblin.id)!;
  const fielded = new Set([goblin.id, ogre.id]);
  assert.deepEqual(
    searchMonsters(officialCatalog, parseQuery(''), 'fielded', 99, fielded)
      .map((m) => m.monster.id)
      .sort(),
    [...fielded].sort(),
  );
  assert.deepEqual(
    searchMonsters(officialCatalog, parseQuery('goblin'), 'fielded', 99, fielded).map((m) => m.monster.id),
    [goblin.id],
  );
  assert.equal(searchMonsters(officialCatalog, parseQuery(''), 'fielded', 99).length, 0);
});

test('family shelves fold strays and legendaries together', () => {
  const groups = groupMatches(find(''), 'family', false);
  assert.ok(groups.every((g) => g.matches.length > 1 || g.key === 'Legendary' || g.key === 'Lone monsters'));
  assert.equal(groups.at(-1)?.key, 'Legendary');
  const levels = groupMatches(find(''), 'level', false);
  assert.equal(levels[0].label, 'Level ¼');
});

test('highlight marks the matched run', () => {
  assert.deepEqual(highlight('Goblin Minion', ['min']), [
    { text: 'Goblin ', hit: false },
    { text: 'Min', hit: true },
    { text: 'ion', hit: false },
  ]);
});
