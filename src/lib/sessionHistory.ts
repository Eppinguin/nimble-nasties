import { serializeBoard } from './board.ts';
import type { NemesesState, NemesisEncounter } from './board.ts';
import type { History, HistoryEntry } from './history.ts';
import type { Monster } from './types.ts';

/** Undo that survives a reload. The history is written to this tab's sessionStorage
 *  when the page is hidden, and read back on load only if its board is exactly the
 *  board stored now (another tab may have saved since). Snapshots share encounter
 *  objects with each other, so each object is written once and referred to by index.
 *  Like the stored board, this round's minion rolls are left out. */
export const SESSION_KEY = 'nimble-nasties-history';

type PackedState = { a: string; e: number[]; m: number; h?: unknown[] };
type PackedEntry = Omit<HistoryEntry<NemesesState>, 'before' | 'after'> & { before: number; after?: number };
type Packed = { v: 1; encounters: unknown[]; monsters: unknown[]; states: PackedState[]; present: number; past: PackedEntry[]; future: PackedEntry[] };

function pool<T extends object>() {
  const items: T[] = [];
  const index = new Map<T, number>();
  return {
    items,
    add(item: T) {
      let i = index.get(item);
      if (i === undefined) {
        i = items.push(item) - 1;
        index.set(item, i);
      }
      return i;
    },
  };
}

export function packHistory(history: History<NemesesState>): string {
  const encounters = pool<NemesisEncounter>();
  const monsters = pool<Monster[]>();
  const states = pool<NemesesState>();
  const packed: PackedState[] = [];
  const state = (s: NemesesState) => {
    const i = states.add(s);
    if (i === packed.length) packed.push({ a: s.activeId, e: s.encounters.map((e) => encounters.add(e)), m: monsters.add(s.customMonsters), ...(s.held ? { h: s.held } : {}) });
    return i;
  };
  const entry = ({ before, after, ...rest }: HistoryEntry<NemesesState>): PackedEntry => ({ ...rest, before: state(before), ...(after ? { after: state(after) } : {}) });
  const present = state(history.present);
  const past = history.past.map(entry);
  const future = history.future.map(entry);
  const result: Packed = { v: 1, encounters: encounters.items, monsters: monsters.items, states: packed, present, past, future };
  return JSON.stringify(result, (key, value) => (key === 'packLog' ? undefined : value));
}

/** The history packed in `raw`, or null when it is damaged or its board is not `stored`. */
export function unpackHistory(raw: string | null, stored: string | null): History<NemesesState> | null {
  if (!raw || !stored) return null;
  try {
    const p = JSON.parse(raw) as Packed;
    if (p?.v !== 1 || !Array.isArray(p.states) || !Array.isArray(p.past) || !Array.isArray(p.future)) return null;
    const states = p.states.map((s): NemesesState => {
      const encounters = s.e.map((i) => p.encounters[i] as NemesisEncounter);
      const customMonsters = p.monsters[s.m] as Monster[];
      if (encounters.some((e) => !e) || !Array.isArray(customMonsters)) throw Error('damaged');
      return { encounters, activeId: s.a, customMonsters, ...(s.h ? { held: s.h } : {}) };
    });
    const state = (i: number) => {
      if (!states[i]) throw Error('damaged');
      return states[i];
    };
    const entry = ({ before, after, ...rest }: PackedEntry): HistoryEntry<NemesesState> => ({ ...rest, before: state(before), ...(after === undefined ? {} : { after: state(after) }) });
    const present = state(p.present);
    if (serializeBoard(present) !== stored) return null;
    return { present, past: p.past.map(entry), future: p.future.map(entry) };
  } catch {
    return null;
  }
}
