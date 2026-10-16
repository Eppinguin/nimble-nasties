import test from 'node:test';
import assert from 'node:assert/strict';
import { readImport } from './importing.ts';
import { createEncounter, spawnCard } from './board.ts';
import { MONSTER_FORMAT } from './share.ts';
import type { Monster } from './types.ts';

const imp = { id: 'homebrew-imp', name: 'Imp', level: 1, kind: 'standard', armor: 'none', hp: 10, family: 'Fiends', role: 'Custom', traits: [], actions: [], source: 'homebrew', edition: 'unknown' } as Monster;

test('a monster file imports as monsters', () => {
  const result = readImport({ format: MONSTER_FORMAT, monsters: [imp] }, []);
  assert.equal(result.kind, 'monsters');
  assert.deepEqual(result.kind === 'monsters' && result.monsters.map((m) => m.name), ['Imp']);
});

test('an export brings its encounters, with fresh ids, and the homebrew they field', () => {
  const encounter = createEncounter('Fiend pit');
  encounter.cards.push(spawnCard(imp, 4));
  const result = readImport({ format: 'nimble-nasties-v1', encounters: [encounter], customMonsters: [imp] }, []);
  assert.equal(result.kind, 'encounters');
  if (result.kind !== 'encounters') return;
  assert.equal(result.encounters.length, 1);
  assert.notEqual(result.encounters[0].id, encounter.id);
  assert.equal(result.encounters[0].cards.length, 1);
  assert.deepEqual(
    result.homebrew.map((m) => [m.id, m.origin]),
    [['homebrew-imp', 'file']],
  );
  assert.equal(result.newer, 0);
});

test('encounters on an unknown, newer rule set are counted and skipped', () => {
  const result = readImport({ encounters: [{ ...createEncounter('Later'), rules: 'nimble-3p' }] }, []);
  assert.deepEqual(result.kind === 'encounters' && [result.encounters.length, result.newer], [0, 1]);
});
