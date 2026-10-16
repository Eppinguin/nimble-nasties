import type { Armor, Monster, MonsterAction, MonsterKind } from './types.ts';
import { DICE, LAST_ROW, SAVE_STATS, abilityById, draftToMonster } from './forge.ts';
import type { ForgeAction, ForgeDraft, ForgeTrait } from './forge.ts';

/** Homebrew travels without a server: a shared link carries the whole stat block
 *  (and the forge controls it was built with) in the URL fragment, which browsers
 *  never send to the host. `#monster=y<data>` is the packed wire format below,
 *  deflate-raw and base64url; `x<data>` the same uncompressed, for browsers without
 *  CompressionStream. Early links (`z`, `j`: the monster's plain JSON) still open.
 *  A file holds any number of monsters: `{ format: MONSTER_FORMAT, monsters: [...] }`.
 *  Everything read back is untrusted and goes through `readMonster`. */
export const SHARE_KEY = 'monster';
export const MONSTER_FORMAT = 'nimble-nasties-monsters-v1';

const KINDS: MonsterKind[] = ['standard', 'minion', 'legendary', 'team'];
const ARMORS: Armor[] = ['none', 'medium', 'heavy'];
const TEXT = 4000;
const LABEL = 120;

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined);
const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined);
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max).filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object') : []);
const shortId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const strip = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** Forge controls are only kept when every field is well formed; otherwise the
 *  forge rebuilds them from the stat block, as it does for a remix. */
function readDraft(v: unknown): ForgeDraft | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const d = v as Record<string, unknown>;
  const kinds = ['standard', 'minion', 'legendary'];
  if (typeof d.name !== 'string' || !kinds.includes(d.kind as string) || !Number.isInteger(d.row) || (d.row as number) < 0 || (d.row as number) > LAST_ROW) return undefined;
  if (!ARMORS.includes(d.armor as Armor) || !Number.isInteger(d.shape) || Math.abs(d.shape as number) > LAST_ROW || !DICE.some((x) => x.die === d.die)) return undefined;
  if (typeof d.twoAttacks !== 'boolean' || !['level', 'hp', 'damage'].includes(d.payWith as string) || typeof d.family !== 'string' || typeof d.size !== 'string' || num(d.speed, 0, 99) === undefined) return undefined;
  if (!d.saves || typeof d.saves !== 'object' || !Array.isArray(d.traits) || !Array.isArray(d.actions)) return undefined;
  const saves: ForgeDraft['saves'] = {};
  const given = d.saves as Record<string, unknown>;
  if (Object.keys(given).some((stat) => !(SAVE_STATS as readonly string[]).includes(stat))) return undefined;
  // Always in stat order, so two copies of the same controls compare equal.
  for (const stat of SAVE_STATS) {
    if (given[stat] === undefined) continue;
    if (![-1, 0, 1, 2].includes(given[stat] as number)) return undefined;
    saves[stat] = given[stat] as -1 | 0 | 1 | 2;
  }
  const traits: ForgeTrait[] = list(d.traits, 40).map((t) => strip({ id: str(t.id, 80) ?? shortId(), abilityId: str(t.abilityId, 80), name: typeof t.name === 'string' ? t.name.slice(0, LABEL) : '', text: typeof t.text === 'string' ? t.text.slice(0, TEXT) : undefined, own: t.own === true ? true : undefined }));
  const actions: ForgeAction[] = list(d.actions, 16).map((a) =>
    strip({ id: str(a.id, 80) ?? shortId(), name: typeof a.name === 'string' ? a.name.slice(0, LABEL) : '', notation: typeof a.notation === 'string' ? a.notation.slice(0, LABEL) : '', description: typeof a.description === 'string' ? a.description.slice(0, TEXT) : '', range: str(a.range, LABEL) }),
  );
  return strip({
    name: d.name.slice(0, LABEL),
    kind: d.kind as ForgeDraft['kind'],
    row: d.row as number,
    armor: d.armor as Armor,
    shape: d.shape as number,
    die: d.die as ForgeDraft['die'],
    twoAttacks: d.twoAttacks,
    payWith: d.payWith as ForgeDraft['payWith'],
    hp: num(d.hp, 1, 9999),
    family: d.family.slice(0, LABEL),
    size: d.size.slice(0, 40),
    speed: d.speed as number,
    saves,
    traits,
    actions,
    actionInstructions: str(d.actionInstructions, TEXT),
    bloodied: str(d.bloodied, TEXT),
    lastStandText: str(d.lastStandText, TEXT),
    lastStand: num(d.lastStand, 1, 9999),
  });
}

