import { Fragment } from 'preact';
import { useMemo } from 'preact/hooks';
import type { Ref } from 'preact';
import { Anvil, FileDown, FileUp, Info, Search, X } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import { describeLevel, groupMatches, highlight, matchMonster, parseQuery, passesQuick, searchMonsters } from '../lib/browse.ts';
import { ORIGIN_LABEL, encountersUsing, groupHomebrew, originOf } from '../lib/homebrew.ts';
import { encounterStats, formatLevel, formatLevels } from '../lib/rules.ts';
import { rulesFor } from '../lib/rulesets.ts';
import { nexusTarget } from '../lib/nexus.ts';
import type { NexusTarget } from '../lib/nexus.ts';
import { sharedPayload } from '../lib/share.ts';
import { useApp } from '../app/context.ts';
import { QUICK_LABEL } from '../app/reference.ts';
import { kindLabel, levelOrMinion, scrollBehavior } from '../app/ui.ts';
import { HomebrewShelf } from './HomebrewShelf.tsx';
import type { HomebrewTools } from './HomebrewShelf.tsx';
import { PartySetup } from './PartySetup.tsx';
import { FieldStepper } from './FieldStepper.tsx';
import type { Library, LibraryTab } from './useLibrary.ts';

type Stats = ReturnType<typeof encounterStats>;

/** Levels left before Hard, with the book's thirds and quarters. */
const budgetLeft = (levelsLeft: number) => formatLevels(Math.max(0, levelsLeft));

/** The library drawer: difficulty budget and party up top, then the bestiary and
 *  homebrew shelves with search. Search reads levels (`3`, `2-4`, `5+`) and matches
 *  names, families, kinds and ability text; a pasted monster or Nexus link opens it. */
