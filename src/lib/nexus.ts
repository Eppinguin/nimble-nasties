import type { Monster, MonsterAction } from './types.ts';
import { findDiceNotation } from './dice.ts';
import { SHARE_KEY, readMonster } from './share.ts';

/** Community homebrew from Nimble Nexus (nimble.nexus, also nimblenomi.com, formerly nimble.monster).
 *  Its public API speaks JSON:API with open CORS, so a pasted monster or collection
 *  link is fetched straight from the browser. Each record maps onto a homebrew stat
 *  block with id `homebrew-nexus-<nexus id>`, so importing the same monster again
 *  updates it instead of adding a copy. The result still goes through `readMonster`. */
export const NEXUS_ORIGIN = 'https://nimble.nexus';

type Resource = { type: string; id: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: unknown }> };
export type NexusTarget = { kind: 'monsters' | 'collections' | 'encounters'; id: string };

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const isResource = (v: unknown): v is Resource => typeof obj(v).type === 'string' && typeof obj(v).id === 'string';
const refs = (r: Resource, rel: string) => {
  const d = r.relationships?.[rel]?.data;
  return (Array.isArray(d) ? d : [d]).filter(isResource);
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const NEXUS_ID = /^[0-9a-z]{26}$/;

/** A Nexus monster, collection or encounter link (`/monsters/<slug>-<id>`, `/m/<id>`,
 *  `/collections/…`, `/encounters/…`), or null. */
export function nexusTarget(input: string): NexusTarget | null {
  const match = /\bhttps?:\/\/(?:www\.)?(?:nimble\.nexus|nimble\.monster|nimblenomi\.com)\/(monsters|m|collections|c|encounters)\/([\w-]+)/i.exec(input.trim());
  if (!match) return null;
  const id = match[2].toLowerCase().split('-').at(-1) ?? '';
  if (!NEXUS_ID.test(id)) return null;
  const path = match[1].toLowerCase();
  return { kind: path === 'encounters' ? 'encounters' : path.startsWith('c') ? 'collections' : 'monsters', id };
}

/** A Nexus link carried in a location hash, as in `#monster=https://nimble.nexus/monsters/…`
 *  (plain or URL-encoded), or null. */
export function hashNexusTarget(hash: string): NexusTarget | null {
  const match = new RegExp(`[#&]${SHARE_KEY}=([^&]+)`).exec(hash.trim());
  if (!match) return null;
  try {
    return nexusTarget(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function level(v: unknown) {
  if (typeof v === 'number') return v;
  const fraction = /^(\d+)\/(\d+)$/.exec(text(v));
  return fraction ? Number(fraction[1]) / Number(fraction[2]) : text(v) ? Number(v) : undefined;
}

/** One Nexus monster resource as a homebrew stat block; `lookup` resolves its family and creator. */
export function fromNexus(resource: Resource, lookup: (type: string, id: string) => Resource | undefined = () => undefined): Monster | null {
  const a = obj(resource.attributes);
  if (resource.type !== 'monsters' || !NEXUS_ID.test(resource.id)) return null;
  const family = refs(resource, 'families')
    .map((f) => text(obj(lookup('families', f.id)?.attributes).name))
    .find(Boolean);
  const creator = refs(resource, 'creator')
    .map((u) => obj(lookup('users', u.id)?.attributes))
    .map((u) => text(u.displayName) || text(u.username))
    .find(Boolean);
  const movement = (Array.isArray(a.movement) ? a.movement : []).map(obj);
  const otherMovement = movement.filter((m) => text(m.mode) && typeof m.speed === 'number').map((m) => `${cap(text(m.mode))} ${m.speed}`);
  const perHero = typeof a.hpPerHero === 'number' && a.hpPerHero > 0 ? a.hpPerHero : undefined;
  const order = ['all', 'str', 'dex', 'int', 'wil'];
  const saves = Object.entries(obj(a.saves))
    .filter(([, n]) => typeof n === 'number' && n !== 0)
    .sort(([x], [y]) => order.indexOf(x) - order.indexOf(y))
    .map(([stat, n]) => `${stat === 'all' ? 'All' : stat.toUpperCase()}${(n as number) > 0 ? '+'.repeat(n as number) : '−'.repeat(-(n as number))}`)
    .join(' · ');
  const lastStandText = text(obj(a.lastStand).description);
  const lastStand = /(\d+)\s+more damage\b/i.exec(lastStandText);
  const actions: MonsterAction[] = (Array.isArray(a.actions) ? a.actions : []).map(obj).map((x, i) => {
    const target = obj(x.target);
    const reach = typeof target.reach === 'number' ? `(Reach ${target.reach}) ` : '';
    const description = reach + text(x.description);
    return {
      id: `a${i + 1}`,
      name: text(x.name).replace(/\.$/, '') || `Action ${i + 1}`,
      notation: findDiceNotation(text(obj(x.damage).roll)) ?? findDiceNotation(text(x.description)),
      description,
      range: typeof target.range === 'number' ? String(target.range) : undefined,
    };
  });
  const traits = (Array.isArray(a.abilities) ? a.abilities : []).map(obj).map((t) => ({ name: text(t.name).replace(/\.$/, '') || 'Trait', description: text(t.description) }));
  if (otherMovement.length) traits.unshift({ name: 'Movement', description: otherMovement.join(' · ') });
  const monster = readMonster({
    id: `homebrew-nexus-${resource.id}`,
    name: text(a.name),
    // Nexus lets a minion go without a level; minions sit outside the level budget anyway.
    level: level(a.level) ?? (a.minion === true ? 0 : undefined),
    kind: a.minion === true ? 'minion' : a.legendary === true ? 'legendary' : 'standard',
    armor: a.armor,
    hp: !perHero && typeof a.hp === 'number' && a.hp > 0 ? a.hp : null,
    hpPerHero: perHero,
    lastStand: lastStand ? Number(lastStand[1]) : undefined,
    family: family || text(a.kind) || undefined,
    role: text(a.role) ? cap(text(a.role)) : undefined,
    size: text(a.size) ? cap(text(a.size)) : undefined,
    speed: movement.find((m) => !text(m.mode))?.speed,
    saves: saves || undefined,
    traits,
    actions,
    actionInstructions: text(a.actionsInstructions) || undefined,
    bloodied: text(obj(a.bloodied).description) || undefined,
    lastStandText: lastStandText || undefined,
    sourceUrl: `${NEXUS_ORIGIN}/monsters/${resource.id}`,
    author: creator,
  });
  return monster;
}

/** Monsters in a saved Nexus API response (a monster, a list, or a collection with its monsters included). */
export function monstersInNexusDocument(raw: unknown): Monster[] | null {
  const doc = obj(raw);
  const data = Array.isArray(doc.data) ? doc.data : [doc.data];
  if (!data.length || !data.every(isResource)) return null;
  const included = (Array.isArray(doc.included) ? doc.included : []).filter(isResource);
  const all = [...data, ...included];
  const lookup = (type: string, id: string) => all.find((r) => r.type === type && r.id === id);
  const monsters = all.filter((r) => r.type === 'monsters');
  return monsters.map((r) => fromNexus(r, lookup)).filter((m): m is Monster => m !== null);
}

async function getJson(path: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await fetch(`${NEXUS_ORIGIN}/api/${path}`, { signal, headers: { Accept: 'application/vnd.api+json' } });
  if (response.status === 404) throw Error(`Nimble Nexus has no ${path.startsWith('encounters') ? 'encounter' : 'monster or collection'} at that link. It may be private or deleted.`);
  if (!response.ok) throw Error(`Nimble Nexus answered ${response.status}. Try again in a moment.`);
  return obj(await response.json());
}

/** How long a Nexus import may take, lookups included, before it gives up. */
export const NEXUS_TIMEOUT = 15000;

/** The monsters behind a Nexus monster or collection link. Gives up after `timeout` with a
 *  message to show; aborting `signal` (the dialog closed) rejects with the abort reason and imports nothing. */
export function fetchNexus(target: NexusTarget, signal?: AbortSignal, timeout = NEXUS_TIMEOUT): Promise<Monster[]> {
  return bounded((s) => fetchAll(target, s), signal, timeout);
}

/** The encounter behind a Nexus encounter link, its monsters in full; same timeout and cancelling as `fetchNexus`. */
export function fetchNexusEncounter(id: string, signal?: AbortSignal, timeout = NEXUS_TIMEOUT): Promise<NexusEncounter> {
  return bounded((s) => fetchEncounter(id, s), signal, timeout);
}

async function bounded<T>(run: (signal: AbortSignal) => Promise<T>, signal: AbortSignal | undefined, timeout: number): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);
  const cancel = () => controller.abort(signal?.reason);
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  try {
    const result = await run(controller.signal);
    controller.signal.throwIfAborted();
    return result;
  } catch (err) {
    throw timedOut ? Error('Nimble Nexus took too long to answer. Try again in a moment.') : err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/** Collections only include their own creator, so other creators and families are looked up once each. */
async function fetchAll(target: NexusTarget, signal: AbortSignal): Promise<Monster[]> {
  const doc = await getJson(`${target.kind}/${target.id}?include=${target.kind === 'monsters' ? 'families,creator' : 'monsters,creator'}`, signal);
  const known = [doc.data, ...(Array.isArray(doc.included) ? doc.included : [])].filter(isResource);
  const has = (type: string, id: string) => known.some((r) => r.type === type && r.id === id);
  const missing = new Map<string, NexusTarget | { kind: 'families' | 'users'; id: string }>();
  for (const m of known.filter((r) => r.type === 'monsters')) {
    for (const f of refs(m, 'families')) if (!has('families', f.id)) missing.set(`families/${f.id}`, { kind: 'families', id: f.id });
    for (const u of refs(m, 'creator')) if (!has('users', u.id)) missing.set(`users/${u.id}`, { kind: 'users', id: u.id });
  }
  // Names only: a failed lookup leaves the family or credit out rather than the monster.
  const extra = await Promise.all(
    [...missing.keys()].slice(0, 40).map((path) =>
      getJson(path, signal)
        .then((d) => d.data)
        .catch(() => undefined),
    ),
  );
  const monsters = monstersInNexusDocument({ data: known, included: extra.filter(isResource) }) ?? [];
  if (!monsters.length) throw Error(target.kind === 'collections' ? 'This Nimble Nexus collection has no finished monsters to import.' : "This Nimble Nexus monster is missing a name or level, so it can't be imported yet.");
  return monsters;
}

/** One line of a Nexus encounter: a fixed number, or so many per so many heroes. */
export interface NexusEntry {
  monster: Monster;
  quantity: number;
  perHero: boolean;
  heroesPerMonster: number;
}
/** A Nexus encounter as its author built it: for `heroCount` heroes at `heroLevel`. */
export interface NexusEncounter {
  id: string;
  name: string;
  description: string;
  author?: string;
  heroCount: number;
  heroLevel: number;
  url: string;
  entries: NexusEntry[];
  /** Monsters that couldn't be read (unfinished, private or deleted). */
  skipped: number;
}

const count = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 1 ? Math.min(99, Math.round(v)) : fallback);

/** How many of an entry a party fields, as Nimble Nexus counts it: a legendary is always
 *  one, a fixed entry its number, a per-hero entry scales with the party. Nexus allows
 *  fractions (1 per 4 heroes with 6 heroes is 1.5); a table can't, so it rounds, never to none. */
export function nexusCount(entry: Pick<NexusEntry, 'quantity' | 'perHero' | 'heroesPerMonster'> & { monster: Pick<Monster, 'kind'> }, heroCount: number): number {
  if (entry.monster.kind === 'legendary') return 1;
  if (!entry.perHero) return entry.quantity;
  return Math.max(1, Math.round((entry.quantity * Math.max(1, heroCount)) / Math.max(1, entry.heroesPerMonster)));
}

/** How an entry reads on Nexus: "2", "1 per hero", "1 per 2 heroes". */
export function nexusRatio(entry: Pick<NexusEntry, 'quantity' | 'perHero' | 'heroesPerMonster'>): string {
  if (!entry.perHero) return String(entry.quantity);
  return entry.heroesPerMonster > 1 ? `${entry.quantity} per ${entry.heroesPerMonster} heroes` : `${entry.quantity} per hero`;
}

/** Nexus hosts the GMG bestiary too. A monster identical in name, level, kind and HP to a
 *  bundled one is that monster: the encounter uses it instead of a homebrew copy. */
export function bundledTwin(monster: Monster, official: Monster[]): Monster | undefined {
  const key = (m: Monster) => [m.name.trim().toLowerCase(), +m.level.toFixed(3), m.kind === 'team' ? 'standard' : m.kind, m.kind === 'minion' ? 1 : m.hp].join('|');
  const wanted = key(monster);
  return official.find((m) => m.source === 'official' && !m.summon && key(m) === wanted);
}

/** The encounter names its monsters and how many (Nexus lists them only when they are
 *  included, and then only as summaries); each is fetched in full, the way a monster
 *  link is, so a missing one costs only itself. */
async function fetchEncounter(id: string, signal: AbortSignal): Promise<NexusEncounter> {
  const doc = await getJson(`encounters/${id}?include=monsters,creator`, signal);
  const data = doc.data;
  if (!isResource(data) || data.type !== 'encounters') throw Error('Nimble Nexus has no encounter at that link. It may be private or deleted.');
  const a = obj(data.attributes);
  const included = (Array.isArray(doc.included) ? doc.included : []).filter(isResource);
  const creator = refs(data, 'creator')
    .map((u) => obj(included.find((r) => r.type === 'users' && r.id === u.id)?.attributes))
    .map((u) => text(u.displayName) || text(u.username))
    .find(Boolean);
  const lines = refs(data, 'monsters').slice(0, 30);
  if (!lines.length) throw Error('This Nimble Nexus encounter has no monsters yet.');
  const fetched = await Promise.all(
    lines.map((line) =>
      fetchAll({ kind: 'monsters', id: line.id }, signal)
        .then(([m]) => m)
        .catch((err: unknown) => {
          if (signal.aborted) throw err;
          return undefined;
        }),
    ),
  );
  const entries = lines.flatMap((line, i): NexusEntry[] => {
    const monster = fetched[i];
    if (!monster) return [];
    const meta = obj(obj(line).meta);
    return [{ monster, quantity: count(meta.quantity, 1), perHero: meta.isPerHero === true, heroesPerMonster: count(meta.heroesPerMonster, 1) }];
  });
  if (!entries.length) throw Error("None of this encounter's monsters could be read from Nimble Nexus. They may be private or unfinished.");
  return {
    id: data.id,
    name: text(a.name).slice(0, 120) || 'Nimble Nexus encounter',
    description: text(a.description).slice(0, 4000),
    author: creator,
    heroCount: count(a.heroCount, 4),
    heroLevel: Math.min(20, count(a.heroLevel, 1)),
    url: `${NEXUS_ORIGIN}/encounters/${data.id}`,
    entries,
    skipped: lines.length - entries.length,
  };
}
