import { Fragment } from 'preact';
import { Anvil, CopyPlus, FileDown, FileUp, Link2, ListChecks, MoreHorizontal, Pencil, Trash2 } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import { highlight, matchMonster } from '../lib/browse.ts';
import type { ParsedQuery } from '../lib/browse.ts';
import { ORIGIN_LABEL, originOf } from '../lib/homebrew.ts';
import type { HomebrewGroup, HomebrewSort } from '../lib/homebrew.ts';
import { formatLevel } from '../lib/rules.ts';
import { plural } from '../lib/summons.ts';
import { useApp } from '../app/context.ts';
import { QUICK_LABEL } from '../app/reference.ts';
import { kindLabel, levelOrMinion } from '../app/ui.ts';
import { FieldStepper } from './FieldStepper.tsx';
import type { Library } from './useLibrary.ts';

export type HomebrewTools = {
  onPreview: (id: string) => void;
  onForge: (from?: Monster, mode?: 'edit' | 'remix') => void;
  onImport: () => void;
  onDuplicate: (m: Monster) => void;
  onShare: (m: Monster) => void;
  onShareMany: (ms: Monster[]) => void;
  onExport: (ids: ReadonlySet<string>) => void;
  onDelete: (...ms: Monster[]) => void;
};

/** The homebrew shelf: your own stat blocks, sorted and grouped, each with its tools on the row.
 *  Select mode ticks several for a bulk export, share or delete. */
