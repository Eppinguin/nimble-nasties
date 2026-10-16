import test from 'node:test';
import assert from 'node:assert/strict';
import { gmgRows } from './gmg.ts';
import { rollDice } from '../lib/dice.ts';

test('every GMG action damage roll parses and produces a finite result', () => {
  let count = 0;
  for (const row of gmgRows) {
    const actions = row[8] as unknown[][];
    for (const action of actions) {
      const notation = action[1];
      if (typeof notation !== 'string' || !notation.trim()) continue;
      const roll = rollDice(
        notation,
        {
          label: `${String(row[0])}: ${String(action[0])}`,
          minion: Number(row[5]) === 1,
          noCrit: true,
        },
        () => 1,
      );
      assert.ok(Number.isFinite(roll.total), `${String(row[0])}: ${notation}`);
      count++;
    }
  }
  assert.equal(count, 123);
});
