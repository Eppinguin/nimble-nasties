/** Small per-browser preferences. Storage can be blocked or full; reads fall back, writes are best effort. */
export const LIBRARY_KEY = 'nimble-nasties-library';
export const THEME_KEY = 'nimble-nasties-theme';
export const BANNER_KEY = 'nimble-nasties-support-banner';
export const PANEL_KEY = 'nimble-nasties-add-panel';
/** Backup reminder timestamps (ms); see lib/backup.ts. */
export const BACKUP_KEY = 'nimble-nasties-last-backup';
export const FIRST_SEEN_KEY = 'nimble-nasties-first-seen';
export const NUDGE_KEY = 'nimble-nasties-backup-nudge';

export const readStored = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
export const writeStored = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage disabled */
  }
};