export function LibraryDrawer({
  lib,
  bestiary,
  stats,
  mobileOpen,
  searchRef,
  onClose,
  onRules,
  onExportMany,
  onShared,
  onNexus,
  tools,
}: {
  lib: Library;
  bestiary: Monster[];
  stats: Stats;
  mobileOpen: boolean;
  searchRef: Ref<HTMLInputElement>;
  onClose: () => void;
  onRules: () => void;
  onExportMany: () => void;
  onShared: (payload: string) => void;
  onNexus: (target: NexusTarget) => void;
  tools: HomebrewTools;
}) {
  const { state, encounter, dragStart, clearDrag } = useApp();
  const { view, setView, setTab, query, setQuery, quick, setQuick } = lib;
  const levelsLeft = stats.budget - stats.spent;
  const parsed = useMemo(() => parseQuery(query), [query]);
  const fieldedIds = useMemo(() => new Set(encounter.cards.map((c) => c.monsterId)), [encounter.cards]);
  const matches = useMemo(() => searchMonsters(bestiary, parsed, quick, levelsLeft, fieldedIds), [bestiary, parsed, quick, levelsLeft, fieldedIds]);
  const shelves = useMemo(() => groupMatches(matches, view.view, parsed.words.length > 0), [matches, view.view, parsed]);
  // Matches the quick filter is hiding, offered back on an empty result.
  const hiddenByQuick = useMemo(() => (quick === 'all' || matches.length ? 0 : bestiary.filter((m) => matchMonster(m, parsed)).length), [quick, matches.length, bestiary, parsed]);
  const fielded = useMemo(() => {
    const n = new Map<string, number>();
    for (const c of encounter.cards) if (c.lane !== 'defeated') n.set(c.monsterId, (n.get(c.monsterId) ?? 0) + 1);
    return n;
  }, [encounter.cards]);
  const brewShown = useMemo(() => {
    // Origin and author count as words here too, so "nexus" or a creator's name finds their monsters.
    const extra = (m: Monster) => `${ORIGIN_LABEL[originOf(m)]} ${m.author ?? ''}`.toLowerCase();
    return state.customMonsters.filter((m) => passesQuick(m, quick, levelsLeft, fieldedIds) && (matchMonster(m, parsed) || (parsed.words.length && parsed.words.every((w) => extra(m).includes(w)) && matchMonster(m, { ...parsed, words: [] }))));
  }, [state.customMonsters, parsed, quick, levelsLeft, fieldedIds]);
  const brewGroups = useMemo(() => groupHomebrew(brewShown, view.sort, view.group), [brewShown, view.sort, view.group]);
  const brewUses = useMemo(() => new Map(state.customMonsters.map((m) => [m.id, encountersUsing(m.id, state.encounters)])), [state.customMonsters, state.encounters]);
  const filtering = Boolean(query.trim()) || quick !== 'all';
  const search = () => (searchRef as { current: HTMLInputElement | null }).current;

  function clearBrowse() {
    setQuery('');
    setQuick('all');
    search()?.focus();
  }
  /** Down from the search walks into the results; Enter opens the top one. */
  function searchKeys(e: KeyboardEvent) {
    const first = document.querySelector<HTMLElement>('#library-panel .lib-main');
    if (!first) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      first.focus();
    } else if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      first.click();
    }
  }
  function listKeys(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.lib-main')];
    const at = rows.findIndex((row) => row.contains(document.activeElement));
    if (at < 0) return;
    e.preventDefault();
    if (e.key === 'ArrowUp' && at === 0) search()?.focus();
    else rows[Math.max(0, Math.min(rows.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
  }
  function searchInput(value: string) {
    const payload = sharedPayload(value);
    const nexus = nexusTarget(value);
    if (payload) {
      setQuery('');
      onShared(payload);
    } else if (nexus) {
      setQuery('');
      onNexus(nexus);
    } else setQuery(value);
  }
  /** One tap narrows, a second tap lets go. Fits budget keeps standard monsters that stay at or under Hard;
   * In encounter lists what is already fielded, so a phone can trim the encounter without leaving the drawer. */
  function quickFilters() {
    const left = Math.max(0, levelsLeft),
      shown = budgetLeft(levelsLeft);
    return (
      <div class="lib-quick" role="group" aria-label="Show only">
        {(fieldedIds.size > 0 || quick === 'fielded') && (
          <button class="lib-quick-fielded" aria-pressed={quick === 'fielded'} title="Only the monsters already in this encounter" onClick={() => setQuick((q) => (q === 'fielded' ? 'all' : 'fielded'))}>
            {QUICK_LABEL.fielded}
            <span class="count">{fieldedIds.size}</span>
          </button>
        )}
        {(['standard', 'minion', 'legendary', 'fits'] as const).map((key) => {
          const spent = key === 'fits' && left < 0.25 && quick !== 'fits';
          return (
            <button key={key} aria-pressed={quick === key} disabled={spent} title={key === 'fits' ? (spent ? 'The level budget is spent' : `Standard monsters of level ${shown} or lower: they keep the encounter at or under Hard`) : undefined} onClick={() => setQuick((q) => (q === key ? 'all' : key))}>
              {QUICK_LABEL[key]}
            </button>
          );
        })}
      </div>
    );
  }
  const tabs: [LibraryTab, string, number][] = [
    ['bestiary', 'Bestiary', bestiary.length],
    ['homebrew', 'Homebrew', state.customMonsters.length],
  ];
  function tabKeys(e: KeyboardEvent, tab: LibraryTab) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 'bestiary' : e.key === 'End' ? 'homebrew' : tab === 'bestiary' ? 'homebrew' : 'bestiary';
    setTab(next);
    document.getElementById(`library-tab-${next}`)?.focus();
  }

  return (
    <aside class={`sidebar add-drawer panel-open ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Monster library and encounter budget" id="monster-library">
      <div class="sidebar-head">
        <div class="library-drawer-title">
          <strong>Add monsters</strong>
          <small class="drawer-head-hint">Party · difficulty · bestiary</small>
          {/* Phones and short screens scroll the budget away; this keeps it in sight and brings it back. */}
          <button type="button" class="drawer-head-difficulty" data-difficulty={stats.difficulty.color} onClick={(e) => (e.currentTarget.closest('.add-drawer') as HTMLElement | null)?.scrollTo({ top: 0, behavior: scrollBehavior() })}>
            <span class="difficulty-dot" aria-hidden="true" />
            <b>{stats.difficulty.label}</b>
            <span>
              {Number(stats.spent.toFixed(2))}/{stats.budget} levels
            </span>
            <span class="sr-only">. Show party and budget</span>
          </button>
        </div>
        <button class="icon-btn panel-collapse" title="Close monster library" aria-label="Close monster library" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div class="drawer-overview">
        <div class="drawer-budget-head">
          <div>
            <strong>
              {stats.difficulty.label}{' '}
              <button class="drawer-info" onClick={onRules} aria-label="Encounter building rules">
                <Info size={15} />
              </button>
            </strong>
            <small>Encounter difficulty · {rulesFor(encounter).name}</small>
          </div>
          <div class="drawer-budget-total">
            <b>{Number(stats.spent.toFixed(2))}</b>
            <span> / {stats.budget} levels</span>
          </div>
        </div>
        <div class="drawer-budget-track" role="progressbar" aria-label="Encounter budget percentage" aria-valuemin={0} aria-valuemax={150} aria-valuenow={Math.min(150, Math.round(stats.difficulty.ratio * 100))}>
          <span style={{ transform: `scaleX(${Math.min(1, stats.difficulty.ratio / 1.5)})` }} />
          <i title="100% party budget" />
        </div>
        <div class="drawer-budget-scale">
          <span>Easy 50%</span>
          <span>Hard 100%</span>
          <span>Very deadly 150%</span>
        </div>
        <PartySetup party={lib.party} setParty={lib.setParty} />
        {stats.warnings.map((w) => (
          <p class="drawer-warning" key={w}>
            <Info size={13} />
            {w}
          </p>
        ))}
      </div>
      <div class="library-tabs" role="tablist" aria-label="Library">
        {tabs.map(([tab, label, count]) => (
          <button key={tab} role="tab" id={`library-tab-${tab}`} aria-controls="library-panel" aria-selected={view.tab === tab} tabIndex={view.tab === tab ? 0 : -1} onKeyDown={(e) => tabKeys(e, tab)} onClick={() => setTab(tab)}>
            {label}
            <span class="count">{count}</span>
          </button>
        ))}
      </div>
      {/* On phones the drawer scrolls as one column and this pins under the name bar. */}
      <div class="library-find">
        <label class="search-field">
          <Search size={16} />
          <input ref={searchRef} aria-label="Search monsters" placeholder={view.tab === 'homebrew' ? 'Search your homebrew, or paste a link…' : 'Name, ability, level, or a link…'} value={query} onKeyDown={searchKeys} onInput={(e) => searchInput(e.currentTarget.value)} />
          <kbd>/</kbd>
        </label>
        {(view.tab === 'bestiary' || state.customMonsters.length > 0) && quickFilters()}
      </div>
      <div id="library-panel" class="library-panel" role="tabpanel" aria-labelledby={`library-tab-${view.tab}`}>
        {view.tab === 'homebrew' ? (
          <HomebrewShelf lib={lib} groups={brewGroups} parsed={parsed} uses={brewUses} fielded={fielded} listKeys={listKeys} onClear={clearBrowse} tools={tools} />
        ) : (
          <>
            <div class="lib-summary">
              <span class="lib-count" aria-live="polite">
                {filtering ? (
                  <>
                    <b>{matches.length}</b> of {bestiary.length}
                  </>
                ) : (
                  <>
                    <b>{bestiary.length}</b> monsters
                  </>
                )}
                {parsed.level && <i class="lib-token">{describeLevel(parsed.level)}</i>}
                {quick === 'fits' && (
                  <i class="lib-token" title="Levels left before Hard">
                    ≤ {budgetLeft(levelsLeft)} left
                  </i>
                )}
                {filtering && (
                  <button class="text-btn lib-clear" onClick={clearBrowse}>
                    Clear
                  </button>
                )}
              </span>
              <div class="lib-views" role="group" aria-label="Arrange the bestiary">
                {(
                  [
                    ['name', 'A–Z'],
                    ['level', 'Level'],
                    ['family', 'Family'],
                  ] as const
                ).map(([key, label]) => (
                  <button key={key} aria-pressed={view.view === key} onClick={() => setView((v) => ({ ...v, view: key }))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div class="library-list" role="list" aria-label="Monster bestiary" onKeyDown={listKeys}>
              {!matches.length && (
                <div class="empty-library">
                  <p>
                    {quick === 'fielded' && !query.trim() ? (
                      'Nothing in this encounter yet.'
                    ) : (
                      <>
                        No {quick === 'all' ? 'monsters' : quick === 'fielded' ? 'monsters in this encounter' : QUICK_LABEL[quick].toLowerCase()} match{query.trim() && <> “{query.trim()}”</>}.
                      </>
                    )}
                  </p>
                  {hiddenByQuick ? (
                    <button class="text-btn" onClick={() => setQuick('all')}>
                      Show {hiddenByQuick} more outside {QUICK_LABEL[quick]}
                    </button>
                  ) : (
                    <small>Try a family, an ability like “poison”, or a level like “2-4”.</small>
                  )}
                </div>
              )}
              {shelves.map((shelf) => (
                <Fragment key={shelf.key}>
                  {shelf.label && (
                    <h3 class="brew-group">
                      {shelf.label}
                      <span>{shelf.matches.length}</span>
                    </h3>
                  )}
                  {shelf.matches.map(({ monster, nameHits, hit }) => {
                    const here = fielded.get(monster.id) ?? 0;
                    return (
                      <div class="library-item" key={monster.id} role="listitem" draggable onDragStart={(e) => dragStart(e, 'monster', monster.id, monster.name, `${levelOrMinion(monster, formatLevel(monster.level))} · Add to encounter`)} onDragEnd={clearDrag}>
                        <button class="lib-main" onClick={() => tools.onPreview(monster.id)} title={`Inspect ${monster.name}`}>
                          <span class="lib-level" aria-label={`Level ${formatLevel(monster.level)}`}>
                            {formatLevel(monster.level)}
                          </span>
                          <span class="lib-text">
                            <strong>{highlight(monster.name, nameHits).map((run, i) => (run.hit ? <mark key={i}>{run.text}</mark> : run.text))}</strong>
                            <span>
                              {shelf.label !== monster.family && <span class="lib-family">{monster.family}</span>}
                              {monster.kind !== 'standard' && <i class={`kind-tag kind-${monster.kind}`}>{kindLabel(monster)}</i>}
                              {monster.source === 'homebrew' && <i class="kind-tag kind-homebrew">Homebrew</i>}
                              {monster.armor !== 'none' && (
                                <i class="lib-armor" title={`${monster.armor === 'medium' ? 'Medium' : 'Heavy'} armor`}>
                                  {monster.armor === 'medium' ? 'M' : 'H'}
                                </i>
                              )}
                              {hit && <span class="lib-hit">{hit}</span>}
                            </span>
                          </span>
                        </button>
                        <FieldStepper monster={monster} here={here} />
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
            <div class="library-footer">
              <button class="forge-open" onClick={() => tools.onForge()}>
                <Anvil size={16} /> Forge a monster
              </button>
              <span class="library-files">
                <button onClick={tools.onImport} title="Import monsters from a link or a JSON file">
                  <FileUp size={16} /> Import
                </button>
                {state.customMonsters.length > 0 && (
                  <button onClick={onExportMany} title="Choose homebrew monsters to save to a JSON file">
                    <FileDown size={16} /> Export
                  </button>
                )}
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
