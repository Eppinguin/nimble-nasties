import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateHomebrew, encountersUsing, forExport, groupHomebrew, originOf, sortHomebrew, stamped } from './homebrew.ts';
import { officialCatalog } from '../data/official.ts';
import type { Monster } from './types.ts';

const brew = (name: string, extra: Partial<Monster> = {}): Monster => ({ ...officialCatalog[0], id: `homebrew-${name.toLowerCase()}`, name, source: 'homebrew', sourceUrl: undefined, ...extra });

test('a save keeps where the monster first came from', () => {
  assert.equal(stamped(brew('E', { origin: 'nexus' }), 'forge').origin, 'nexus');
  assert.equal(originOf(stamped(brew('F'), 'link')), 'link');
});

test('recent sorts by last save', () => {
  const list = [brew('Old', { edited: '2026-09-01T00:00:00.000Z' }), brew('Edited', { edited: '2026-10-01T00:00:00.000Z' })];
  assert.deepEqual(
    sortHomebrew(list, 'recent').map((m) => m.name),
    ['Edited', 'Old'],
  );
  assert.deepEqual(
    sortHomebrew([brew('b', { level: 2 }), brew('a', { level: 2 }), brew('c', { level: 1 })], 'level').map((m) => m.name),
    ['c', 'a', 'b'],
  );
});

test('groups by family or by origin in a fixed order', () => {
  const list = [brew('A', { family: 'Hags' }), brew('B', { family: 'Bats', origin: 'file' }), brew('C', { family: 'Hags', origin: 'forge' })];
  assert.deepEqual(
    groupHomebrew(list, 'name', 'family').map((g) => [g.label, g.monsters.length]),
    [
      ['Bats', 1],
      ['Hags', 2],
    ],
  );
  assert.deepEqual(
    groupHomebrew(list, 'name', 'origin').map((g) => g.label),
    ['Forged', 'From a file'],
  );
  assert.deepEqual(groupHomebrew([], 'name', 'none'), []);
});

test('duplicates get a free copy name and keep their origin', () => {
  const hag = brew('Hag', { origin: 'nexus' });
  const copy = duplicateHomebrew(hag, 'homebrew-x', ['Hag', 'Hag (copy)']);
  assert.equal(copy.name, 'Hag (copy 2)');
  assert.equal(copy.origin, 'nexus');
  assert.equal(duplicateHomebrew(copy, 'homebrew-y', []).name, 'Hag (copy)');
});

test('exports drop browser bookkeeping, and usage counts encounters', () => {
  const out = forExport(brew('A', { origin: 'forge', edited: 'x' }));
  assert.ok(!('origin' in out) && !('edited' in out));
  assert.equal(encountersUsing('m', [{ cards: [{ monsterId: 'm' }, { monsterId: 'm' }] }, { cards: [] }, { cards: [{ monsterId: 'm' }] }]), 2);
});
