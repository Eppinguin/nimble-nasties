import test from 'node:test';
import assert from 'node:assert/strict';
import { arriveAsPack, defeatInPack, hitKills, lanePacks, mergePacks, minionDie, moveToPack, packEntries, recordPackRoll, setPackDone, splitPack, toAct, undoPackEntry } from './horde.ts';
import type { NemesisCard, NemesisEncounter } from './board.ts';

const minion = (i: number, extra: Partial<NemesisCard> = {}): NemesisCard => ({ id: `m${i}`, monsterId: 'gob', name: 'Goblin Minion', hp: 1, maxHp: 1, conditions: [], lane: 'active', acted: false, ...extra });
const horde = (n: number): NemesisEncounter => ({ id: 'e', name: 'E', description: '', rules: 'nimble-jul26', heroes: [], cards: Array.from({ length: n }, (_, i) => minion(i + 1)), round: 1, notes: '', createdAt: '' });
const roll = (id: string, action = 'Stab') => ({ id, action, total: 9, hits: 3 });

test('an unsplit horde is one implicit pack', () => {
  const packs = lanePacks(horde(8), 'gob');
  assert.equal(packs.length, 1);
  assert.equal(packs[0].implicit, true);
  assert.equal(packs[0].cards.length, 8);
});

test('actions share one pool: 5 stab, then 3 shoot and everyone has acted', () => {
  let e = recordPackRoll(horde(8), 'gob', '', 5, roll('r1', 'Stab'));
  assert.equal(toAct(lanePacks(e, 'gob')[0]).length, 3);
  e = recordPackRoll(e, 'gob', '', 3, roll('r2', 'Shoot'));
  assert.equal(toAct(lanePacks(e, 'gob')[0]).length, 0);
  assert.deepEqual(
    packEntries(e, 'gob', '').map((x) => x.action),
    ['Stab', 'Shoot'],
  );
});

test('undoing a roll hands exactly those minions their action back', () => {
  let e = recordPackRoll(horde(8), 'gob', '', 5, roll('r1'));
  e = recordPackRoll(e, 'gob', '', 2, roll('r2'));
  e = undoPackEntry(e, 'r1');
  assert.equal(toAct(lanePacks(e, 'gob')[0]).length, 6);
  assert.deepEqual(
    packEntries(e, 'gob', '').map((x) => x.id),
    ['r2'],
  );
});

test('marking a pack done holds the rest back; unmarking clears its turn', () => {
  let e = recordPackRoll(horde(6), 'gob', '', 4, roll('r1'));
  e = setPackDone(e, 'gob', '', true, 'h1');
  assert.equal(toAct(lanePacks(e, 'gob')[0]).length, 0);
  assert.equal(packEntries(e, 'gob', '').at(-1)?.held, true);
  assert.equal(packEntries(e, 'gob', '').at(-1)?.cardIds.length, 2);
  e = setPackDone(e, 'gob', '', false, 'x');
  assert.equal(toAct(lanePacks(e, 'gob')[0]).length, 6);
  assert.equal(packEntries(e, 'gob', '').length, 0);
});

test('the first split names both packs', () => {
  const { encounter, packId } = moveToPack(horde(10), 'gob', ['m7', 'm8', 'm9', 'm10'], null, 'p');
  const packs = lanePacks(encounter, 'gob');
  assert.deepEqual(
    packs.map((p) => [p.name, p.cards.length]),
    [
      ['Pack A', 6],
      ['Pack B', 4],
    ],
  );
  assert.equal(packs[1].id, packId);
  assert.equal(
    packs.some((p) => p.implicit),
    false,
  );
});

test('moving the last minion out of a pack removes it', () => {
  let e = moveToPack(horde(3), 'gob', ['m3'], null, 'p').encounter;
  const [a, b] = lanePacks(e, 'gob');
  e = moveToPack(e, 'gob', ['m3'], a.id, 'q').encounter;
  assert.deepEqual(
    lanePacks(e, 'gob').map((p) => p.cards.length),
    [3],
  );
  assert.equal(
    e.packs?.some((p) => p.id === b.id),
    false,
  );
});

test('merge and split', () => {
  let e = moveToPack(horde(8), 'gob', ['m5', 'm6', 'm7', 'm8'], null, 'p').encounter;
  let [a, b] = lanePacks(e, 'gob');
  e = mergePacks(e, 'gob', b.id, a.id);
  assert.deepEqual(
    lanePacks(e, 'gob').map((p) => p.cards.length),
    [8],
  );
  [a] = lanePacks(e, 'gob');
  e = splitPack(e, 'gob', a.id, 's');
  assert.deepEqual(
    lanePacks(e, 'gob').map((p) => p.cards.length),
    [4, 4],
  );
});

test('kills take minions still to act first, inside the pack only', () => {
  let e = moveToPack(horde(6), 'gob', ['m4', 'm5', 'm6'], null, 'p').encounter;
  const [a, b] = lanePacks(e, 'gob');
  e = recordPackRoll(e, 'gob', b.id, 1, roll('r1'));
  const result = defeatInPack(e, 'gob', b.id, 2);
  assert.deepEqual(result.fallen, ['m5', 'm6']);
  assert.equal(
    lanePacks(result.encounter, 'gob')[0].cards.every((c) => c.lane === 'active'),
    true,
    `${a.name} untouched`,
  );
});

test('overkill: die size is durability, any damage kills one', () => {
  assert.equal(hitKills(20, 10, true), 2);
  assert.equal(hitKills(20, 4, true), 5);
  assert.equal(hitKills(3, 6, true), 1);
  assert.equal(hitKills(20, 6, false), 1);
  assert.equal(hitKills(0, 6, true), 0);
  assert.equal(minionDie('1d8'), 8);
});

test('summons join as their own pack when the lane already has minions', () => {
  const fresh = [minion(11), minion(12)];
  const e = arriveAsPack(horde(3), 'gob', fresh, 'p');
  assert.deepEqual(
    lanePacks(e, 'gob').map((p) => p.cards.length),
    [3, 2],
  );
  assert.deepEqual(
    lanePacks(arriveAsPack({ ...horde(0) }, 'gob', fresh, 'p'), 'gob').map((p) => p.cards.length),
    [2],
  );
});
