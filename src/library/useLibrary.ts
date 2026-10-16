import { useEffect, useState } from 'preact/hooks';
import type { BrowseView, QuickFilter } from '../lib/browse.ts';
import type { HomebrewGroup, HomebrewSort } from '../lib/homebrew.ts';
import { LIBRARY_KEY, readStored, writeStored } from '../app/storage.ts';
import { useFlash } from '../app/useFlash.ts';

export type LibraryTab = 'bestiary' | 'homebrew';
export type LibraryView = { tab: LibraryTab; view: BrowseView; sort: HomebrewSort; group: HomebrewGroup };

function storedView(): LibraryView {
  try {
    const v = JSON.parse(readStored(LIBRARY_KEY) ?? '{}');
    return { tab: v.tab === 'homebrew' ? 'homebrew' : 'bestiary', view: ['level', 'family'].includes(v.view) ? v.view : 'name', sort: ['name', 'level'].includes(v.sort) ? v.sort : 'recent', group: ['family', 'origin'].includes(v.group) ? v.group : 'none' };
  } catch {
    return { tab: 'bestiary', view: 'name', sort: 'recent', group: 'none' };
  }
}

/** The library drawer's browsing state. Imports and exports elsewhere in the app steer
 *  it too (land on the homebrew shelf, start a selection), so it lives above the drawer.
 *  Tab, bestiary view, homebrew sort and grouping are remembered in this browser. */
export function useLibrary() {
  const [view, setView] = useState<LibraryView>(storedView);
  useEffect(() => writeStored(LIBRARY_KEY, JSON.stringify(view)), [view]);
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState<QuickFilter>('all');
  // Homebrew shelf: the row with its ⋯ strip open, the ticked set while selecting, rows that just arrived.
  const [brewMenu, setBrewMenu] = useState<string | null>(null);
  const [brewPicked, setBrewPicked] = useState<ReadonlySet<string> | null>(null);
  const [freshBrew, markFresh] = useFlash(1400);
  // Party setup, expanded and with individual levels shown; stays as left while the drawer is closed.
  const [party, setParty] = useState({ open: false, detailed: false });
  const setTab = (tab: LibraryTab) => {
    setView((v) => ({ ...v, tab }));
    setBrewMenu(null);
    setBrewPicked(null);
  };
  /** Land on the homebrew shelf with these rows washed in. */
  function showShelf(ids: string[]) {
    setView((v) => ({ ...v, tab: 'homebrew' }));
    setQuery('');
    setBrewMenu(null);
    markFresh(ids);
  }
  return { party, setParty, view, setView, setTab, query, setQuery, quick, setQuick, brewMenu, setBrewMenu, brewPicked, setBrewPicked, freshBrew, markFresh, showShelf };
}
export type Library = ReturnType<typeof useLibrary>;
