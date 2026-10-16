import { useEffect, useRef, useState } from 'preact/hooks';
import type { Monster } from '../lib/types.ts';
import type { NemesesState, NemesisEncounter } from '../lib/board.ts';
import { exportJson, uid } from '../lib/board.ts';
import { duplicateHomebrew, forExport, stamped } from '../lib/homebrew.ts';
import { partyLevel } from '../lib/party.ts';
import { plural } from '../lib/summons.ts';
import { blankDraft, monsterToDraft, LEVEL_ROWS } from '../lib/forge.ts';
import type { ForgeDraft } from '../lib/forge.ts';
import { MONSTER_FORMAT, decodeMonster, mergeMonsters, sameMonster, shareUrl, sharedPayload } from '../lib/share.ts';
import { fetchNexus, nexusTarget } from '../lib/nexus.ts';
import type { NexusTarget } from '../lib/nexus.ts';
import { readImport } from '../lib/importing.ts';
import type { ImportLinkState } from '../dialogs/LinkDialogs.tsx';
import type { Library } from '../library/useLibrary.ts';
import type { Modal, ToastStep } from './context.ts';
import type { Toast } from './useToast.ts';
import { slug } from './ui.ts';

type Deps = {
  state: NemesesState;
  library: Monster[];
  encounter: NemesisEncounter;
  commit: (label: string, fn: (s: NemesesState) => NemesesState) => string;
  notify: (message: string, step?: ToastStep) => void;
  setToast: (update: (toast: Toast | null) => Toast | null) => void;
  modal: Modal;
  setModal: (update: Modal | ((modal: Modal) => Modal)) => void;
  lib: Library;
  addMonster: (monster: Monster) => void;
  libraryOpen: boolean;
};

/** Homebrew in and out: files, shared links and Nimble Nexus imports, sharing and
 *  exporting, the Monster Forge, duplicates and deletes. Each change is one undo step
 *  through `commit`; the dialogs these open are App's `modal`. */
