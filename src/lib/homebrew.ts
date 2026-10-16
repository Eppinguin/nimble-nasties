import type { HomebrewOrigin, Monster } from './types.ts';

export type HomebrewSort = 'recent' | 'name' | 'level';
export type HomebrewGroup = 'none' | 'family' | 'origin';

export const ORIGIN_LABEL: Record<HomebrewOrigin, string> = { forge: 'Forged', link: 'Shared link', file: 'From a file', nexus: 'Nimble Nexus' };
const ORIGIN_ORDER: HomebrewOrigin[] = ['forge', 'nexus', 'link', 'file'];

/** Where a homebrew came from; every save path stamps it. */
export function originOf(m: Monster): HomebrewOrigin {
  return m.origin ?? 'file';
}

/** Stamp a homebrew as just saved, keeping where it first came from. */
export function stamped(m: Monster, origin: HomebrewOrigin, now = new Date()): Monster {
  return { ...m, origin: m.origin ?? origin, edited: now.toISOString() };
}

/** How many encounters field this stat block. */
export function encountersUsing(id: string, encounters: { cards: { monsterId: string }[] }[]): number {
  return encounters.filter((e) => e.cards.some((c) => c.monsterId === id)).length;
}

/** Recent puts the last saved first. */
export function sortHomebrew(list: Monster[], sort: HomebrewSort): Monster[] {
  const byName = (a: Monster, b: Monster) => a.name.localeCompare(b.name);
  return [...list].sort((a, b) => (sort === 'name' ? byName(a, b) : sort === 'level' ? a.level - b.level || byName(a, b) : (b.edited ?? '').localeCompare(a.edited ?? '') || byName(a, b)));
}

/** Sorted homebrew in labelled groups; one unlabelled group when not grouping. */
export function groupHomebrew(list: Monster[], sort: HomebrewSort, group: HomebrewGroup): { key: string; label: string; monsters: Monster[] }[] {
  const sorted = sortHomebrew(list, sort);
  if (group === 'none') return sorted.length ? [{ key: 'all', label: '', monsters: sorted }] : [];
  const groups = new Map<string, Monster[]>();
  for (const m of sorted) {
    const key = group === 'origin' ? originOf(m) : m.family.trim() || 'No family';
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const keys = [...groups.keys()].sort(group === 'origin' ? (a, b) => ORIGIN_ORDER.indexOf(a as HomebrewOrigin) - ORIGIN_ORDER.indexOf(b as HomebrewOrigin) : (a, b) => a.localeCompare(b));
  return keys.map((key) => ({ key, label: group === 'origin' ? ORIGIN_LABEL[key as HomebrewOrigin] : key, monsters: groups.get(key)! }));
}

/** A copy beside the original: new id, "(copy)" name, same origin. */
export function duplicateHomebrew(m: Monster, id: string, taken: string[], now = new Date()): Monster {
  const base = `${m.name.replace(/ \(copy(?: \d+)?\)$/, '')} (copy`;
  let name = `${base})`;
  for (let n = 2; taken.includes(name); n++) name = `${base} ${n})`;
  return { ...structuredClone(m), id, name, origin: originOf(m), edited: now.toISOString(), forge: m.forge && { ...structuredClone(m.forge), name } };
}

/** Bookkeeping stays in this browser: files carry the stat block only. */
export function forExport({ origin: _origin, edited: _edited, ...m }: Monster): Monster {
  return m;
}
