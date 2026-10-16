import test from 'node:test';
import assert from 'node:assert/strict';
import { bundledTwin, fetchNexus, fetchNexusEncounter, fromNexus, hashNexusTarget, monstersInNexusDocument, nexusCount, nexusRatio, nexusTarget } from './nexus.ts';
import { monsterHp } from './rules.ts';
import { officialCatalog } from '../data/official.ts';
import { decodeMonster, encodeMonster, readMonster, sameMonster } from './share.ts';

// Trimmed from https://nimble.nexus/api/monsters/7aft60azdm858rdd35qg4bj7kd?include=families,creator (October 2026).
const asuvius = {
  data: {
    type: 'monsters',
    id: '7aft60azdm858rdd35qg4bj7kd',
    attributes: {
      name: ' "Asuvius" the Magmin Uraniac',
      hazard: false,
      hp: 50,
      level: 1,
      size: 'small',
      armor: 'none',
      kind: 'Elemental',
      movement: [{ speed: 6 }, { mode: 'fly', speed: 8 }],
      abilities: [{ name: 'Fiery.', description: 'Immune to fire.' }],
      actions: [
        { name: 'Touch', description: '2d8+2 If target is a creature or flammable it starts burning.', target: { reach: 1 } },
        { name: 'Steamblast', description: '(1 use, cone 6) DC 10 STR save.', damage: { roll: '2d8+2' }, target: { range: 6 } },
      ],
      actionsInstructions: 'Choose one.',
      subtype: 'legendary',
      legendary: true,
      bloodied: { description: 'At 25 HP, Steamblast recharges' },
      lastStand: { description: 'Asuvius is dying! 13 more damage and it dies.' },
      saves: { int: 1, dex: -1 },
    },
    relationships: { creator: { data: { type: 'users', id: '7nm1e71qhw8s1b63smyjhvdxqb' } }, families: { data: [{ type: 'families', id: '3tnm70cktw9s6bvb3jnyz44fsg' }] } },
  },
  included: [
    { type: 'families', id: '3tnm70cktw9s6bvb3jnyz44fsg', attributes: { name: 'Magmin' } },
    { type: 'users', id: '7nm1e71qhw8s1b63smyjhvdxqb', attributes: { username: 'antlers6109', displayName: 'Antlers' } },
  ],
};

test('Nexus links: monsters and collections, with or without the slug', () => {
  assert.deepEqual(nexusTarget('https://nimble.nexus/monsters/asuvius-the-magmin-uraniac-7aft60azdm858rdd35qg4bj7kd'), { kind: 'monsters', id: '7aft60azdm858rdd35qg4bj7kd' });
  assert.deepEqual(nexusTarget(' see https://nimble.monster/m/7aft60azdm858rdd35qg4bj7kd?x=1 '), { kind: 'monsters', id: '7aft60azdm858rdd35qg4bj7kd' });
  assert.deepEqual(nexusTarget('nimblenomi.com/monsters/x-7aft60azdm858rdd35qg4bj7kd'), null);
  assert.deepEqual(nexusTarget('https://nimblenomi.com/monsters/asuvius-the-magmin-uraniac-7aft60azdm858rdd35qg4bj7kd'), { kind: 'monsters', id: '7aft60azdm858rdd35qg4bj7kd' });
  assert.deepEqual(nexusTarget('https://nimble.nexus/collections/a-cult-driven-world-3r2eq76km09d9bwg4b48pckbw9'), { kind: 'collections', id: '3r2eq76km09d9bwg4b48pckbw9' });
  assert.equal(nexusTarget('https://nimble.nexus/rules/monster-levels'), null);
  assert.equal(nexusTarget('https://evil.example/monsters/7aft60azdm858rdd35qg4bj7kd'), null);
});