export function useHomebrew({ state, library, encounter, commit, notify, setToast, modal, setModal, lib, addMonster, libraryOpen }: Deps) {
  const [forge, setForge] = useState<{ draft: ForgeDraft; editing?: Monster } | null>(null);
  const forgeOpen = useRef(false);
  forgeOpen.current = forge !== null;
  // A monster from a shared link or file, shown before anything is saved.
  const [incoming, setIncoming] = useState<{ monster: Monster; keepBoth: boolean } | null>(null);
  const [importLink, setImportLink] = useState<ImportLinkState>({ text: '' });
  // A share link the clipboard refused, shown to copy by hand.
  const [linkToCopy, setLinkToCopy] = useState<{ name: string; url: string } | null>(null);
  // Homebrew waiting on "delete and remove creatures", and the dialog to return to on Keep.
  const [pendingDelete, setPendingDelete] = useState<{ monsters: Monster[]; back: Modal } | null>(null);
  // A link arriving mid-forge waits for the forge to close instead of discarding the draft.
  const waitingIncoming = useRef<Monster | null>(null);
  // The Import dialog's Nexus request; closing the dialog cancels it.
  const nexusRequest = useRef<AbortController | null>(null);
  const incomingMine = incoming ? state.customMonsters.find((m) => m.id === incoming.monster.id) : undefined;
  const incomingSame = Boolean(incoming && incomingMine && sameMonster(incomingMine, incoming.monster));

  useEffect(() => {
    if (modal === 'import') return;
    nexusRequest.current?.abort();
    nexusRequest.current = null;
  }, [modal]);

  function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void file
      .text()
      .then((contents) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(contents);
        } catch {
          throw Error(`${file.name} isn't a Nimble Nasties file. Choose a .json export.`);
        }
        const found = readImport(parsed, library);
        if (found.kind === 'monsters') return importMonsters(found.monsters);
        const { encounters: imported, homebrew, newer } = found;
        if (!imported.length) throw Error(newer ? 'This file uses newer Nimble rules than this version of Nimble Nasties knows. Reload the page to update, then import again.' : 'No valid Nimble encounter found');
        // Homebrew the file brings along joins the library, but never replaces yours: the
        // file may be an old backup, and undo doesn't outlive the session.
        const { kept } = mergeMonsters(state.customMonsters, homebrew, { keepMine: true });
        const label = `${imported.length} ${imported.length === 1 ? 'encounter' : 'encounters'} imported${kept ? ` · kept your version of ${kept} homebrew ${plural('monster', kept)}` : ''}${newer ? ` · ${newer} skipped: newer Nimble rules, reload to update` : ''}`;
        const step = commit(label, (s) => ({ ...s, encounters: [...s.encounters, ...imported], activeId: imported[0].id, customMonsters: mergeMonsters(s.customMonsters, homebrew, { keepMine: true }).next }));
        notify(label, { undo: step });
      })
      .catch((err) => notify(err instanceof Error ? err.message : 'Import failed'))
      .finally(() => {
        input.value = '';
      });
  }
  /** One monster opens as a preview to save from; several join the library with one Undo. */
  function importMonsters(found: Monster[]) {
    if (!found.length) throw Error('No Nimble stat block found in this file');
    const monsters = found.map((m) => stamped(m, m.sourceUrl?.includes('nexus') ? 'nexus' : 'file'));
    if (monsters.length === 1) return showIncoming(monsters[0]);
    const merged = mergeMonsters(state.customMonsters, monsters);
    if (!merged.added && !merged.updated) return notify(`All ${monsters.length} monsters are already in your library`);
    const label = [merged.added && `${merged.added} homebrew ${plural('monster', merged.added)} imported`, merged.updated && `${merged.updated} updated`].filter(Boolean).join(' · ');
    const step = commit(label, (s) => ({ ...s, customMonsters: mergeMonsters(s.customMonsters, monsters).next }));
    lib.showShelf(
      monsters
        .filter((m) => {
          const old = state.customMonsters.find((o) => o.id === m.id);
          return !old || !sameMonster(old, m);
        })
        .map((m) => m.id),
    );
    notify(label, { undo: step });
  }
  function showIncoming(monster: Monster) {
    if (forgeOpen.current) {
      waitingIncoming.current = monster;
      return notify(`${monster.name} opens when you close the Monster Forge`);
    }
    setIncoming({ monster, keepBoth: false });
    setModal('incoming');
  }
  function closeForge() {
    setForge(null);
    forgeOpen.current = false;
    const monster = waitingIncoming.current;
    waitingIncoming.current = null;
    if (monster) showIncoming(monster);
  }
  async function openShared(payload: string) {
    const monster = await decodeMonster(payload);
    if (monster) showIncoming(monster);
    else notify('This monster link is cut short or damaged. Ask for a fresh one.');
  }
  /** A Nimble Nexus monster opens like a shared link; a collection joins the library.
   *  Resolves to the failure message, so the caller decides where to show it; a
   *  cancelled request resolves to null and imports nothing. */
  async function loadNexus(target: NexusTarget, signal?: AbortSignal): Promise<string | null> {
    try {
      const monsters = await fetchNexus(target, signal);
      setToast((t) => (t?.message.startsWith('Fetching') ? null : t));
      setModal((m) => (m === 'import' ? null : m));
      importMonsters(monsters);
      return null;
    } catch (err) {
      if (signal?.aborted) return null;
      return err instanceof TypeError ? "Couldn't reach Nimble Nexus. Check your connection and try again." : err instanceof Error ? err.message : 'Import from Nimble Nexus failed.';
    }
  }
  async function openNexus(target: NexusTarget) {
    notify(`Fetching the ${target.kind === 'collections' ? 'collection' : 'monster'} from Nimble Nexus…`);
    const error = await loadNexus(target);
    if (error) notify(error);
  }
  /** Save a shared monster: as new, over your own version, or beside it. */
  function saveIncoming(add: boolean) {
    if (!incoming) return;
    const { monster: shared, keepBoth } = incoming;
    if (incomingSame && incomingMine) {
      setModal(null);
      if (add) addMonster(incomingMine);
      return;
    }
    const copy = incomingMine && keepBoth ? { ...shared, id: `homebrew-${uid()}`, name: `${shared.name} (shared)`, forge: shared.forge && { ...shared.forge, name: `${shared.name} (shared)` } } : shared;
    const monster = stamped(copy, 'link');
    const replacing = Boolean(incomingMine && !keepBoth);
    const label = `${monster.name} ${replacing ? 'updated from the shared link' : 'added to the library'}`;
    const step = commit(label, (s) => ({ ...s, customMonsters: replacing ? s.customMonsters.map((m) => (m.id === monster.id ? monster : m)) : [...s.customMonsters, monster] }));
    setModal(null);
    if (add) addMonster(monster);
    else {
      notify(label, { undo: step });
      if (libraryOpen) lib.showShelf([monster.id]);
    }
  }
  /** Touch devices get the share sheet; everywhere else the link goes to the clipboard. */
  async function shareMonster(monster: Monster) {
    const url = await shareUrl(monster, location.href);
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: monster.name, text: `${monster.name}, a Nimble homebrew monster`, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notify(`Link to ${monster.name} copied. Anyone who opens it can save it.`);
    } catch {
      setLinkToCopy({ name: monster.name, url });
      setModal('link');
    }
  }
  /** Several at once: the share sheet takes them as one file; elsewhere each gets its own link, one per line. */
  async function shareHomebrew(monsters: Monster[]) {
    const file = new File([JSON.stringify({ format: MONSTER_FORMAT, monsters: monsters.map(forExport) }, null, 2)], 'nimble-nasties-homebrew.json', { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ files: [file], title: `${monsters.length} Nimble homebrew monsters` });
        lib.setBrewPicked(null);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    const links = await Promise.all(monsters.map(async (m) => `${m.name}: ${await shareUrl(m, location.href)}`));
    try {
      await navigator.clipboard.writeText(links.join('\n'));
      notify(`${monsters.length} links copied, one per monster`);
      lib.setBrewPicked(null);
    } catch {
      notify("Couldn't reach the clipboard. Export a file instead.");
    }
  }
  function openImport() {
    setImportLink({ text: '' });
    setModal('import');
  }
  async function importFromLink() {
    const { text } = importLink;
    const payload = sharedPayload(text);
    const nexus = nexusTarget(text);
    if (!payload && !nexus) return setImportLink({ text, error: text.trim() ? "That isn't a monster link Nimble Nasties can read. Paste a shared monster link or a Nimble Nexus monster or collection page." : 'Paste a link first.' });
    if (payload) {
      setModal(null);
      return void openShared(payload);
    }
    if (!nexus || importLink.busy) return;
    setImportLink({ text, busy: true });
    const request = new AbortController();
    nexusRequest.current = request;
    const error = await loadNexus(nexus, request.signal);
    if (nexusRequest.current === request) nexusRequest.current = null;
    if (error) setImportLink({ text, error });
  }
  /** Export is the shelf's select mode: every homebrew starts ticked, untick what stays home. */
  function openExport() {
    lib.setTab('homebrew');
    lib.setBrewPicked(new Set(state.customMonsters.map((m) => m.id)));
  }
  function exportHomebrew(ids: ReadonlySet<string>) {
    const monsters = state.customMonsters.filter((m) => ids.has(m.id)).map(forExport);
    if (!monsters.length) return;
    exportJson(monsters.length === 1 ? `${slug(monsters[0].name) || 'monster'}.json` : 'nimble-nasties-homebrew.json', { format: MONSTER_FORMAT, monsters });
    lib.setBrewPicked(null);
    notify(`${monsters.length} homebrew ${plural('monster', monsters.length)} exported`);
  }
  /** A copy lands right under its original, ready to tweak in the forge. */
  function duplicateBrew(monster: Monster) {
    const copy = duplicateHomebrew(
      monster,
      `homebrew-${uid()}`,
      state.customMonsters.map((m) => m.name),
    );
    const step = commit(`${copy.name} added`, (s) => {
      const at = s.customMonsters.findIndex((m) => m.id === monster.id);
      return { ...s, customMonsters: [...s.customMonsters.slice(0, at + 1), copy, ...s.customMonsters.slice(at + 1)] };
    });
    lib.setBrewMenu(null);
    lib.markFresh([copy.id]);
    notify(`${copy.name} added`, { undo: step });
  }
  /** The forge opens blank, on a homebrew to edit, or on any stat block as a remix. */
  function openForge(from?: Monster, mode: 'edit' | 'remix' = 'remix') {
    const near = LEVEL_ROWS.findIndex((row) => row.level >= partyLevel(encounter.heroes));
    setModal(null);
    setForge(from ? { draft: monsterToDraft(from, mode === 'remix'), editing: mode === 'edit' ? from : undefined } : { draft: blankDraft(near < 0 ? 4 : near) });
  }
  function saveForged(forged: Monster, add: boolean) {
    const old = state.customMonsters.find((m) => m.id === forged.id);
    const editing = Boolean(old);
    // Editing someone's imported monster keeps their credit.
    const monster = stamped({ ...forged, ...(old?.author && { sourceUrl: old.sourceUrl, author: old.author }), origin: old?.origin }, 'forge');
    const label = `${monster.name} ${editing ? 'updated' : 'added to the library'}`;
    const step = commit(label, (s) => ({ ...s, customMonsters: editing ? s.customMonsters.map((m) => (m.id === monster.id ? monster : m)) : [...s.customMonsters, monster] }));
    closeForge();
    if (add) addMonster(monster);
    else {
      notify(label, { undo: step });
      if (libraryOpen) lib.showShelf([monster.id]);
    }
  }
  /** Deleting takes the creatures it fielded with it. Undo only lasts the session, so
   *  a monster still fielded in an encounter asks first; an unused one goes in one tap. */
  function deleteHomebrew(...monsters: Monster[]) {
    const ids = new Set(monsters.map((m) => m.id));
    const uses = state.encounters.reduce((n, e) => n + e.cards.filter((c) => ids.has(c.monsterId)).length, 0);
    if (uses && modal !== 'delete') {
      setPendingDelete({ monsters, back: modal });
      setModal('delete');
      return;
    }
    const what = monsters.length === 1 ? monsters[0].name : `${monsters.length} homebrew monsters`;
    const label = `${what} deleted${uses ? ` with ${uses} ${uses === 1 ? 'creature' : 'creatures'}` : ''}`;
    const step = commit(label, (s) => ({ ...s, customMonsters: s.customMonsters.filter((m) => !ids.has(m.id)), encounters: s.encounters.map((e) => ({ ...e, cards: e.cards.filter((c) => !ids.has(c.monsterId)), order: e.order?.filter((id) => !ids.has(id)) })) }));
    setModal(null);
    setPendingDelete(null);
    lib.setBrewMenu(null);
    lib.setBrewPicked(null);
    notify(label, { undo: step });
  }

  return {
    forge,
    forgeOpen,
    openForge,
    closeForge,
    saveForged,
    incoming,
    setIncoming,
    incomingMine,
    incomingSame,
    saveIncoming,
    importLink,
    setImportLink,
    openImport,
    importFromLink,
    importFile,
    openShared,
    openNexus,
    linkToCopy,
    shareMonster,
    shareHomebrew,
    openExport,
    exportHomebrew,
    duplicateBrew,
    pendingDelete,
    setPendingDelete,
    deleteHomebrew,
  };
}
