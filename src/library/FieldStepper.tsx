import { Minus, Plus } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import type { NemesisCard } from '../lib/board.ts';
import { useApp } from '../app/context.ts';

const untouched = (c: NemesisCard) => c.hp === c.maxHp && !c.conditions.length && !c.acted;

/** The newest creature still untouched by the fight (full HP, no conditions, not
 *  acted), else the newest one standing: trimming while building leaves the
 *  creatures the GM is already tracking for last. */
export function newestRemovable(cards: NemesisCard[], monsterId: string): NemesisCard | undefined {
  const standing = cards.filter((c) => c.monsterId === monsterId && c.lane !== 'defeated');
  return [...standing].reverse().find(untouched) ?? standing.at(-1);
}

/** A library row's add button; once the monster is in the encounter it grows into
 *  − count + so the encounter can be built and trimmed without leaving the drawer. */
export function FieldStepper({ monster, here }: { monster: Monster; here: number }) {
  const { encounter, addMonster, removeCard } = useApp();
  const removeOne = () => {
    const card = newestRemovable(encounter.cards, monster.id);
    if (card) removeCard(card.id);
  };
  return (
    <div class="lib-stepper" data-here={here > 0 || undefined}>
      {here > 0 && (
        <>
          <button class="lib-remove" aria-label={`Remove one ${monster.name}`} title={`Remove one ${monster.name} · Undo available`} onClick={removeOne}>
            <Minus size={16} />
          </button>
          <span class="lib-fielded" title={`${here} in this encounter`} aria-label={`${here} in this encounter`}>
            {here}
          </span>
        </>
      )}
      <button class="lib-add" aria-label={`Add ${monster.name}`} title={`Add ${monster.name}`} onClick={() => addMonster(monster)}>
        <Plus size={16} />
      </button>
    </div>
  );
}