/** A homebrew stat block from someone else's file or link, or null. Only the stat
 *  block's own fields survive: no summon wiring, and source links only to Nimble
 *  Nexus (with the creator's name, for credit). Some GMG stat blocks are all traits,
 *  so `actions` only has to be a list. */
export function readMonster(v: unknown): Monster | null {
  if (!v || typeof v !== 'object') return null;
  const m = v as Record<string, unknown>;
  const name = str(m.name, LABEL);
  const level = num(m.level, 0, 30);
  const actions: MonsterAction[] = list(m.actions, 16).map((a, i) => strip({ id: str(a.id, 80) ?? `a${i + 1}`, name: str(a.name, LABEL) ?? 'Action', notation: str(a.notation, LABEL), description: typeof a.description === 'string' ? a.description.slice(0, TEXT) : '', range: str(a.range, LABEL) }));
  if (!name || level === undefined || !Array.isArray(m.actions)) return null;
  const id = typeof m.id === 'string' && /^homebrew-[\w-]{1,80}$/.test(m.id) ? m.id : `homebrew-${shortId()}`;
  return strip({
    id,
    name,
    level,
    kind: KINDS.includes(m.kind as MonsterKind) ? (m.kind as MonsterKind) : 'standard',
    armor: ARMORS.includes(m.armor as Armor) ? (m.armor as Armor) : 'none',
    hp: m.hp === null ? null : (num(m.hp, 1, 9999) ?? null),
    hpPerHero: num(m.hpPerHero, 1, 999),
    lastStand: num(m.lastStand, 1, 9999),
    family: str(m.family, LABEL) ?? 'Homebrew',
    role: str(m.role, LABEL) ?? 'Custom',
    size: str(m.size, 40),
    speed: num(m.speed, 0, 99),
    saves: str(m.saves, LABEL),
    traits: list(m.traits, 40).map((t) => ({ name: str(t.name, LABEL) ?? 'Trait', description: typeof t.description === 'string' ? t.description.slice(0, TEXT) : '' })),
    actions,
    actionInstructions: str(m.actionInstructions, TEXT),
    bloodied: str(m.bloodied, TEXT),
    lastStandText: str(m.lastStandText, TEXT),
    source: 'homebrew' as const,
    edition: 'unknown' as const,
    sourceUrl: typeof m.sourceUrl === 'string' && /^https:\/\/nimble\.nexus\/[\w./-]{0,200}$/.test(m.sourceUrl) ? m.sourceUrl : undefined,
    author: str(m.author, LABEL),
    forge: readDraft(m.forge),
  });
}

/** Same stat block and forge controls, whatever order the fields were written in.
 *  Row ids are bookkeeping (links don't carry them), so they don't count. */
export function sameMonster(a: Monster, b: Monster): boolean {
  const plain = (m: Monster) => {
    const r = readMonster(m);
    if (!r) return '';
    const forge = r.forge && { ...r.forge, traits: r.forge.traits.map((t) => ({ ...t, id: '' })), actions: r.forge.actions.map((x) => ({ ...x, id: '' })) };
    return JSON.stringify({ ...r, id: '', actions: r.actions.map((x) => ({ ...x, id: '' })), forge });
  };
  return plain(a) === plain(b);
}

/* The wire format: positional arrays instead of named fields, `0` for anything
 * absent or at its default (trailing ones dropped), forge abilities by id instead
 * of their text, and no row ids. A forge-built monster whose stat block is exactly
 * what its controls produce travels as the controls alone and is rebuilt on arrival.
 *   [1, id, monster, draft?]  stat block (plus controls); a Nexus source link, credit and HP per hero ride at its end
 *   [2, id, draft]            controls only */