test('Nexus links in a location hash', () => {
  const id = '3ka6av60j284esv0wd70k4dbhm';
  assert.deepEqual(hashNexusTarget(`#monster=https://nimble.nexus/monsters/rahadin-castle-chamberlain-${id}`), { kind: 'monsters', id });
  assert.deepEqual(hashNexusTarget(`#monster=${encodeURIComponent(`https://nimble.nexus/monsters/rahadin-castle-chamberlain-${id}`)}`), { kind: 'monsters', id });
  assert.deepEqual(hashNexusTarget('#monster=https://nimble.nexus/collections/a-cult-driven-world-3r2eq76km09d9bwg4b48pckbw9'), { kind: 'collections', id: '3r2eq76km09d9bwg4b48pckbw9' });
  assert.equal(hashNexusTarget('#monster=y3ka6av60j284esv0wd70k4dbhm'), null);
  assert.equal(hashNexusTarget('#other=https://nimble.nexus/monsters/x-' + id), null);
  assert.equal(hashNexusTarget('#monster=%E0%A4%A'), null);
});

test('a Nexus monster becomes a credited homebrew stat block', () => {
  const [m] = monstersInNexusDocument(asuvius) ?? [];
  assert.ok(m);
  assert.equal(m.id, 'homebrew-nexus-7aft60azdm858rdd35qg4bj7kd');
  assert.equal(m.name, '"Asuvius" the Magmin Uraniac');
  assert.deepEqual([m.kind, m.level, m.hp, m.family, m.size, m.speed, m.saves, m.lastStand], ['legendary', 1, 50, 'Magmin', 'Small', 6, 'DEX− · INT+', 13]);
  assert.deepEqual(
    m.traits.map((t) => t.name),
    ['Movement', 'Fiery'],
  );
  assert.equal(m.traits[0].description, 'Fly 8');
  assert.deepEqual(
    m.actions.map((a) => [a.notation, a.range]),
    [
      ['2d8+2', undefined],
      ['2d8+2', '6'],
    ],
  );
  assert.match(m.actions[0].description, /^\(Reach 1\) /);
  assert.equal(m.author, 'Antlers');
  assert.equal(m.sourceUrl, 'https://nimble.nexus/monsters/7aft60azdm858rdd35qg4bj7kd');
  assert.equal(m.source, 'homebrew');
});

test('unfinished Nexus drafts and foreign records are skipped', () => {
  const blank = { ...asuvius.data, attributes: { ...asuvius.data.attributes, name: '', level: null } };
  assert.equal(fromNexus(blank), null);
  assert.equal(fromNexus({ ...asuvius.data, type: 'users' }), null);
  assert.equal(monstersInNexusDocument({ format: 'nimble-nasties-v1', encounters: [] }), null);
  assert.equal(monstersInNexusDocument([asuvius.data]), null);
});

test('credit survives a share link; only Nexus source links are kept', async () => {
  const [m] = monstersInNexusDocument(asuvius) ?? [];
  const back = await decodeMonster(await encodeMonster(m));
  assert.ok(back && sameMonster(m, back));
  assert.equal(back.author, 'Antlers');
  assert.equal(back.sourceUrl, m.sourceUrl);
  assert.equal(readMonster({ ...m, sourceUrl: 'https://nimble.nexus.evil.example/x' })?.sourceUrl, undefined);
  assert.equal(readMonster({ ...m, sourceUrl: 'javascript:alert(1)' })?.sourceUrl, undefined);
});

/** A Nexus that never answers, until the request is aborted. */
function stalledFetch(t: test.TestContext) {
  t.mock.method(globalThis, 'fetch', (_url: string, init?: RequestInit) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))));
}

test('a Nexus that never answers gives up with a message', async (t) => {
  stalledFetch(t);
  await assert.rejects(fetchNexus({ kind: 'monsters', id: asuvius.data.id }, undefined, 20), /took too long/);
});

test('closing the import cancels the Nexus request quietly', async (t) => {
  stalledFetch(t);
  const controller = new AbortController();
  const pending = fetchNexus({ kind: 'monsters', id: asuvius.data.id }, controller.signal, 10_000);
  controller.abort();
  await assert.rejects(pending, (err: unknown) => err instanceof DOMException && err.name === 'AbortError');
});

test('a Nexus answer arrives as monsters', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(asuvius), { status: 200 }));
  const [monster] = await fetchNexus({ kind: 'monsters', id: asuvius.data.id });
  assert.equal(monster.id, `homebrew-nexus-${asuvius.data.id}`);
  assert.equal(monster.author, 'Antlers');
});

test('Nexus encounter links', () => {
  assert.deepEqual(nexusTarget('https://nimble.nexus/encounters/eager-fox-inn-0ns3bh9gh08tzsg6ykp57va7e1'), { kind: 'encounters', id: '0ns3bh9gh08tzsg6ykp57va7e1' });
  assert.deepEqual(hashNexusTarget('#monster=https://nimble.nexus/encounters/0ns3bh9gh08tzsg6ykp57va7e1'), { kind: 'encounters', id: '0ns3bh9gh08tzsg6ykp57va7e1' });
});

