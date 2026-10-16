import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_LIMIT, navigate, record, redo, startHistory, undo } from './history.ts';

test('undo and redo walk labelled steps', () => {
  let h = startHistory({ hp: 20 });
  h = record(h, { hp: 12 }, { id: 'a', label: '8 damage' });
  h = record(h, { hp: 4 }, { id: 'b', label: '8 damage' });
  h = undo(h);
  assert.equal(h.present.hp, 12);
  assert.equal(h.future.at(-1)?.id, 'b');
  h = undo(h);
  assert.equal(h.present.hp, 20);
  h = redo(h);
  assert.equal(h.present.hp, 12);
  assert.equal(h.past.at(-1)?.id, 'a');
});

test('a new step clears redo', () => {
  let h = startHistory(1);
  h = record(h, 2, { id: 'a', label: 'two' });
  h = undo(h);
  h = record(h, 3, { id: 'b', label: 'three' });
  assert.equal(h.future.length, 0);
  assert.equal(redo(h), h);
});

test('same-key steps merge only while open and quick', () => {
  let h = startHistory('');
  h = record(h, 'T', { id: 'a', label: 'notes', key: 'notes' }, 0);
  h = record(h, 'Ta', { id: 'b', label: 'notes', key: 'notes' }, 500);
  assert.equal(h.past.length, 1);
  assert.equal(h.past[0].before, '');
  h = record(h, 'Tac', { id: 'c', label: 'notes', key: 'notes' }, 5000);
  assert.equal(h.past.length, 2);
  // Undo seals the step: typing again starts a new one instead of rewriting history.
  h = undo(h);
  h = record(h, 'Tax', { id: 'd', label: 'notes', key: 'notes' }, 5100);
  assert.equal(h.past.length, 2);
  assert.equal(undo(h).present, 'Ta');
});

test('navigation keeps the stacks, no-ops record nothing, the stack is capped', () => {
  const same = { v: 1 };
  let h = startHistory(same);
  assert.equal(record(h, same, { id: 'x', label: 'none' }), h);
  h = record(h, { v: 2 }, { id: 'a', label: 'two' });
  h = navigate(h, { v: 3 });
  assert.equal(h.past.length, 1);
  assert.equal(undo(h).present.v, 1);
  let n = startHistory(0);
  for (let i = 1; i <= HISTORY_LIMIT + 10; i++) n = record(n, i, { id: String(i), label: String(i) });
  assert.equal(n.past.length, HISTORY_LIMIT);
});
