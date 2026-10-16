import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Monster } from './lib/types.ts';
import { officialCatalog } from './data/official.ts';
import { applyHpEntry, changeHp, createEncounter, encounterMembers, exportJson, extractStatblock, reorderStatblocks, sortByOrder, spawnCard, toggleCardCondition, uid } from './lib/board.ts';
import type { NemesesState, NemesisCard, NemesisEncounter } from './lib/board.ts';
import { arriveAsPack, lanePacks, prunePacks } from './lib/horde.ts';
import { navigate, record, redo, undo } from './lib/history.ts';
import { encounterStats } from './lib/rules.ts';
import { DEFAULT_RULES, RULESETS, rulesFor } from './lib/rulesets.ts';
import type { RulesetId } from './lib/rulesets.ts';
import { plural, summonCount, summonId, summonMonster, withSummons } from './lib/summons.ts';
import type { SummonSpec } from './lib/summons.ts';
import { forExport } from './lib/homebrew.ts';
import { sharedPayload } from './lib/share.ts';
import { hashNexusTarget } from './lib/nexus.ts';
import { AppContext } from './app/context.ts';
import type { AppApi, Drag, Merge, Modal } from './app/context.ts';
import { BANNER_KEY, PANEL_KEY, readStored, writeStored } from './app/storage.ts';
import { clamp, isPhone, scrollBehavior, slug } from './app/ui.ts';
import { useBackup } from './app/useBackup.ts';
import { useDice } from './app/useDice.ts';
import { useFlash } from './app/useFlash.ts';
import { useHomebrew } from './app/useHomebrew.ts';
import { loadHistory, usePersistence } from './app/usePersistence.ts';
import { useTheme } from './app/useTheme.ts';
import { useToast } from './app/useToast.ts';
import { MonsterForge } from './MonsterForge.tsx';
import { Statblock } from './components/Statblock.tsx';
import { Statline } from './components/Statline.tsx';
import { SupportBanner } from './components/SupportBanner.tsx';
import { Toast } from './components/Toast.tsx';
import { Board } from './board/Board.tsx';
import type { BoardLane } from './board/Board.tsx';
import { useBoardUi } from './board/useBoardUi.ts';
import { CombatToolbar } from './board/CombatToolbar.tsx';
import { DiceTray } from './board/DiceTray.tsx';
import { AppHeader } from './header/AppHeader.tsx';
import { EncounterPicker } from './header/EncounterPicker.tsx';
import { LibraryDrawer } from './library/LibraryDrawer.tsx';
import { useLibrary } from './library/useLibrary.ts';
import { Dialog, useDialogFocus } from './dialogs/Dialog.tsx';
import { AboutDialog } from './dialogs/AboutDialog.tsx';
import { ImportDialog, ShareLinkDialog } from './dialogs/LinkDialogs.tsx';
import { NexusEncounterDialog } from './dialogs/NexusEncounterDialog.tsx';
import { DeleteHomebrewDialog, IncomingDialog, PreviewDialog } from './dialogs/MonsterDialogs.tsx';
import { NotesDialog } from './dialogs/NotesDialog.tsx';
import { RulesDialog } from './dialogs/RulesDialog.tsx';

const DEFAULT_GROUP = 'group-1';

/** The app: board state with session undo, and every command that changes it.
 *  Rendering lives in the components; board components reach these commands
 *  through AppContext (see app/context.ts). */
