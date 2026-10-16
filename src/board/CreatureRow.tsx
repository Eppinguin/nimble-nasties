import { Check, Plus, Skull, Trash2, X } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import { conditionNames } from '../lib/board.ts';
import type { NemesisCard } from '../lib/board.ts';
import { useApp } from '../app/context.ts';
import { clamp, hpStateOf } from '../app/ui.ts';
import { HpCommandInput } from '../components/HpCommandInput.tsx';

const HP_STATE_LABEL = { down: 'Down', laststand: 'Last Stand', bloodied: 'Bloodied', healthy: '' };

/** One creature: turn box, name, conditions, the HP command field and its ruler. */
export function CreatureRow({ monster, card, index, laneCards }: { monster: Monster; card: NemesisCard; index: number; laneCards: NemesisCard[] }) {
  const {
    editCard,
    cardName,
    toggleCondition,
    removeCard,
    hpEntry,
    ui: { conditionFor, setConditionFor },
    freshIds,
  } = useApp();
  const dead = card.lane === 'defeated';
  const hpPercent = clamp((card.hp / card.maxHp) * 100, 0, 100);
  const hpState = hpStateOf(card);
  const hpStateLabel = HP_STATE_LABEL[hpState];
  const picking = conditionFor === card.id;
  return (
    <article class={`creature-row ${dead ? 'is-dead' : ''} ${card.acted ? 'has-acted' : ''} ${card.maxHp <= 1 ? 'is-one-hp' : ''} ${freshIds.has(card.id) ? 'is-fresh' : ''}`} data-hp={hpState}>
      <button
        class="turn-box"
        aria-pressed={!!card.acted}
        aria-label={`${card.acted ? 'Unmark' : 'Mark'} turn for ${card.name}`}
        title={card.acted ? 'Unmark turn' : 'Mark turn taken'}
        onClick={() => editCard(card.id, `${card.acted ? 'Turn unmarked' : 'Turn marked'} for ${cardName(card)}`, (c) => ({ ...c, acted: !c.acted }))}
      >
        {dead ? <Skull size={15} /> : card.acted ? <Check size={17} strokeWidth={3} /> : null}
      </button>
      <div class="creature-main">
        <div class="creature-line">
          <input
            class="creature-name"
            aria-label={`${monster.name} ${index + 1} name`}
            value={card.name === monster.name ? `${monster.name} ${laneCards.indexOf(card) + 1}` : card.name}
            onChange={(e) => {
              const name = e.currentTarget.value;
              editCard(card.id, `${cardName(card)} renamed to ${name}`, (c) => ({ ...c, name }));
            }}
          />
          <button class="condition-trigger" title={`Conditions for ${card.name}`} aria-label={`Add condition to ${card.name}`} aria-expanded={picking} onClick={() => setConditionFor(picking ? null : card.id)}>
            <Plus size={14} />
          </button>
          <button class="row-menu" aria-label={`Remove ${card.name}`} title="Remove (undo available)" onClick={() => removeCard(card.id)}>
            <Trash2 size={14} />
          </button>
        </div>
        {(hpStateLabel || card.conditions.length > 0) && (
          <div class="conditions">
            {hpStateLabel && (
              <span class={`hp-state hp-state-${hpState}`}>
                {hpStateLabel}
                {hpState === 'laststand' ? ` · ${card.lastStandRemaining} left` : ''}
              </span>
            )}
            {card.conditions.map((cond) => (
              <button class="condition-chip" key={cond} onClick={() => toggleCondition(card.id, cond)} title={`Remove ${cond}`} aria-label={`Remove ${cond}`}>
                {cond}
                <X size={11} />
              </button>
            ))}
          </div>
        )}
      </div>
      <HpCommandInput key={card.id} name={card.name} hp={card.hp} maxHp={card.maxHp} apply={(raw) => hpEntry(card.id, raw)} />
      <div class="hp-ruler" role="progressbar" aria-valuenow={card.hp} aria-valuemin={0} aria-valuemax={card.maxHp} aria-label={`${card.name} HP`}>
        <span style={{ transform: `scaleX(${hpPercent / 100})` }} />
      </div>
      {picking && (
        <div class="condition-picker">
          <div class="condition-picker-head">
            <strong>Apply condition</strong>
            <button onClick={() => setConditionFor(null)} aria-label="Close">
              <X size={14} />
            </button>
          </div>
          {conditionNames
            .filter((c) => !card.conditions.includes(c))
            .map((name) => (
              <button key={name} onClick={() => toggleCondition(card.id, name)}>
                {name}
              </button>
            ))}
          <button
            class="picker-remove"
            onClick={() => {
              setConditionFor(null);
              removeCard(card.id);
            }}
          >
            <Trash2 size={14} /> Remove {card.name === monster.name ? 'creature' : card.name}
          </button>
        </div>
      )}
    </article>
  );
}
