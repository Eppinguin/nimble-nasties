import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Monster, RollResult } from '../lib/types.ts';
import type { NemesesState, NemesisCard, NemesisEncounter } from '../lib/board.ts';
import type { SummonSpec } from '../lib/summons.ts';
import type { BoardUi } from '../board/useBoardUi.ts';

export type Merge = { key?: string; kind?: string };
export type ToastAction = { label: string; run: () => void };
export type ToastStep = { undo?: string; redo?: string; action?: ToastAction };
export type RollReceipt = { label: string; summary: string; status: string };
export type Drag = { kind: 'monster' | 'lane'; id: string; name: string };
/** The one dialog App shows at a time. */
export type Modal = 'notes' | 'rules' | 'preview' | 'incoming' | 'import' | 'link' | 'delete' | 'about' | null;

/** What the board's components share with the app: the current encounter, the
 *  labelled undo steps that change it, the dice, and the few bits of UI state that
 *  several lanes read at once. Built by App on every render. */
export interface AppApi {
  state: NemesesState;
  encounter: NemesisEncounter;
  lookup: Map<string, Monster>;
  /** Every change to the board is one labelled undo step; each returns the step's id for a toast's Undo. */
  commit(label: string, fn: (s: NemesesState) => NemesesState, merge?: Merge): string;
  patchEncounter(label: string, fn: (e: NemesisEncounter) => NemesisEncounter, merge?: Merge): string;
  editCard(id: string, label: string, fn: (c: NemesisCard) => NemesisCard): string;
  notify(message: string, step?: ToastStep): void;
  /** The name a row shows: unnamed copies read "Goblin 2". */
  cardName(card: NemesisCard): string;

  roll(expression: string, label: string, monster?: Monster, repeat?: number, edge?: number): void;
  rollAction(monster: Monster, action: Monster['actions'][number], edge?: number): void;
  showRoll(results: RollResult[], receipt: RollReceipt): void;
  summon(summoner: Monster, spec: SummonSpec): void;

  addMonster(monster: Monster, group?: string, quantity?: number, before?: string): void;
  hpEntry(id: string, raw: string): number | null;
  toggleCondition(id: string, name: string): void;
  removeCard(id: string): void;
  removeStatblock(monsterId: string): void;
  shiftLane(monsterId: string, delta: -1 | 1): void;
  toggleMinion(card: NemesisCard): void;

  /** Creatures that just arrived (summons) and tokens a roll just marked acted, for their animations. */
  freshIds: ReadonlySet<string>;
  stampIds: ReadonlySet<string>;
  stamp(ids: string[]): void;
  /** The board's view state: lane toggles, move mode, open menus, pending roll settings. */
  ui: BoardUi;
  dragging: Drag | null;
  dropTarget: string | null;
  setDropTarget(target: string | null): void;
  dragStart(event: DragEvent, kind: Drag['kind'], id: string, name: string, detail: string): void;
  clearDrag(): void;
}

export const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const api = useContext(AppContext);
  if (!api) throw Error('useApp must be used inside <AppContext.Provider>');
  return api;
}