export function App() {
  const [history, setHistory] = useState(() => loadHistory(officialCatalog));
  const state = history.present;
  const { toast, setToast, notify } = useToast();
  const [theme, setTheme] = useTheme();
  const lib = useLibrary();
  const [addPanelOpen, setAddPanelOpen] = useState(() => readStored(PANEL_KEY) === 'open');
  const [mobileLibrary, setMobileLibrary] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragging, setDragging] = useState<Drag | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(() => readStored(BANNER_KEY) !== 'closed');
  const ui = useBoardUi();
  const [freshIds, markArrived] = useFlash(1400);
  const [stampIds, stamp] = useFlash(400);
  const importRef = useRef<HTMLInputElement>(null);
  const librarySearch = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus(modal);

  // Summoned minions are derived from their summoner's text: in the lookup, not the bestiary.
  const library = useMemo(() => withSummons([...officialCatalog, ...state.customMonsters]).sort((a, b) => a.name.localeCompare(b.name)), [state.customMonsters]);
  const bestiary = useMemo(() => library.filter((m) => !m.summon), [library]);
  const lookup = useMemo(() => new Map(library.map((m) => [m.id, m])), [library]);
  const encounter = state.encounters.find((e) => e.id === state.activeId) ?? state.encounters[0];
  const groups = encounter.groups?.length ? encounter.groups : [{ id: DEFAULT_GROUP, name: 'Group 1' }];
  // A summoner's minions are part of its threat, not extra budget.
  const stats = useMemo(() => encounterStats(encounterMembers(encounter.cards.filter((c) => !lookup.get(c.monsterId)?.summon)), library, encounter.heroes, rulesFor(encounter).difficulty), [encounter.cards, encounter.heroes, encounter.rules, library, lookup]);
  const activeIds = sortByOrder([...new Set(encounter.cards.map((c) => c.monsterId))], encounter.order);
  const lanes = activeIds.map((id) => ({ monster: lookup.get(id), cards: encounter.cards.filter((c) => c.monsterId === id) })).filter((g): g is BoardLane => Boolean(g.monster) && g.cards.length > 0);
  const still = encounter.cards.filter((c) => c.lane !== 'defeated');
  const acted = still.filter((c) => c.acted && c.lane === 'active').length;
  const inPlay = still.filter((c) => c.lane === 'active').length;
  const previewMonster = previewId ? lookup.get(previewId) : undefined;
  const dice = useDice(notify);
  const brew = useHomebrew({ state, library, encounter, commit, notify, setToast, modal, setModal, lib, addMonster, libraryOpen: addPanelOpen });
  const exportBackup = useBackup(state, notify);

  usePersistence(history, setHistory, officialCatalog, notify, exportBackup);
  useEffect(() => writeStored(PANEL_KEY, addPanelOpen ? 'open' : 'closed'), [addPanelOpen]);
  // `#monster=…` links open the shared stat block, or fetch a Nimble Nexus monster or collection
  // when the value is a Nexus link; the fragment is cleared so a reload doesn't ask again.
  useEffect(() => {
    const read = () => {
      const payload = sharedPayload(location.hash);
      const nexus = payload ? null : hashNexusTarget(location.hash);
      if (!payload && !nexus) return;
      window.history.replaceState(null, '', location.pathname + location.search);
      if (payload) void brew.openShared(payload);
      else if (nexus) void brew.openNexus(nexus);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (brew.forgeOpen.current) return;
      if (event.key === 'Escape') keys.current.escape(event.target);
      // A dialog owns the keyboard: the board and library behind it stay put.
      if (keys.current.dialogOpen) return;
      // `/` and Ctrl/Cmd+K toggle the library. `/` still types in fields, except an
      // empty library search, where it closes the drawer it just opened.
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable);
      const inEmptySearch = event.target === librarySearch.current && !librarySearch.current?.value;
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && (!typing || inEmptySearch)) {
        event.preventDefault();
        keys.current.toggleLibrary();
      }
      // ⌘Z / Ctrl+Z undo the board; ⇧⌘Z / Ctrl+Y redo. Fields keep their own text undo,
      // except an HP field still showing HP, where a hit was just entered.
      const pristineHp = event.target instanceof HTMLInputElement && event.target.dataset.pristine === 'true';
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && !event.altKey && (key === 'z' || key === 'y') && (!typing || pristineHp)) {
        event.preventDefault();
        if (key === 'y' || event.shiftKey) keys.current.redo();
        else keys.current.undo();
      }
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        keys.current.toggleLibrary();
      }
      // `D` toggles the dice tray, and focuses its expression so a roll can be typed right away.
      if (key === 'd' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat && !typing) {
        event.preventDefault();
        keys.current.toggleDice();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Undo steps ────────────────────────────────────────────────
  function commit(label: string, fn: (s: NemesesState) => NemesesState, merge: Merge = {}) {
    const id = uid();
    setHistory((h) => record(h, fn(h.present), { id, label, ...merge }));
    return id;
  }
  function patchEncounter(label: string, fn: (enc: NemesisEncounter) => NemesisEncounter, merge?: Merge) {
    // GMG v1 stat blocks have fixed HP. Party editing does not rescale them.
    return commit(label, (previous) => ({ ...previous, encounters: previous.encounters.map((e) => (e.id === previous.activeId ? fn(e) : e)) }), merge);
  }
  function editCard(id: string, label: string, fn: (c: NemesisCard) => NemesisCard) {
    return patchEncounter(label, (e) => ({ ...e, cards: e.cards.map((c) => (c.id === id ? fn(c) : c)) }));
  }
  function cardName(card: NemesisCard) {
    const monster = lookup.get(card.monsterId);
    if (!monster || card.name !== monster.name) return card.name;
    return `${monster.name} ${encounter.cards.filter((c) => c.monsterId === card.monsterId).indexOf(card) + 1}`;
  }
  function undoStep() {
    const step = history.past.at(-1);
    if (!step) return notify('Nothing to undo');
    const elsewhere = step.before.activeId !== state.activeId ? step.before.encounters.find((e) => e.id === step.before.activeId)?.name : undefined;
    setHistory(undo);
    // The last step taken back disables the focused Undo: hand focus to its Redo partner.
    if (history.past.length === 1 && document.activeElement?.closest('.history-controls')) window.setTimeout(() => document.querySelector<HTMLButtonElement>('.history-redo')?.focus(), 0);
    notify(`Undone: ${step.label}${elsewhere ? ` · ${elsewhere}` : ''}`, { redo: step.id });
  }
  function redoStep() {
    const step = history.future.at(-1);
    if (!step) return notify('Nothing to redo');
    setHistory(redo);
    if (history.future.length === 1 && document.activeElement?.closest('.history-controls')) window.setTimeout(() => document.querySelector<HTMLButtonElement>('.history-controls button')?.focus(), 0);
    notify(`Redone: ${step.label}`, { undo: step.id });
  }
  /** Esc closes one layer, the topmost: a dialog, the encounter menu, a condition
   * picker, then the dice tray if focus is in it, the library, the dice tray. */
  function closeTopLayer(target: EventTarget | null) {
    clearDrag();
    if (modal) return setModal(null);
    if (pickerOpen) return setPickerOpen(false);
    if (ui.conditionFor) return ui.setConditionFor(null);
    const inDice = target instanceof Element && target.closest('.rolls-panel');
    if (addPanelOpen && !(dice.open && inDice)) return closeLibrary();
    dice.setOpen(false);
  }
  // The keyboard handler is registered once; it calls the latest commands through this ref.
  const keys = useRef({ undo: undoStep, redo: redoStep, toggleLibrary, toggleDice: toggleDiceFromKeyboard, escape: closeTopLayer, dialogOpen: modal !== null });
  keys.current = { undo: undoStep, redo: redoStep, toggleLibrary, toggleDice: toggleDiceFromKeyboard, escape: closeTopLayer, dialogOpen: modal !== null };

  // ── Library and drag ──────────────────────────────────────────
  function openLibrary() {
    setAddPanelOpen(true);
    // On phones the drawer and the docked dice tray would stack on each other.
    if (isPhone()) {
      setMobileLibrary(true);
      dice.setOpen(false);
    }
    window.setTimeout(() => librarySearch.current?.focus(), 30);
  }
  function closeLibrary() {
    setAddPanelOpen(false);
    setMobileLibrary(false);
  }
  function toggleLibrary() {
    if (addPanelOpen) closeLibrary();
    else openLibrary();
  }
  function openPreview(id: string) {
    setPreviewId(id);
    setModal('preview');
  }
  function dragStart(event: DragEvent, kind: Drag['kind'], id: string, name: string, detail: string) {
    const transfer = event.dataTransfer;
    if (!transfer) return;
    transfer.setData('text/plain', `${kind}:${id}`);
    transfer.effectAllowed = kind === 'monster' ? 'copy' : 'move';
    const ghost = document.createElement('div');
    ghost.className = 'drag-preview-ghost';
    const title = document.createElement('strong');
    title.textContent = name;
    const subtitle = document.createElement('span');
    subtitle.textContent = detail;
    ghost.append(title, subtitle);
    // Render off-screen: Chromium cancels the drag if a new element lands under the pointer.
    ghost.style.left = '-1000px';
    ghost.style.top = '-1000px';
    document.body.appendChild(ghost);
    transfer.setDragImage(ghost, 20, 17);
    window.requestAnimationFrame(() => ghost.remove());
    setDragging({ kind, id, name });
    setDropTarget(null);
  }
  function clearDrag() {
    setDragging(null);
    setDropTarget(null);
  }

  // ── Creatures and lanes ───────────────────────────────────────
  function addMonster(monster: Monster, group = DEFAULT_GROUP, quantity = 1, before?: string) {
    const groupId = groups.some((g) => g.id === group) ? group : groups[0].id;
    const step = patchEncounter(`${quantity} × ${monster.name} added`, (e) => {
      const ids = sortByOrder([...new Set([...e.cards.map((c) => c.monsterId), monster.id])], e.order);
      const order = before && before !== monster.id && ids.includes(before) ? reorderStatblocks(ids, monster.id, before) : ids;
      // A split horde's newcomer joins its first pack rather than starting a stray one.
      const packId = lanePacks(e, monster.id).find((pack) => !pack.implicit)?.id;
      return { ...e, order, cards: [...e.cards, ...Array.from({ length: clamp(quantity, 1, 30) }, () => ({ ...spawnCard(monster, e.heroes.length, 'active'), groupId, ...(packId ? { packId } : {}) }))] };
    });
    if (isPhone()) setMobileLibrary(false);
    notify(`${quantity} × ${monster.name} added`, { undo: step });
  }
  function shiftLane(moving: string, delta: -1 | 1) {
    const order = [...activeIds];
    const i = order.indexOf(moving);
    if (i < 0 || i + delta < 0 || i + delta >= order.length) return;
    [order[i], order[i + delta]] = [order[i + delta], order[i]];
    patchEncounter(`Moved ${lookup.get(moving)?.name ?? 'stat block'}`, (e) => ({ ...e, order }), { key: `move:${moving}` });
  }
  function hpEntry(id: string, raw: string): number | null {
    const card = encounter.cards.find((c) => c.id === id);
    const monster = card && lookup.get(card.monsterId);
    if (!card || !monster) return null;
    const result = applyHpEntry(card, monster, raw, rulesFor(encounter));
    if (!result) {
      notify('18 or 18+5 damage · =18 set HP · +5 heal · -5 direct HP · ! crit · v vulnerable · r resistant · ^ bypass');
      return null;
    }
    const who = cardName(card);
    const label = { damage: `${result.change} damage to ${who}`, critical: `${result.change} crit damage to ${who}`, heal: `${who} healed ${result.change}`, direct: `${who} lost ${result.change} HP`, set: `${who} set to ${result.card.hp} HP` }[result.kind];
    editCard(id, label, () => result.card);
    return result.card.hp;
  }
  /** One tap per summon: the minions join their own lane right after the summoner,
   * count resolved against the party (1/hero), with undo like any removal. */
  function summon(summoner: Monster, spec: SummonSpec) {
    const monster = lookup.get(summonId(summoner.id, spec.key)) ?? summonMonster(summoner, spec);
    const newLane = !encounter.cards.some((c) => c.monsterId === monster.id);
    const quantity = summonCount(spec, encounter.heroes.length);
    const groupId = encounter.cards.find((c) => c.monsterId === summoner.id)?.groupId ?? groups[0].id;
    const fresh = Array.from({ length: quantity }, () => ({ ...spawnCard(monster, encounter.heroes.length, 'active'), groupId }));
    const step = patchEncounter(`${quantity} ${plural(monster.name, quantity)} summoned`, (e) => {
      const ids = sortByOrder([...new Set(e.cards.map((c) => c.monsterId))], e.order);
      if (!ids.includes(monster.id)) ids.splice(ids.includes(summoner.id) ? ids.indexOf(summoner.id) + 1 : ids.length, 0, monster.id);
      return { ...arriveAsPack(e, monster.id, fresh, uid()), order: ids };
    });
    ui.expandLane(monster.id);
    markArrived(fresh.map((c) => c.id));
    notify(`${quantity} ${plural(monster.name, quantity)} summoned`, { undo: step });
    // Reveal a lane that just opened off-screen, but never pull the GM away from the
    // summoner: on phones (one snapped sheet at a time) the toast is the confirmation.
    if (newLane && !isPhone())
      window.setTimeout(() => {
        const lane = document.querySelector<HTMLElement>(`.run-board [data-lane-id="${CSS.escape(monster.id)}"]`);
        const board = lane?.closest('.run-board');
        if (!board || !lane) return;
        const box = board.getBoundingClientRect(),
          at = lane.getBoundingClientRect();
        if (at.left < box.left || at.right > box.right) lane.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: scrollBehavior() });
      }, 60);
  }
  function removeCard(id: string) {
    const card = encounter.cards.find((c) => c.id === id);
    if (!card) return;
    const label = `${cardName(card)} removed`;
    notify(label, { undo: patchEncounter(label, (e) => prunePacks({ ...e, cards: e.cards.filter((c) => c.id !== id) })) });
  }
  /** Any damage kills a minion, so a tap is the whole HP entry; a second tap brings it back. */
  function toggleMinion(card: NemesisCard) {
    const who = cardName(card);
    const down = card.lane === 'defeated';
    editCard(card.id, down ? `${who} back up` : `${who} defeated`, (c) => changeHp(c, down ? c.maxHp : -c.hp));
  }
  function removeStatblock(monsterId: string) {
    const { removed } = extractStatblock(encounter.cards, monsterId);
    if (!removed.length) return;
    const label = `${lookup.get(monsterId)?.name ?? 'Stat block'} removed (${removed.length})`;
    notify(label, { undo: patchEncounter(label, (e) => prunePacks({ ...e, cards: extractStatblock(e.cards, monsterId).remaining, order: (e.order ?? []).filter((id) => id !== monsterId) })) });
  }
  function toggleCondition(id: string, name: string) {
    const card = encounter.cards.find((c) => c.id === id);
    const who = card ? cardName(card) : 'creature';
    editCard(id, card?.conditions.includes(name) ? `${name} cleared from ${who}` : `${name} on ${who}`, (c) => toggleCardCondition(c, name));
    ui.setConditionFor(null);
  }

  // ── Rounds and encounters ─────────────────────────────────────
  function nextRound() {
    patchEncounter(`Next round (${encounter.round + 1})`, (e) => ({ ...e, round: e.round + 1, cards: e.cards.map((c) => ({ ...c, acted: false })), packLog: [] }), { kind: `round:${encounter.id}:${encounter.round + 1}` });
  }
  /** Step the counter back without touching HP. Turn marks return to how the
   * round ended when it was advanced this session; otherwise they stay put. */
  function previousRound() {
    if (encounter.round <= 1) return;
    const advanced = [...history.past].reverse().find((step) => step.kind === `round:${encounter.id}:${encounter.round}`);
    const ended = advanced?.before.encounters.find((e) => e.id === encounter.id)?.cards;
    const marks = ended && new Map(ended.map((c) => [c.id, !!c.acted]));
    patchEncounter(`Back to round ${encounter.round - 1}`, (e) => ({ ...e, round: e.round - 1, cards: marks ? e.cards.map((c) => (marks.has(c.id) ? { ...c, acted: marks.get(c.id) } : c)) : e.cards }));
  }
  function resetEncounter() {
    const step = patchEncounter('Combat reset', (e) =>
      prunePacks({
        ...e,
        round: 1,
        packLog: [],
        cards: e.cards
          .filter((c) => !lookup.get(c.monsterId)?.summon)
          .map((c) => {
            const m = lookup.get(c.monsterId);
            if (!m) return c;
            const fresh = spawnCard(m, e.heroes.length, 'active');
            return { ...fresh, id: c.id, name: c.name, groupId: c.groupId, packId: c.packId };
          }),
      }),
    );
    notify('Combat reset', { undo: step });
  }
  function newEncounter() {
    const taken = new Set(state.encounters.map((e) => e.name));
    let number = state.encounters.length + 1;
    while (taken.has(`Encounter ${number}`)) number++;
    const e = createEncounter(`Encounter ${number}`, encounter.heroes);
    commit(`${e.name} created`, (s) => ({ ...s, encounters: [...s.encounters, e], activeId: e.id }));
    openLibrary();
  }
  function switchEncounter(id: string) {
    setHistory((h) => navigate(h, { ...h.present, activeId: id }));
    setModal(null);
  }
  function setRules(id: RulesetId) {
    if (id === encounter.rules) return;
    const { name } = RULESETS[id];
    const step = patchEncounter(`Rules: ${name}`, (e) => ({ ...e, rules: id }));
    notify(`${encounter.name} now uses ${name} rules`, { undo: step });
  }
  function renameEncounter(id: string, name: string) {
    commit(`Renamed to ${name}`, (s) => ({ ...s, encounters: s.encounters.map((e) => (e.id === id ? { ...e, name } : e)) }));
  }
  function duplicateEncounter(id: string) {
    const original = state.encounters.find((e) => e.id === id);
    if (!original) return;
    const copy: NemesisEncounter = { ...original, id: uid(), name: `${original.name} (copy)`, cards: original.cards.map((c) => ({ ...c, id: uid() })), createdAt: new Date().toISOString() };
    commit(`${copy.name} created`, (s) => ({ ...s, encounters: [...s.encounters, copy], activeId: copy.id }));
  }
  function exportEncounter(id: string) {
    const target = state.encounters.find((e) => e.id === id);
    if (!target) return;
    exportJson(`${slug(target.name) || 'encounter'}.json`, { format: 'nimble-nasties-v1', encounters: [target], customMonsters: state.customMonsters.map(forExport) });
  }
  function deleteEncounter(id: string) {
    const target = state.encounters.find((e) => e.id === id);
    if (!target) return;
    if (state.encounters.length === 1) return notify('Keep at least one encounter');
    const step = commit(`${target.name} deleted`, (s) => {
      const rest = s.encounters.filter((e) => e.id !== id);
      return { ...s, encounters: rest, activeId: s.activeId === id ? rest[0].id : s.activeId };
    });
    setPickerOpen(false);
    notify(`${target.name} deleted`, { undo: step });
  }
  // ── Dice ──────────────────────────────────────────────────────
  function toggleDice() {
    if (!dice.open && isPhone()) closeLibrary();
    dice.setOpen((open) => !open);
  }
  function toggleDiceFromKeyboard() {
    const opening = !dice.open;
    toggleDice();
    if (!opening) return;
    window.setTimeout(() => {
      const field = document.querySelector<HTMLInputElement>('.rolls-panel input');
      field?.focus();
      field?.setSelectionRange(field.value.length, field.value.length);
    }, 30);
  }

  function closeBanner() {
    setBannerOpen(false);
    writeStored(BANNER_KEY, 'closed');
  }

  const api: AppApi = {
    state,
    encounter,
    lookup,
    commit,
    patchEncounter,
    editCard,
    notify,
    cardName,
    roll: dice.roll,
    rollAction: dice.rollAction,
    showRoll: dice.showRoll,
    summon,
    addMonster,
    hpEntry,
    toggleCondition,
    removeCard,
    removeStatblock,
    shiftLane,
    toggleMinion,
    freshIds,
    stampIds,
    stamp,
    ui,
    dragging,
    dropTarget,
    setDropTarget,
    dragStart,
    clearDrag,
  };
  const closeModal = () => setModal(null);
  const modalTitles: Record<NonNullable<Modal>, string> = {
    notes: 'Session notes',
    rules: 'Nimble rules',
    about: 'About Nimble Nasties',
    incoming: brew.incoming?.monster.name ?? 'Monster',
    import: 'Import',
    encounter: brew.nexusEncounter?.found.name ?? 'Encounter',
    link: `Share ${brew.linkToCopy?.name ?? 'monster'}`,
    delete: `Delete ${brew.pendingDelete?.monsters.length === 1 ? brew.pendingDelete.monsters[0].name : 'homebrew'}?`,
    preview: previewMonster?.name ?? 'Monster',
  };
  const modalTitle = modal ? modalTitles[modal] : '';

  return (
    <AppContext.Provider value={api}>
      <div class="app-shell">
        {addPanelOpen && (
          <LibraryDrawer
            lib={lib}
            bestiary={bestiary}
            stats={stats}
            mobileOpen={mobileLibrary}
            searchRef={librarySearch}
            onClose={closeLibrary}
            onRules={() => setModal('rules')}
            onExportMany={brew.openExport}
            onShared={(payload) => void brew.openShared(payload)}
            onNexus={(target) => void brew.openNexus(target)}
            tools={{ onPreview: openPreview, onForge: brew.openForge, onImport: brew.openImport, onDuplicate: brew.duplicateBrew, onShare: (m) => void brew.shareMonster(m), onShareMany: (ms) => void brew.shareHomebrew(ms), onExport: brew.exportHomebrew, onDelete: brew.deleteHomebrew }}
          />
        )}
        {mobileLibrary && addPanelOpen && <button class="mobile-scrim add-scrim" aria-label="Close add panel" onClick={closeLibrary} />}
        <div class="workspace">
          <AppHeader
            theme={theme}
            setTheme={setTheme}
            libraryOpen={addPanelOpen}
            difficulty={{ ...stats.difficulty, spent: stats.spent, budget: stats.budget }}
            onAbout={() => {
              setPickerOpen(false);
              setModal('about');
            }}
            onOpenLibrary={() => {
              setPickerOpen(false);
              openLibrary();
            }}
            onToggleLibrary={() => {
              setPickerOpen(false);
              toggleLibrary();
            }}
            picker={
              <EncounterPicker
                encounters={state.encounters}
                current={encounter}
                open={pickerOpen}
                setOpen={setPickerOpen}
                onSwitch={switchEncounter}
                onRename={renameEncounter}
                onDuplicate={duplicateEncounter}
                onExport={exportEncounter}
                onDelete={deleteEncounter}
                onNotes={() => setModal('notes')}
                onReset={resetEncounter}
                onNew={newEncounter}
                onImport={brew.openImport}
                onBackup={exportBackup}
              />
            }
          />
          {bannerOpen && <SupportBanner onClose={closeBanner} />}
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={brew.importFile} />
          <main class="main-pane">
            <CombatToolbar
              round={encounter.round}
              acted={acted}
              inPlay={inPlay}
              hasCreatures={encounter.cards.length > 0}
              receipt={dice.receipt}
              undoLabel={history.past.at(-1)?.label}
              redoLabel={history.future.at(-1)?.label}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onPreviousRound={previousRound}
              onNextRound={nextRound}
              onUndo={undoStep}
              onRedo={redoStep}
              onDice={toggleDice}
            />
            {dice.open && <DiceTray rolls={dice.rolls} expression={dice.quickRoll} setExpression={dice.setQuickRoll} edge={dice.quickEdge} setEdge={dice.setQuickEdge} onRoll={dice.quickRollNow} onClose={() => dice.setOpen(false)} />}
            <Board lanes={lanes} />
          </main>
        </div>
        {modal && (
          <Dialog title={modalTitle} wide={modal === 'preview' || modal === 'incoming' || modal === 'encounter'} dialogRef={dialogRef} onClose={closeModal}>
            {modal === 'notes' && <NotesDialog onDone={closeModal} />}
            {modal === 'preview' && previewMonster && (
              <PreviewDialog
                monster={previewMonster}
                onDelete={() => brew.deleteHomebrew(previewMonster)}
                onEdit={() => brew.openForge(previewMonster, 'edit')}
                onShare={() => void brew.shareMonster(previewMonster)}
                onRemix={() => brew.openForge(previewMonster, 'remix')}
                onAdd={() => {
                  addMonster(previewMonster);
                  closeModal();
                }}
              />
            )}
            {modal === 'incoming' && brew.incoming && <IncomingDialog monster={brew.incoming.monster} keepBoth={brew.incoming.keepBoth} setKeepBoth={(keepBoth) => brew.setIncoming({ ...brew.incoming!, keepBoth })} mine={brew.incomingMine} same={brew.incomingSame} onSave={brew.saveIncoming} />}
            {modal === 'import' && (
              <ImportDialog
                link={brew.importLink}
                setLink={brew.setImportLink}
                onSubmit={() => void brew.importFromLink()}
                onChooseFile={() => {
                  closeModal();
                  importRef.current?.click();
                }}
              />
            )}
            {modal === 'encounter' && brew.nexusEncounter && <NexusEncounterDialog found={brew.nexusEncounter.found} resolved={brew.nexusEncounter.resolved} yours={encounter.heroes} mine={state.customMonsters} judge={RULESETS[DEFAULT_RULES].difficulty} onCreate={brew.createNexusEncounter} />}
            {modal === 'link' && brew.linkToCopy && <ShareLinkDialog name={brew.linkToCopy.name} url={brew.linkToCopy.url} onDone={closeModal} />}
            {modal === 'delete' && brew.pendingDelete && (
              <DeleteHomebrewDialog
                monsters={brew.pendingDelete.monsters}
                encounters={state.encounters}
                onDelete={() => brew.deleteHomebrew(...brew.pendingDelete!.monsters)}
                onKeep={() => {
                  setModal(brew.pendingDelete!.back);
                  brew.setPendingDelete(null);
                }}
              />
            )}
            {modal === 'rules' && <RulesDialog stats={stats} onRules={setRules} onDone={closeModal} />}
            {modal === 'about' && <AboutDialog onDone={closeModal} />}
          </Dialog>
        )}
        {brew.forge && (
          <MonsterForge
            initial={brew.forge.draft}
            editing={brew.forge.editing}
            heroes={encounter.heroes.length}
            budget={stats.budget}
            families={[...new Set(bestiary.map((m) => m.family))].sort()}
            sheet={(m) => (
              <div class="monster-lane forge-lane">
                <header class="lane-header">
                  <div class="lane-title">
                    <h2>{m.name}</h2>
                  </div>
                  <Statline monster={m} />
                </header>
                <Statblock monster={m} scope="preview-forge" />
              </div>
            )}
            onSave={brew.saveForged}
            onClose={brew.closeForge}
          />
        )}
        {toast && (
          <Toast
            toast={toast}
            canUndo={!!toast.undo && history.past.at(-1)?.id === toast.undo}
            canRedo={!!toast.redo && history.future.at(-1)?.id === toast.redo}
            onUndo={undoStep}
            onRedo={redoStep}
            onAction={() => {
              toast.action?.run();
              setToast(null);
            }}
          />
        )}
      </div>
    </AppContext.Provider>
  );
}