type Wire = unknown[];
const FORGE_KINDS = ['standard', 'minion', 'legendary'] as const;
const PAYS = ['level', 'hp', 'damage'] as const;
const trim = (a: unknown[]) => {
  while (a.length && (a.at(-1) === 0 || a.at(-1) === undefined)) a.pop();
  return a.map((v) => v ?? 0);
};
const opt = (v: unknown) => (v === 0 || v === undefined || v === null ? undefined : v);
const optStr = (v: unknown) => (typeof v === 'string' ? v : undefined);
const at = (a: unknown, i: number) => (Array.isArray(a) ? a[i] : undefined);
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/** `homebrew-<uuid>` travels as the bare 32 hex digits. */
function packId(id: string) {
  const rest = id.replace(/^homebrew-/, '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(rest) ? rest.replace(/-/g, '') : rest;
}
function unpackId(v: unknown) {
  if (typeof v !== 'string') return undefined;
  return `homebrew-${/^[0-9a-f]{32}$/.test(v) ? v.replace(/^(.{8})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4-') : v}`;
}

function packDraft(d: ForgeDraft): Wire {
  const saves = SAVE_STATS.map((stat) => (d.saves[stat] ?? 0) + 1).join('');
  return trim([
    d.name,
    FORGE_KINDS.indexOf(d.kind),
    d.row,
    ARMORS.indexOf(d.armor),
    d.shape,
    d.die,
    d.twoAttacks ? 1 : 0,
    PAYS.indexOf(d.payWith),
    d.hp,
    d.family === 'Homebrew' ? 0 : d.family,
    d.size === 'Medium' ? 0 : d.size,
    d.speed === 6 ? 0 : d.speed,
    saves === '1111' ? 0 : saves,
    d.traits.map((t) => (t.abilityId && t.text === undefined && !t.own && t.name === abilityById.get(t.abilityId)?.name ? t.abilityId : trim([t.name, t.text, t.abilityId, t.own ? 1 : 0]))),
    d.actions.map((a) => trim([a.name, a.notation === 'auto' ? 1 : a.notation, a.description, a.range])),
    d.actionInstructions,
    d.bloodied,
    d.lastStandText,
    d.lastStand,
  ]);
}
function unpackDraft(w: unknown): unknown {
  if (!Array.isArray(w)) return undefined;
  const [name, kind, row, armor, shape, die, two, pay, hp, family, size, speed, saves, traits, actions, actionInstructions, bloodied, lastStandText, lastStand] = w;
  const edges = typeof saves === 'string' ? saves : '1111';
  return {
    name,
    kind: FORGE_KINDS[kind as number],
    row,
    armor: ARMORS[armor as number],
    shape: shape ?? 0,
    die,
    twoAttacks: two === 1,
    payWith: PAYS[(pay as number) ?? 0],
    hp: opt(hp),
    family: optStr(family) ?? 'Homebrew',
    size: optStr(size) ?? 'Medium',
    speed: opt(speed) ?? 6,
    saves: Object.fromEntries(SAVE_STATS.map((stat, i) => [stat, Number(edges[i] ?? 1) - 1]).filter(([, edge]) => edge)),
    traits: arr(traits).map((t, i) => (typeof t === 'string' ? { id: `t${i + 1}`, abilityId: t, name: abilityById.get(t)?.name ?? t } : { id: `t${i + 1}`, name: at(t, 0) ?? '', text: optStr(at(t, 1)), abilityId: optStr(at(t, 2)), own: at(t, 3) === 1 || undefined })),
    actions: arr(actions).map((a, i) => ({ id: `a${i + 1}`, name: at(a, 0) ?? '', notation: at(a, 1) === 1 ? 'auto' : (optStr(at(a, 1)) ?? ''), description: optStr(at(a, 2)) ?? '', range: optStr(at(a, 3)) })),
    actionInstructions: opt(actionInstructions),
    bloodied: opt(bloodied),
    lastStandText: opt(lastStandText),
    lastStand: opt(lastStand),
  };
}

function packMonster(m: Monster): Wire {
  return trim([
    m.name,
    m.level,
    KINDS.indexOf(m.kind),
    ARMORS.indexOf(m.armor),
    m.hp,
    m.family === 'Homebrew' ? 0 : m.family,
    m.role === 'Custom' ? 0 : m.role,
    m.size,
    m.speed,
    m.saves,
    m.traits.map((t) => trim([t.name, t.description])),
    m.actions.map((a) => trim([a.name, a.notation, a.description, a.range])),
    m.actionInstructions,
    m.bloodied,
    m.lastStandText,
    m.lastStand,
    m.sourceUrl,
    m.author,
    m.hpPerHero,
  ]);
}
function unpackMonster(w: unknown, id: string | undefined): unknown {
  if (!Array.isArray(w)) return undefined;
  const [name, level, kind, armor, hp, family, role, size, speed, saves, traits, actions, actionInstructions, bloodied, lastStandText, lastStand, sourceUrl, author, hpPerHero] = w;
  return {
    id,
    name,
    level: level ?? 0,
    kind: KINDS[(kind as number) ?? 0],
    armor: ARMORS[(armor as number) ?? 0],
    hp: opt(hp) ?? null,
    family: opt(family),
    role: opt(role),
    size: opt(size),
    speed: opt(speed),
    saves: opt(saves),
    traits: arr(traits).map((t) => ({ name: at(t, 0), description: optStr(at(t, 1)) ?? '' })),
    actions: arr(actions).map((a, i) => ({ id: `a${i + 1}`, name: at(a, 0), notation: opt(at(a, 1)), description: optStr(at(a, 2)) ?? '', range: opt(at(a, 3)) })),
    actionInstructions: opt(actionInstructions),
    bloodied: opt(bloodied),
    lastStandText: opt(lastStandText),
    lastStand: opt(lastStand),
    sourceUrl: opt(sourceUrl),
    author: opt(author),
    hpPerHero: opt(hpPerHero),
  };
}

export function packWire(monster: Monster): Wire {
  const m = readMonster(monster);
  if (!m) throw Error('Not a stat block');
  const id = packId(m.id);
  if (m.forge && sameMonster(draftToMonster(m.forge, m.id), m)) return [2, id, packDraft(m.forge)];
  return trim([1, id, packMonster(m), m.forge && packDraft(m.forge)]);
}
export function unpackWire(w: unknown): Monster | null {
  if (!Array.isArray(w)) return null;
  const id = unpackId(w[1]);
  if (w[0] === 2) {
    const draft = readDraft(unpackDraft(w[2]));
    return draft ? readMonster(draftToMonster(draft, id ?? '')) : null;
  }
  if (w[0] !== 1) return null;
  const monster = unpackMonster(w[2], id);
  return monster ? readMonster({ ...monster, forge: unpackDraft(w[3]) }) : null;
}

function toBase64Url(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(text: string) {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
/** Far above any real stat block, far below what a crafted link could inflate to. */
const MAX_UNPACKED = 1024 * 1024;
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, limit = Infinity) {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    size += next.value.length;
    if (size > limit) {
      await reader.cancel();
      throw Error('Link unpacks too large');
    }
    chunks.push(next.value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/** The fragment payload for one monster (without the `#monster=`). */
export async function encodeMonster(monster: Monster): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(packWire(monster)));
  if (typeof CompressionStream === 'undefined') return `x${toBase64Url(json)}`;
  return `y${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
}

export async function decodeMonster(payload: string): Promise<Monster | null> {
  try {
    const body = fromBase64Url(payload.slice(1));
    const kind = payload[0];
    const bytes = kind === 'y' || kind === 'z' ? await pipe(body, new DecompressionStream('deflate-raw'), MAX_UNPACKED) : kind === 'x' || kind === 'j' ? body : null;
    if (!bytes) return null;
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return kind === 'y' || kind === 'x' ? unpackWire(data) : readMonster(data);
  } catch {
    return null;
  }
}

export async function shareUrl(monster: Monster, base: string): Promise<string> {
  return `${base.split('#')[0]}#${SHARE_KEY}=${await encodeMonster(monster)}`;
}

/** The payload in a pasted link or a location hash, if it carries one. */
export function sharedPayload(text: string): string | null {
  const match = new RegExp(`[#&]${SHARE_KEY}=([xyzj][\\w-]+)`).exec(text.trim());
  return match ? match[1] : null;
}

/** Monsters in an imported file: a monsters file, a full encounter export, an array, or one stat block. */
export function monstersInFile(raw: unknown): Monster[] {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const entries = Array.isArray(raw) ? raw : Array.isArray(r.monsters) ? r.monsters : Array.isArray(r.customMonsters) ? r.customMonsters : [raw];
  return entries.map(readMonster).filter((m): m is Monster => m !== null);
}

/** File contents isn't an encounter export: it is (only) monsters. */
export function isMonsterFile(raw: unknown): boolean {
  if (Array.isArray(raw)) return true;
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return r.format === MONSTER_FORMAT || (!('encounters' in r) && !('cards' in r) && !('combatants' in r) && Array.isArray(r.actions));
}

/** Imported monsters next to the library: new ones join, identical ones are skipped.
 *  A changed one replaces the one with the same id, unless `keepMine`: homebrew that
 *  rides along with encounters may be older than yours, so yours stays (`kept`). */
export function mergeMonsters(mine: Monster[], incoming: Monster[], { keepMine = false } = {}) {
  const added: Monster[] = [];
  const updated: Monster[] = [];
  let kept = 0;
  for (const m of incoming) {
    const old = mine.find((x) => x.id === m.id) ?? added.find((x) => x.id === m.id);
    if (!old) added.push(m);
    else if (!sameMonster(old, m) && mine.includes(old)) {
      if (keepMine) kept++;
      else updated.push(m);
    }
  }
  const next = [...mine.map((m) => updated.find((u) => u.id === m.id) ?? m), ...added];
  return { next, added: added.length, updated: updated.length, kept, same: incoming.length - added.length - updated.length - kept };
}
