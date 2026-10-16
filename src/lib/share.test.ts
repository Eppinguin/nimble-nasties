import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { ABILITIES, LEVEL_ROWS, addAbility, blankDraft, draftToMonster, monsterToDraft } from './forge.ts';
import { officialCatalog } from '../data/official.ts';
import { decodeMonster, encodeMonster, packWire, isMonsterFile, mergeMonsters, monstersInFile, readMonster, sameMonster, shareUrl, sharedPayload } from './share.ts';

const forged = () => draftToMonster(addAbility(addAbility({ ...blankDraft(LEVEL_ROWS.findIndex((r) => r.level === 5)), name: 'Bog Hag', family: 'Hags', shape: 2 }, ABILITIES[0]), ABILITIES[5]), 'homebrew-bog-hag');

test('a forged monster survives the link round trip, forge controls included', async () => {
  const hag = forged();
  const back = await decodeMonster(await encodeMonster(hag));
  assert.ok(back);
  assert.ok(sameMonster(hag, back));
  assert.deepEqual(
    back.forge?.traits.map((t) => t.abilityId),
    hag.forge?.traits.map((t) => t.abilityId),
  );
  assert.equal(back.forge?.shape, hag.forge?.shape);
  assert.equal(back.id, hag.id);
});

test('a share link stays short enough for any chat app', async () => {
  const url = await shareUrl(forged(), 'https://example.com/nimble-nasties/#old');
  assert.ok(url.startsWith('https://example.com/nimble-nasties/#monster=y'));
  assert.ok(url.length < 2000, `link is ${url.length} characters`);
  assert.equal(sharedPayload(`look at this ${url} `), url.split('=')[1]);
});

test('a broken or tampered link reads as nothing', async () => {
  assert.equal(await decodeMonster('zNotDeflate'), null);
  assert.equal(await decodeMonster('q123'), null);
  assert.equal(sharedPayload('https://example.com/#encounter'), null);
});

test('a link that inflates far past any stat block reads as nothing', async () => {
  const bomb = deflateRawSync(Buffer.alloc(8 * 1024 * 1024, 0x20)).toString('base64url');
  assert.ok(bomb.length < 20_000, `bomb link is ${bomb.length} characters`);
  assert.equal(await decodeMonster(`y${bomb}`), null);
});

test('foreign stat blocks lose anything that is not stat block', () => {
  const m = readMonster({ ...forged(), id: 'javascript:alert(1)', source: 'official', sourceUrl: 'javascript:alert(1)', summon: { by: 'x' }, forge: { row: 99 } });
  assert.ok(m);
  assert.match(m.id, /^homebrew-/);
  assert.equal(m.source, 'homebrew');
  assert.equal(m.sourceUrl, undefined);
  assert.equal(m.summon, undefined);
  assert.equal(m.forge, undefined);
  assert.equal(readMonster({ name: 'Not a stat block', level: 1 }), null);
  assert.ok(readMonster({ name: 'All traits', level: 1, actions: [] }));
});

test('files: one stat block, a monsters file, or an encounter export', () => {
  const hag = forged();
  assert.equal(monstersInFile(hag).length, 1);
  assert.ok(isMonsterFile(hag));
  assert.ok(isMonsterFile({ format: 'nimble-nasties-monsters-v1', monsters: [hag] }));
  assert.ok(!isMonsterFile({ format: 'nimble-nasties-v1', encounters: [], customMonsters: [hag] }));
  assert.equal(monstersInFile({ customMonsters: [hag, { junk: true }] }).length, 1);
});

test('importing adds new monsters, replaces changed ones, skips identical ones', () => {
  const hag = forged();
  const other = { ...hag, id: 'homebrew-other', name: 'Other' };
  const changed = { ...hag, hp: 99 };
  const result = mergeMonsters([hag], [changed, other, other]);
  assert.deepEqual([result.added, result.updated, result.same], [1, 1, 1]);
  assert.equal(result.next.find((m) => m.id === hag.id)?.hp, 99);
});

test('homebrew riding along with encounters never replaces your version', () => {
  const hag = forged();
  const other = { ...hag, id: 'homebrew-other', name: 'Other' };
  const result = mergeMonsters([hag], [{ ...hag, hp: 99 }, other], { keepMine: true });
  assert.deepEqual([result.added, result.updated, result.kept, result.same], [1, 0, 1, 0]);
  assert.equal(result.next.find((m) => m.id === hag.id)?.hp, hag.hp);
});

test('a forge-built monster travels as its controls alone', async () => {
  assert.equal(packWire(forged())[0], 2);
});

test('every bestiary stat block survives the packed format, with and without forge controls', async () => {
  for (const official of officialCatalog) {
    const plain = { ...official, id: 'homebrew-0f8fad5b-d9cb-469f-a165-70867728950e', source: 'homebrew' as const };
    const remix = draftToMonster(monsterToDraft(official, true), plain.id);
    for (const m of [plain, remix]) {
      const back = await decodeMonster(await encodeMonster(m));
      assert.ok(back && sameMonster(m, back), m.name);
      assert.equal(back.id, plain.id);
    }
  }
});

test('links from before the packed format still open', async () => {
  const hag = forged();
  const json = new TextEncoder().encode(JSON.stringify(hag));
  const z = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const old =
    'z' +
    btoa(String.fromCharCode(...z))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const back = await decodeMonster(old);
  assert.ok(back && sameMonster(hag, back));
});
