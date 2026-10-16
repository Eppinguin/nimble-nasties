import assert from 'node:assert/strict';
import test from 'node:test';
import { createEncounter, serializeBoard } from './board.ts';
import type { NemesesState } from './board.ts';
import { record, startHistory, undo } from './history.ts';
import { packHistory, unpackHistory } from './sessionHistory.ts';

function played() {
  const a = createEncounter('Bridge');
  const b = createEncounter('Cave');
  const start: NemesesState = { encounters: [a, b], activeId: a.id, customMonsters: [] };
  let h = startHistory(start);
  h = record(h, { ...h.present, encounters: [{ ...a, round: 2 }, b] }, { id: 's1', label: 'Next round (2)', kind: 'round' });
  h = record(h, { ...h.present, encounters: [{ ...h.present.encounters[0], round: 3, packLog: [] }, b] }, { id: 's2', label: 'Next round (3)' });
  return undo(h);
}

test('a reload brings undo and redo back, with shared encounters written once', () => {
  const history = played();
  const raw = packHistory(history);
  const back = unpackHistory(raw, serializeBoard(history.present));
  assert.ok(back);
  assert.equal(serializeBoard(back.present), serializeBoard(history.present));
  assert.deepEqual(
    back.past.map((s) => [s.id, s.label, s.kind]),
    [['s1', 'Next round (2)', 'round']],
  );
  assert.equal(back.future[0].label, 'Next round (3)');
  assert.equal(back.future[0].after?.encounters[0].round, 3);
  assert.equal(back.past[0].before.encounters[0].round, 1);
  // The untouched second encounter is one object in every snapshot.
  assert.equal(back.past[0].before.encounters[1], back.present.encounters[1]);
  assert.equal((JSON.parse(raw) as { encounters: unknown[] }).encounters.length, 4);
  assert.ok(!raw.includes('packLog'));
});

test('a history whose board was saved over since, or is damaged, is not used', () => {
  const history = played();
  const raw = packHistory(history);
  assert.equal(unpackHistory(raw, serializeBoard({ ...history.present, activeId: 'elsewhere' })), null);
  assert.equal(unpackHistory(raw, null), null);
  assert.equal(unpackHistory(raw.slice(0, -5), serializeBoard(history.present)), null);
  assert.equal(unpackHistory(JSON.stringify({ ...JSON.parse(raw), present: 99 }), serializeBoard(history.present)), null);
});
