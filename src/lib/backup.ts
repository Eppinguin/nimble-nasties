/** Everything lives in this browser's storage, which Safari clears after seven days
 *  of browsing without a visit (installed web apps are spared). A backup file is the
 *  only copy that survives that, so the app asks for one now and then:
 *  - only once there is work to lose (homebrew, or creatures in an encounter),
 *  - when the last backup (or, before any, the first visit) is BACKUP_EVERY old,
 *  - and never more often than every NUDGE_EVERY. */
export const BACKUP_EVERY = 14 * 24 * 60 * 60 * 1000;
export const NUDGE_EVERY = 7 * 24 * 60 * 60 * 1000;

export type BackupMarks = { now: number; lastBackup?: number; firstSeen?: number; lastNudge?: number; hasWork: boolean };

export function backupDue({ now, lastBackup, firstSeen, lastNudge, hasWork }: BackupMarks): boolean {
  if (!hasWork) return false;
  const since = lastBackup ?? firstSeen;
  if (since === undefined || now - since < BACKUP_EVERY) return false;
  return lastNudge === undefined || now - lastNudge >= NUDGE_EVERY;
}

/** A stored timestamp, or undefined when missing or damaged. */
export function readTime(value: string | null): number | undefined {
  const n = Number(value);
  return value && Number.isFinite(n) && n > 0 ? n : undefined;
}
