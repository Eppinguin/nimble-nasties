import { useEffect, useRef } from 'preact/hooks';
import { exportJson } from '../lib/board.ts';
import type { NemesesState } from '../lib/board.ts';
import { backupDue, readTime } from '../lib/backup.ts';
import { forExport } from '../lib/homebrew.ts';
import type { ToastStep } from './context.ts';
import { BACKUP_KEY, FIRST_SEEN_KEY, NUDGE_KEY, readStored, writeStored } from './storage.ts';

/** iPhone and iPad Safari, outside an installed Home Screen app: the browser that
 *  clears storage after a week away. (iPadOS reports itself as a Mac with touch.) */
function evictingSafari() {
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const installed = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  return apple && !installed;
}

/** The full backup, and keeping what is only in this browser from being lost:
 *  - every launch asks the browser to keep this site's storage (it decides silently),
 *  - an export is remembered, and after a while without one a toast offers it
 *    (see lib/backup.ts for when). */
export function useBackup(state: NemesesState, notify: (message: string, step?: ToastStep) => void) {
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Every encounter and homebrew monster in one file that Import reads back. */
  function exportBackup() {
    const { encounters, customMonsters } = stateRef.current;
    exportJson(`nimble-nasties-backup-${new Date().toISOString().slice(0, 10)}.json`, { format: 'nimble-nasties-v1', encounters, customMonsters: customMonsters.map(forExport) });
    writeStored(BACKUP_KEY, String(Date.now()));
  }

  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then((kept) => kept || navigator.storage.persist())
      .catch(() => undefined);
    const now = Date.now();
    const firstSeen = readTime(readStored(FIRST_SEEN_KEY));
    if (firstSeen === undefined) writeStored(FIRST_SEEN_KEY, String(now));
    const hasWork = state.customMonsters.length > 0 || state.encounters.some((e) => e.cards.length > 0);
    if (!backupDue({ now, firstSeen, lastBackup: readTime(readStored(BACKUP_KEY)), lastNudge: readTime(readStored(NUDGE_KEY)), hasWork })) return;
    writeStored(NUDGE_KEY, String(now));
    const hint = evictingSafari() ? ' Add Nimble Nasties to your Home Screen to keep them safer.' : '';
    // Let the board settle first, so the reminder isn't lost under a startup toast.
    const timer = window.setTimeout(() => notify(`Your encounters live only in this browser. Time for a backup?${hint}`, { action: { label: 'Export backup', run: exportBackup } }), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return exportBackup;
}
