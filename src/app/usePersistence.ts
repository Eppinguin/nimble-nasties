import { useEffect, useRef } from 'preact/hooks';
import { STORAGE_KEY, loadBoard, saveBoard } from '../lib/board.ts';
import type { NemesesState } from '../lib/board.ts';
import { startHistory } from '../lib/history.ts';
import type { History } from '../lib/history.ts';
import { SESSION_KEY, packHistory, unpackHistory } from '../lib/sessionHistory.ts';
import type { Monster } from '../lib/types.ts';
import type { ToastStep } from './context.ts';
import { readStored } from './storage.ts';

/** The board as stored, with this tab's undo history if a reload interrupted it
 *  (see lib/sessionHistory.ts). */
export function loadHistory(catalog: Monster[]): History<NemesesState> {
  let session: string | null = null;
  try {
    session = sessionStorage.getItem(SESSION_KEY);
  } catch {
    /* storage disabled */
  }
  return unpackHistory(session, readStored(STORAGE_KEY)) ?? startHistory(loadBoard(catalog));
}

/** Autosave and cross-tab sync for the board.
 *  - Only a board that differs from the one last written or read is saved. A board
 *    just loaded is not written back: loading tidies it, and the rewrite would reach
 *    other tabs as a change, costing them their undo history.
 *  - A refused write (storage full or blocked) is reported once per failure streak,
 *    with `backup` offered as a way to keep the work.
 *  - When another tab saves, its board is taken over so neither tab overwrites the
 *    other. Undo can't span tabs, so history starts fresh; this tab stays on the
 *    encounter it was showing. A change here that wasn't saved yet wins instead.
 *  - Leaving or hiding the page saves the board at once and keeps this tab's undo
 *    history for a reload. */
export function usePersistence(history: History<NemesesState>, setHistory: (history: History<NemesesState>) => void, catalog: Monster[], notify: (message: string, step?: ToastStep) => void, backup: () => void) {
  const state = history.present;
  const saveFailed = useRef(false);
  const written = useRef(state);
  const shown = useRef(state.activeId);
  shown.current = state.activeId;
  const latest = useRef(history);
  latest.current = history;
  function save(next: NemesesState) {
    if (next === written.current) return;
    written.current = next;
    const saved = saveBoard(next);
    if (!saved && !saveFailed.current) notify("Changes aren't being saved: this browser's storage is full or blocked. Export a backup to keep them.", { action: { label: 'Export backup', run: backup } });
    saveFailed.current = !saved;
  }
  useEffect(() => save(state), [state]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null || event.storageArea !== localStorage) return;
      // This tab changed the board after paint but before its autosave ran. Its change is
      // the newest at the table: save it now, and the other tab takes it over in turn,
      // rather than both tabs quietly ending up on different boards.
      if (latest.current.present !== written.current) {
        save(latest.current.present);
        return;
      }
      const next = loadBoard(catalog);
      written.current = { ...next, activeId: next.encounters.some((e) => e.id === shown.current) ? shown.current : next.activeId };
      setHistory(startHistory(written.current));
      notify('Updated with changes from another tab');
    };
    // Effects run after paint, so a reload right after a change can beat the autosave.
    const keep = () => {
      save(latest.current.present);
      try {
        sessionStorage.setItem(SESSION_KEY, packHistory(latest.current));
      } catch {
        // Too big or blocked: a reload starts history fresh, as it would anyway.
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          /* storage disabled */
        }
      }
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') keep();
    };
    window.addEventListener('storage', sync);
    window.addEventListener('pagehide', keep);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('pagehide', keep);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
}