test('encounter counts follow the party the way Nexus counts them', () => {
  const standard = { kind: 'standard' as const };
  assert.equal(nexusCount({ monster: standard, quantity: 2, perHero: false, heroesPerMonster: 1 }, 6), 2);
  assert.equal(nexusCount({ monster: standard, quantity: 1, perHero: true, heroesPerMonster: 1 }, 5), 5);
  assert.equal(nexusCount({ monster: standard, quantity: 1, perHero: true, heroesPerMonster: 2 }, 5), 3);
  assert.equal(nexusCount({ monster: standard, quantity: 1, perHero: true, heroesPerMonster: 4 }, 1), 1);
  assert.equal(nexusCount({ monster: { kind: 'legendary' }, quantity: 3, perHero: true, heroesPerMonster: 1 }, 6), 1);
  assert.equal(nexusRatio({ quantity: 1, perHero: true, heroesPerMonster: 2 }), '1 per 2 heroes');
  assert.equal(nexusRatio({ quantity: 2, perHero: true, heroesPerMonster: 1 }), '2 per hero');
});

test('a Nexus copy of a GMG monster fields the bundled one', () => {
  const official = officialCatalog.find((m) => m.name === 'Bandit Minion');
  assert.ok(official);
  const copy = { ...official, id: 'homebrew-nexus-x', source: 'homebrew' as const, name: 'bandit minion ' };
  assert.equal(bundledTwin(copy, officialCatalog)?.id, official.id);
  assert.equal(bundledTwin({ ...copy, name: 'Bandit', level: 0.5, hp: 15, kind: 'standard' }, officialCatalog), undefined);
});

test('per-hero HP scales with the party and survives a share link', async () => {
  const doc = { ...asuvius, data: { ...asuvius.data, attributes: { ...asuvius.data.attributes, hp: 0, hpPerHero: 20 } } };
  const [m] = monstersInNexusDocument(doc) ?? [];
  assert.ok(m);
  assert.deepEqual([m.hp, m.hpPerHero, monsterHp(m, 5)], [null, 20, 100]);
  const back = await decodeMonster(await encodeMonster(m));
  assert.equal(back?.hpPerHero, 20);
});

test('a Nexus encounter arrives with its party and its monsters in full', async (t) => {
  const encounter = {
    data: {
      type: 'encounters',
      id: '0ns3bh9gh08tzsg6ykp57va7e1',
      attributes: { name: 'Eager Fox Inn', description: 'The rat problem mutated.', heroCount: 5, heroLevel: 2 },
      relationships: {
        creator: { data: { type: 'users', id: '6em77219fn96vbbqfhaqpwnhgz' } },
        monsters: {
          data: [
            { type: 'monsters', id: asuvius.data.id, meta: { quantity: 1, isPerHero: true, heroesPerMonster: 2 } },
            { type: 'monsters', id: '0bn0yesrcn8fys8q1bpb2ggw1x', meta: { quantity: 1, isPerHero: false, heroesPerMonster: 1 } },
          ],
        },
      },
    },
    included: [{ type: 'users', id: '6em77219fn96vbbqfhaqpwnhgz', attributes: { username: 'innkeeper' } }],
  };
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.includes('/encounters/')) return new Response(JSON.stringify(encounter), { status: 200 });
    if (url.includes(asuvius.data.id)) return new Response(JSON.stringify(asuvius), { status: 200 });
    return new Response('{}', { status: 404 });
  });
  const found = await fetchNexusEncounter(encounter.data.id);
  assert.deepEqual([found.name, found.author, found.heroCount, found.heroLevel, found.skipped], ['Eager Fox Inn', 'innkeeper', 5, 2, 1]);
  assert.equal(found.entries.length, 1);
  assert.deepEqual([found.entries[0].perHero, found.entries[0].heroesPerMonster], [true, 2]);
  assert.equal(found.url, 'https://nimble.nexus/encounters/0ns3bh9gh08tzsg6ykp57va7e1');
});

test('a Nexus minion without a level still imports', () => {
  // https://nimble.nexus/api/monsters/41x1p2n25k8eysdr6vd2971527 (October 2026), trimmed.
  const minion = { type: 'monsters', id: '41x1p2n25k8eysdr6vd2971527', attributes: { name: 'Bandit Minion', hp: 8, level: null, armor: 'none', movement: [{ speed: 6 }], abilities: [], actions: [{ name: 'Stab ', description: '', damage: { roll: '1d8' } }], minion: true, legendary: false } };
  const m = fromNexus(minion);
  assert.ok(m);
  assert.deepEqual([m.kind, m.level], ['minion', 0]);
  assert.equal(fromNexus({ ...minion, attributes: { ...minion.attributes, minion: false } }), null);
});
