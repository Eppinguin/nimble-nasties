import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import type { NemesisCard } from '../lib/board.ts';
import { uid } from '../lib/board.ts';
import { rollHorde } from '../lib/dice.ts';
import { lanePacks, recordPackRoll, standingIn, toAct } from '../lib/horde.ts';
import type { LanePack } from '../lib/horde.ts';
import { liveSummon, plural } from '../lib/summons.ts';
import { useApp } from '../app/context.ts';
import { clamp, hpStateOf } from '../app/ui.ts';
import { HordeRoll } from '../components/RollControls.tsx';
import { Statline } from '../components/Statline.tsx';
import { Statblock } from '../components/Statblock.tsx';
import { CreatureRow } from './CreatureRow.tsx';
import { Horde } from './Horde.tsx';

type Action = Monster['actions'][number];
const ROSTER_PREVIEW = 6;

/** One stat block on the board: its creatures above the shared stat block.
 *  Minion lanes show their horde as packs, with optional per-minion rows. */
export function Lane({ monster, cards }: { monster: Monster; cards: NemesisCard[] }) {
  const api = useApp();
  const { encounter, dragging, dropTarget } = api;
  const { laneUi, toggleLaneUi, arrange, setArrange, setPicked, attackers, setAttackers, resetAttackers } = api.ui;
  const ui = laneUi[monster.id] ?? {};
  const arranging = arrange === monster.id;

  const defeatedCount = cards.filter((card) => card.lane === 'defeated').length;
  // Every creature still standing has taken its turn: the sheet steps back until next round.
  const spent = defeatedCount < cards.length && cards.every((card) => card.lane === 'defeated' || card.acted);
  const visible = ui.defeated ? cards : cards.filter((card) => card.lane !== 'defeated');
  const shownCards = ui.expanded ? visible : visible.slice(0, ROSTER_PREVIEW);
  // A summoned lane plays by its summoner's state (Alaric's Last Stand: bats roll d20s).
  const phaseCards = monster.summon ? encounter.cards.filter((card) => card.monsterId === monster.summon?.by) : cards;
  const phase = { bloodied: phaseCards.some((card) => hpStateOf(card) === 'bloodied'), lastStand: phaseCards.some((card) => hpStateOf(card) === 'laststand') };
  const playing = monster.summon ? liveSummon(monster, phase).monster : monster;
  const packs = monster.kind === 'minion' ? lanePacks(encounter, monster.id) : undefined;
  const rows = !packs || !!ui.rows;

  /** One roll for the pack's minions still to act: one die each, 1s miss,
   * the rest add up into a single attack. Every action draws on the same pool. */
  function rollPack(allPacks: LanePack[], pack: LanePack, action: Action, count: number) {
    if (!action.notation || count < 1) return;
    try {
      const where = allPacks.length > 1 ? ` · ${pack.name}` : '';
      const result = rollHorde(action.notation, count, { label: `${count} ${plural(monster.name, count)}${where} · ${action.name}`, level: monster.level });
      const missed = count - result.hits;
      // The strip's big numeral is the total alone; the misses ride in the label.
      api.showRoll([result], { label: `${result.label}${missed && !result.isMiss ? ` · ${missed} missed` : ''}`, summary: result.isMiss ? 'Miss' : String(result.total), status: result.isMiss ? 'miss' : 'normal' });
      api.stamp(
        toAct(pack)
          .slice(0, count)
          .map((card) => card.id),
      );
      api.patchEncounter(`${count}× ${action.name}${where}: ${result.isMiss ? 'miss' : result.total}`, (e) => recordPackRoll(e, monster.id, pack.id, count, { id: uid(), action: action.name, total: result.total, hits: result.hits }));
      resetAttackers(`${monster.id}|${pack.id}|`);
    } catch (err) {
      api.notify(err instanceof Error ? err.message : 'Invalid dice notation');
    }
  }
  function packRoll(allPacks: LanePack[], pack: LanePack, action: Action) {
    if (!action.notation) return null;
    const key = `${monster.id}|${pack.id}|${action.id}`;
    // Once everyone has acted the GM may still roll, for any standing minion.
    const left = toAct(pack).length || standingIn(pack).length;
    const count = clamp(attackers[key] ?? left, 1, Math.max(1, left));
    return <HordeRoll name={action.name} notation={action.notation} count={count} max={left} extra={!toAct(pack).length} setCount={(n) => setAttackers(key, n)} onRoll={() => rollPack(allPacks, pack, action, count)} />;
  }

  return (
    <section class={`monster-lane ${dragging?.kind === 'lane' && dragging.id === monster.id ? 'being-dragged' : ''} ${dropTarget === monster.id && dragging?.id === monster.id ? 'drop-to-group' : ''}`} data-lane-id={monster.id} data-spent={spent || undefined}>
      <header class="lane-header">
        <div class="lane-title">
          <h2>
            {monster.name}
            {spent && <span class="sr-only"> (all acted this round)</span>}
          </h2>
          <div class="lane-tools" role="group" aria-label={`${monster.name} stat block controls`}>
            <span
              class="lane-grip"
              draggable
              tabIndex={0}
              role="button"
              aria-label={`Reorder ${monster.name}. Drag or press left/right arrow keys.`}
              title="Drag to reorder · Arrow keys to move"
              onDragStart={(e) => api.dragStart(e, 'lane', monster.id, monster.name, 'Move stat block')}
              onDragEnd={api.clearDrag}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  api.shiftLane(monster.id, e.key === 'ArrowLeft' ? -1 : 1);
                }
              }}
            >
              <GripVertical size={17} />
            </span>
            <button class="lane-remove" draggable={false} type="button" title={`Remove all ${cards.length} ${monster.name} creatures · Undo available`} aria-label={`Remove entire ${monster.name} stat block from encounter`} onClick={() => api.removeStatblock(monster.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <Statline monster={monster} />
      </header>
      <div class="lane-scroll" tabIndex={0} aria-label={`Scroll ${monster.name} creatures and actions`}>
        {dragging?.kind === 'monster' && dragging.id === monster.id && dropTarget === monster.id && (
          <div class="roster-insert-preview">
            <Plus size={15} /> Add another {monster.name} here
          </div>
        )}
        {packs && <Horde monster={monster} playing={playing} packs={packs} laneCards={cards} packRoll={(pack, action) => packRoll(packs, pack, action)} />}
        {rows && (
          <div class="instance-list">
            {shownCards.map((card, index) => (
              <CreatureRow key={card.id} monster={monster} card={card} index={index} laneCards={cards} />
            ))}
          </div>
        )}
        <div class="lane-actions">
          <button class="add-copy" onClick={() => api.addMonster(monster, cards[0]?.groupId)} title={`Add another ${monster.name}`}>
            <Plus size={14} /> Add another
          </button>
          {packs && (
            <button
              class="roster-toggle"
              aria-pressed={arranging}
              onClick={() => {
                setArrange(arranging ? null : monster.id);
                setPicked([]);
              }}
              title="Pick minions and move them into packs: who stands where"
            >
              Move
            </button>
          )}
          {packs && (
            <button class="roster-toggle" aria-pressed={rows} onClick={() => toggleLaneUi(monster.id, 'rows')} title="A row per minion to rename it or add conditions">
              {rows ? 'Hide names' : 'Names & conditions'}
            </button>
          )}
          {rows && visible.length > ROSTER_PREVIEW && (
            <button class="roster-toggle" aria-expanded={!!ui.expanded} onClick={() => toggleLaneUi(monster.id, 'expanded')}>
              {ui.expanded ? 'Show fewer' : `${visible.length - ROSTER_PREVIEW} more`} <ChevronDown size={13} />
            </button>
          )}
          {rows && defeatedCount > 0 && (
            <button class="roster-toggle defeated-toggle" aria-expanded={!!ui.defeated} onClick={() => toggleLaneUi(monster.id, 'defeated')}>
              {ui.defeated ? 'Hide defeated' : `${defeatedCount} defeated · show`}
            </button>
          )}
        </div>
        {/* A split horde rolls from its pack bands; one pack rolls right here. */}
        <Statblock monster={playing} scope={monster.id} live={phase} packRoll={packs && ((action) => (packs.length === 1 ? packRoll(packs, packs[0], action) : null))} />
      </div>
    </section>
  );
}