export function HomebrewShelf({
  lib,
  groups,
  parsed,
  uses,
  fielded,
  listKeys,
  onClear,
  tools,
}: {
  lib: Library;
  groups: { key: string; label: string; monsters: Monster[] }[];
  parsed: ParsedQuery;
  uses: Map<string, number>;
  fielded: Map<string, number>;
  listKeys: (e: KeyboardEvent) => void;
  onClear: () => void;
  tools: HomebrewTools;
}) {
  const { state, dragStart, clearDrag } = useApp();
  const { view, setView, query, quick, brewMenu, setBrewMenu, brewPicked, setBrewPicked, freshBrew } = lib;
  const all = state.customMonsters;
  const selecting = brewPicked !== null;
  const picked = selecting ? all.filter((m) => brewPicked.has(m.id)) : [];
  const shown = groups.flatMap((g) => g.monsters);
  const allShown = shown.length > 0 && shown.every((m) => brewPicked?.has(m.id));
  const creatures = (ids: string[]) => state.encounters.reduce((n, e) => n + e.cards.filter((c) => ids.includes(c.monsterId)).length, 0);
  const takes = (ids: string[]) => {
    const n = creatures(ids);
    return n ? (
      <small>
        +{n} {plural('creature', n)}
      </small>
    ) : null;
  };
  const pick = (id: string) =>
    setBrewPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const found = (m: Monster) => matchMonster(m, parsed);
  const title = (m: Monster) => <strong>{highlight(m.name, found(m)?.nameHits ?? []).map((run, i) => (run.hit ? <mark key={i}>{run.text}</mark> : run.text))}</strong>;
  const meta = (m: Monster) => {
    const origin = originOf(m);
    const n = uses.get(m.id) ?? 0;
    const hit = found(m)?.hit;
    // While searching, the ability that matched takes the family's place on the line.
    return (
      <span>
        {hit ? <span class="lib-hit">{hit}</span> : view.group !== 'family' && <span class="brew-family">{m.family}</span>}
        {m.kind !== 'standard' && <i class={`kind-tag kind-${m.kind}`}>{kindLabel(m)}</i>}
        {view.group !== 'origin' && (origin === 'nexus' ? <span class="brew-origin">Nexus{m.author && <span class="brew-author"> · {m.author}</span>}</span> : <span class="brew-origin">{ORIGIN_LABEL[origin]}</span>)}
        {n > 0 && (
          <span class="brew-uses">
            in {n} {plural('encounter', n)}
          </span>
        )}
      </span>
    );
  };
  if (!all.length)
    return (
      <div class="brew-empty">
        <h3>Your own monsters live here</h3>
        <p>Forge one from the GMG building rules, remix any stat block in the bestiary, or bring them in from a file, a shared link or Nimble Nexus.</p>
        <div>
          <button class="solid" onClick={() => tools.onForge()}>
            <Anvil size={16} /> Forge a monster
          </button>
          <button class="outline" onClick={tools.onImport}>
            <FileUp size={16} /> Import
          </button>
        </div>
      </div>
    );
  return (
    <>
      {selecting ? (
        <div class="brew-tools brew-selecting">
          <span>
            <b>{picked.length}</b> of {all.length} selected
          </span>
          <button class="text-btn" onClick={() => setBrewPicked(allShown ? new Set([...brewPicked].filter((id) => !shown.some((m) => m.id === id))) : new Set([...brewPicked, ...shown.map((m) => m.id)]))}>
            {allShown ? 'Select none' : 'Select all'}
          </button>
          <button class="brew-done" onClick={() => setBrewPicked(null)}>
            Done
          </button>
        </div>
      ) : (
        <div class="brew-tools">
          <label class="brew-select">
            <span>Sort</span>
            <select value={view.sort} onChange={(e) => setView((v) => ({ ...v, sort: e.currentTarget.value as HomebrewSort }))}>
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="level">Level</option>
            </select>
          </label>
          <label class="brew-select">
            <span>Group</span>
            <select value={view.group} onChange={(e) => setView((v) => ({ ...v, group: e.currentTarget.value as HomebrewGroup }))}>
              <option value="none">None</option>
              <option value="family">Family</option>
              <option value="origin">Source</option>
            </select>
          </label>
          <button
            class="brew-select-mode"
            onClick={() => {
              setBrewMenu(null);
              setBrewPicked(new Set());
            }}
            title="Tick several monsters to export or delete them together"
          >
            <ListChecks size={16} /> Select
          </button>
        </div>
      )}
      <div
        class={`library-list brew-list ${selecting ? 'is-selecting' : ''}`}
        role="list"
        aria-label="Your homebrew monsters"
        onKeyDown={(e) => {
          listKeys(e);
          if (e.key !== 'Escape' || (!brewMenu && !selecting)) return;
          e.stopPropagation();
          if (brewMenu) setBrewMenu(null);
          else setBrewPicked(null);
        }}
      >
        {!shown.length && (
          <div class="empty-library">
            <p>
              No {quick === 'all' ? 'homebrew' : `homebrew ${QUICK_LABEL[quick].toLowerCase()}`} match{query.trim() && <> “{query.trim()}”</>}.
            </p>
            <button class="text-btn" onClick={onClear}>
              Clear search and filters
            </button>
          </div>
        )}
        {groups.map((group) => (
          <Fragment key={group.key}>
            {group.label && (
              <h3 class="brew-group">
                {group.label}
                <span>{group.monsters.length}</span>
              </h3>
            )}
            {group.monsters.map((m) => {
              const open = brewMenu === m.id;
              return (
                <Fragment key={m.id}>
                  <div
                    class={`library-item brew-row ${freshBrew.has(m.id) ? 'is-fresh' : ''} ${open ? 'is-open' : ''} ${brewPicked?.has(m.id) ? 'is-picked' : ''}`}
                    role="listitem"
                    draggable={!selecting}
                    onDragStart={(e) => dragStart(e, 'monster', m.id, m.name, `${levelOrMinion(m, formatLevel(m.level))} · Add to encounter`)}
                    onDragEnd={clearDrag}
                  >
                    {selecting ? (
                      <label class="lib-main brew-pick">
                        <input type="checkbox" checked={brewPicked.has(m.id)} onChange={() => pick(m.id)} />
                        <span class="lib-level" aria-label={`Level ${formatLevel(m.level)}`}>
                          {formatLevel(m.level)}
                        </span>
                        <span class="lib-text">
                          {title(m)}
                          {meta(m)}
                        </span>
                      </label>
                    ) : (
                      <button class="lib-main" onClick={() => tools.onPreview(m.id)} title={`Inspect ${m.name}`}>
                        <span class="lib-level" aria-label={`Level ${formatLevel(m.level)}`}>
                          {formatLevel(m.level)}
                        </span>
                        <span class="lib-text">
                          {title(m)}
                          {meta(m)}
                        </span>
                      </button>
                    )}
                    {!selecting && (
                      <>
                        <button class="icon-btn brew-tool" aria-label={`Edit ${m.name} in the Monster Forge`} title="Edit in the Monster Forge" onClick={() => tools.onForge(m, 'edit')}>
                          <Pencil size={16} />
                        </button>
                        <button class="icon-btn brew-tool" aria-label={`More for ${m.name}`} title="Duplicate, share, export, delete" aria-expanded={open} aria-controls={`brew-menu-${m.id}`} onClick={() => setBrewMenu(open ? null : m.id)}>
                          <MoreHorizontal size={17} />
                        </button>
                        <FieldStepper monster={m} here={fielded.get(m.id) ?? 0} />
                      </>
                    )}
                  </div>
                  {open && (
                    <div class="brew-menu" id={`brew-menu-${m.id}`} role="group" aria-label={`${m.name} tools`}>
                      <button onClick={() => tools.onDuplicate(m)}>
                        <CopyPlus size={15} /> Duplicate
                      </button>
                      <button
                        onClick={() => {
                          setBrewMenu(null);
                          tools.onShare(m);
                        }}
                        title="Copy a link that carries this whole stat block"
                      >
                        <Link2 size={15} /> Share link
                      </button>
                      <button
                        onClick={() => {
                          setBrewMenu(null);
                          tools.onExport(new Set([m.id]));
                        }}
                        title="Save this stat block as a JSON file"
                      >
                        <FileDown size={15} /> Export
                      </button>
                      <button class="brew-delete" onClick={() => tools.onDelete(m)} title={creatures([m.id]) ? 'Also removes its creatures from your encounters; asks first' : undefined}>
                        <Trash2 size={15} /> Delete{takes([m.id])}
                      </button>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </Fragment>
        ))}
      </div>
      {selecting ? (
        <div class="library-footer brew-bulk">
          <button class="outline danger" disabled={!picked.length} onClick={() => tools.onDelete(...picked)}>
            <Trash2 size={15} /> Delete{takes(picked.map((m) => m.id))}
          </button>
          {picked.length === 1 ? (
            <button
              class="outline"
              onClick={() => {
                setBrewPicked(null);
                tools.onShare(picked[0]);
              }}
              title="Copy a link that carries this stat block"
            >
              <Link2 size={15} /> Copy link
            </button>
          ) : (
            picked.length > 1 && (
              <button class="outline" onClick={() => tools.onShareMany(picked)} title="Send the monsters as one file, or copy a link to each">
                <Link2 size={15} /> Share {picked.length}
              </button>
            )
          )}
          <button class="solid" disabled={!picked.length} onClick={() => tools.onExport(brewPicked)}>
            <FileDown size={15} /> {picked.length ? `Export ${picked.length}` : 'Pick monsters'}
          </button>
        </div>
      ) : (
        <div class="library-footer">
          <button class="forge-open" onClick={() => tools.onForge()}>
            <Anvil size={16} /> Forge a monster
          </button>
          <span class="library-files">
            <button onClick={tools.onImport} title="Import monsters from a link or a JSON file">
              <FileUp size={16} /> Import
            </button>
          </span>
        </div>
      )}
    </>
  );
}
