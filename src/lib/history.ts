/** Session undo for the whole board. Every change at the table is one labelled
 * step, so the GM can always take it back (and see what was taken back).
 * Snapshots share structure with the immutable state, so a step costs little.
 */
export interface HistoryEntry<T> {
  id: string;
  /** What the step did, worded for "Undid …" / "Redid …". */
  label: string;
  before: T;
  after?: T;
  /** Steps with the same key in quick succession merge (typing in a field). */
  key?: string;
  /** A tag other features can look back for (the round a Next round opened). */
  kind?: string;
  at: number;
}
export interface History<T> {
  present: T;
  past: HistoryEntry<T>[];
  future: HistoryEntry<T>[];
  /** The step that may still absorb a same-key change; closed by undo, redo or navigation. */
  open?: string;
}

export const HISTORY_LIMIT = 100;
export const MERGE_MS = 1500;

export function startHistory<T>(present: T): History<T> {
  return { present, past: [], future: [] };
}

export function record<T>(history: History<T>, next: T, step: { id: string; label: string; key?: string; kind?: string }, now = Date.now()): History<T> {
  if (next === history.present) return history;
  const top = history.past.at(-1);
  if (step.key && top && top.id === history.open && top.key === step.key && now - top.at < MERGE_MS) {
    return { present: next, past: [...history.past.slice(0, -1), { ...top, label: step.label, at: now }], future: [], open: top.id };
  }
  const entry: HistoryEntry<T> = { ...step, before: history.present, at: now };
  return { present: next, past: [...history.past, entry].slice(-HISTORY_LIMIT), future: [], open: entry.id };
}

/** A change that is not a step of its own (switching encounters): keeps both stacks. */
export function navigate<T>(history: History<T>, next: T): History<T> {
  return next === history.present ? history : { ...history, present: next, open: undefined };
}

export function undo<T>(history: History<T>): History<T> {
  const top = history.past.at(-1);
  if (!top) return history;
  return { present: top.before, past: history.past.slice(0, -1), future: [...history.future, { ...top, after: history.present }] };
}

export function redo<T>(history: History<T>): History<T> {
  const top = history.future.at(-1);
  if (!top?.after) return history;
  return { present: top.after, past: [...history.past, { ...top, after: undefined }], future: history.future.slice(0, -1) };
}
