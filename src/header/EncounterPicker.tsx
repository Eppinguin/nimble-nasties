import { useEffect, useRef, useState } from 'preact/hooks';
import { Check, ChevronDown, Copy, FileDown, FileUp, HardDriveDownload, MoreHorizontal, Pencil, Plus, RotateCcw, Search, StickyNote, Trash2, X } from 'lucide-preact';
import type { NemesisEncounter } from '../lib/board.ts';
import { otherPrinting } from '../lib/rulesets.ts';

/** The encounter switcher in the header: a non-modal picker to switch, search and
 *  manage encounters (rename, duplicate, export, notes, reset, delete). Closing it
 *  (Escape, a click outside, a choice) drops its search, rename and row menu. */
export function EncounterPicker({
  encounters,
  current,
  open,
  setOpen,
  onSwitch,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
  onNotes,
  onReset,
  onNew,
  onImport,
  onBackup,
}: {
  encounters: NemesisEncounter[];
  current: NemesisEncounter;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
  onNotes: () => void;
  onReset: () => void;
  onNew: () => void;
  onImport: () => void;
  /** Every encounter and homebrew monster in one file. */
  onBackup: () => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setSearch('');
    setRenaming(null);
    setMenuId(null);
  }, [open]);
  // Dismiss the non-modal picker with a click outside it, leaving combat usable.
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function startRename(item: NemesisEncounter) {
    setRenameDraft(item.name);
    setMenuId(null);
    setRenaming(item.id);
    window.setTimeout(() => {
      renameRef.current?.focus();
      renameRef.current?.select();
    }, 0);
  }
  function finishRename() {
    const name = renameDraft.trim();
    if (renaming && name) onRename(renaming, name);
    setRenaming(null);
  }
  function switchTo(id: string) {
    onSwitch(id);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }
  function listKeys(event: KeyboardEvent) {
    // A search box can hand ArrowDown to the list; the rename field keeps its keys.
    if (event.target instanceof HTMLInputElement && !event.target.closest('.picker-search')) return;
    if (event.target instanceof HTMLElement && event.target.closest('.encounter-row-menu')) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const rows = Array.from(pickerRef.current?.querySelectorAll<HTMLButtonElement>('.encounter-choice') ?? []);
    if (!rows.length) return;
    event.preventDefault();
    const index = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % rows.length : index <= 0 ? rows.length - 1 : index - 1;
    rows[next]?.focus();
  }
  const needle = search.trim().toLowerCase();
  const shown = encounters.filter((item) => item.name.toLowerCase().includes(needle));

  return (
    <div class="encounter-switcher" ref={pickerRef} onKeyDown={listKeys}>
      <button
        ref={triggerRef}
        class={`encounter-switch ${open ? 'open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="encounter-picker"
        aria-label={`Current encounter: ${current.name}. Switch or manage encounters`}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
            window.setTimeout(() => pickerRef.current?.querySelector<HTMLButtonElement>('.encounter-choice')?.focus(), 0);
          }
        }}
      >
        <span class="switch-content">
          <strong title={current.name}>{current.name}</strong>
        </span>
        <ChevronDown size={16} class="switch-chevron" />
      </button>
      {open && (
        <div id="encounter-picker" class="encounter-picker" role="dialog" aria-label="Switch and manage encounters">
          <div class="picker-heading">
            <strong>Encounters</strong>
            <span>{encounters.length} saved locally</span>
          </div>
          {encounters.length > 6 && (
            <label class="picker-search">
              <Search size={15} />
              <input autoFocus aria-label="Find encounter" placeholder="Find an encounter…" value={search} onInput={(e) => setSearch(e.currentTarget.value)} />
            </label>
          )}
          <div class="picker-list" aria-label="Saved encounters">
            {shown.map((item) => (
              <div class={`encounter-item ${item.id === current.id ? 'selected' : ''}`} key={item.id}>
                {renaming === item.id ? (
                  <form
                    class="picker-rename"
                    onSubmit={(event) => {
                      event.preventDefault();
                      finishRename();
                    }}
                  >
                    <input
                      ref={renameRef}
                      aria-label={`Rename ${item.name}`}
                      maxLength={100}
                      value={renameDraft}
                      onInput={(event) => setRenameDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.stopPropagation();
                          setRenaming(null);
                        }
                      }}
                    />
                    <button type="submit" title="Save name" aria-label="Save name" disabled={!renameDraft.trim()}>
                      <Check size={17} />
                    </button>
                    <button type="button" title="Cancel" aria-label="Cancel rename" onClick={() => setRenaming(null)}>
                      <X size={17} />
                    </button>
                  </form>
                ) : (
                  <>
                    <button class="encounter-choice" aria-current={item.id === current.id ? 'page' : undefined} onClick={() => switchTo(item.id)}>
                      <span class="choice-details">
                        <strong title={item.name}>{item.name}</strong>
                        <small>
                          {item.cards.length} {item.cards.length === 1 ? 'creature' : 'creatures'} · Round {item.round}
                          {otherPrinting(item) && ` · ${otherPrinting(item)}`}
                        </small>
                      </span>
                      {item.id === current.id && <Check size={16} aria-label="Current" />}
                    </button>
                    <button class="encounter-row-more" title={`Manage ${item.name}`} aria-label={`Manage ${item.name}`} aria-expanded={menuId === item.id} onClick={() => setMenuId((old) => (old === item.id ? null : item.id))}>
                      <MoreHorizontal size={17} />
                    </button>
                  </>
                )}
                {menuId === item.id && (
                  <div class="encounter-row-menu" role="group" aria-label={`Manage ${item.name}`}>
                    <button onClick={() => startRename(item)}>
                      <Pencil size={15} /> Rename
                    </button>
                    <button
                      onClick={() => {
                        onDuplicate(item.id);
                        setOpen(false);
                      }}
                    >
                      <Copy size={15} /> Duplicate
                    </button>
                    <button
                      onClick={() => {
                        onExport(item.id);
                        setOpen(false);
                      }}
                    >
                      <FileDown size={15} /> Export JSON
                    </button>
                    {item.id === current.id && (
                      <>
                        <button
                          onClick={() => {
                            setOpen(false);
                            onNotes();
                          }}
                        >
                          <StickyNote size={15} /> Notes
                        </button>
                        <button
                          onClick={() => {
                            setOpen(false);
                            onReset();
                          }}
                        >
                          <RotateCcw size={15} /> Reset combat
                        </button>
                      </>
                    )}
                    <button
                      class="picker-danger"
                      disabled={encounters.length === 1}
                      title="Undo available"
                      onClick={() => {
                        setMenuId(null);
                        onDelete(item.id);
                      }}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!shown.length && <p class="picker-empty">No matching encounters.</p>}
          </div>
          <div class="picker-quick-actions">
            <button
              class="picker-new"
              onClick={() => {
                setOpen(false);
                onNew();
              }}
            >
              <Plus size={16} /> New encounter
            </button>
            <button
              class="picker-import"
              title="Import an encounter from Nimble Nexus or a file"
              onClick={() => {
                setOpen(false);
                onImport();
              }}
            >
              <FileUp size={16} /> Import
            </button>
            <button
              class="picker-import"
              title="Download every encounter and homebrew monster as one file"
              onClick={() => {
                setOpen(false);
                onBackup();
              }}
            >
              <HardDriveDownload size={16} /> Back up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
