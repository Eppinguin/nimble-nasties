import { Component } from 'preact';
import type { ComponentChildren } from 'preact';
import { STORAGE_KEY, downloadJson } from './lib/board.ts';

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const downloadSaved = (raw: string) => downloadJson(`nimble-nasties-backup-${new Date().toISOString().slice(0, 10)}.json`, raw);

/** A render error shows a way out instead of a blank page, and never throws away
 * what was saved: the board can be downloaded as it is, and "Start fresh" downloads
 * it and sets it aside under a dated key before clearing it. */
export class ErrorBoundary extends Component<{ children: ComponentChildren }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
  }
  startFresh() {
    const raw = readSaved();
    if (raw) {
      downloadSaved(raw);
      try {
        localStorage.setItem(`${STORAGE_KEY}-set-aside-${Date.now()}`, raw);
      } catch {
        /* the download is the copy */
      }
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    location.reload();
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const raw = readSaved();
    return (
      <main class="crash">
        <h1>Something broke</h1>
        <p>Nimble Nasties hit an error it couldn't recover from. Your encounters and homebrew are still saved in this browser.</p>
        <div class="crash-actions">
          <button class="solid" onClick={() => location.reload()}>
            Reload
          </button>
          {raw && (
            <button class="outline" onClick={() => downloadSaved(raw)}>
              Download backup
            </button>
          )}
          {raw && (
            <button class="outline" onClick={() => this.startFresh()} title="Downloads a backup first, then starts with an empty board">
              Start fresh
            </button>
          )}
        </div>
        <p class="crash-hint">If reloading doesn't help, download a backup and start fresh. Import brings the backup back once the problem is fixed.</p>
        <details>
          <summary>Error details</summary>
          <pre>{error.stack ?? error.message}</pre>
        </details>
      </main>
    );
  }
}
