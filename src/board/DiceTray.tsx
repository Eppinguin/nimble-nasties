import { Dice5, X } from 'lucide-preact';
import { useRef } from 'preact/hooks';
import type { RolledDie, RollPart, RollResult } from '../lib/types.ts';
import { EdgeRoll } from '../components/RollControls.tsx';

/** The dice tray: a free roll with Adv/Dis, and the session's roll history. */
export function DiceTray({ rolls, expression, setExpression, edge, setEdge, onRoll, onClose }: { rolls: RollResult[]; expression: string; setExpression: (value: string) => void; edge: number; setEdge: (edge: number) => void; onRoll: () => void; onClose: () => void }) {
  // `D` opened the tray into this field; until it's edited, `D` closes it again. With
  // the caret after a whole expression, a typed `d` could never be part of a roll.
  const edited = useRef(false);
  return (
    <div class="rolls-panel">
      <header>
        <strong>
          <Dice5 size={16} /> Dice tray
        </strong>
        <button class="icon-btn" aria-label="Close rolls" onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      <div class="roll-controls">
        <input
          aria-label="Dice expression"
          value={expression}
          onInput={(e) => {
            edited.current = true;
            setExpression(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRoll();
            const field = e.currentTarget;
            const caretAtEnd = field.selectionStart === field.value.length && field.selectionEnd === field.value.length;
            if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey && !edited.current && caretAtEnd) {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <EdgeRoll name="Quick roll" notation="Roll" allowEdge edge={edge} setEdge={setEdge} onRoll={onRoll} />
      </div>
      <p class="edge-help">
        <b>Adv</b> and <b>Dis</b> stack, and each one cancels one of the other. Set them, then roll.
      </p>
      <div class="roll-history">
        {rolls.length === 0 ? (
          <p>Roll any attack or damage on a stat block and it lands here, every die shown.</p>
        ) : (
          <ol>
            {rolls.map((r) => (
              <RollEntry key={`${r.date}-${r.label}`} roll={r} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function RollEntry({ roll }: { roll: RollResult }) {
  const status = roll.isMiss ? 'miss' : roll.isCritical ? 'critical' : undefined;
  return (
    <li class="roll-entry" data-roll-status={status}>
      <div class="roll-result">
        <strong>{roll.total}</strong>
        {status && <span>{status === 'miss' ? 'Miss' : 'Critical'}</span>}
      </div>
      <div class="roll-detail">
        <div class="roll-head">
          <b title={roll.label}>{roll.label}</b>
          {!!roll.edge && <span class="roll-edge-tag">{roll.edge > 0 ? `Adv ${roll.edge}` : `Dis ${-roll.edge}`}</span>}
          <span class="roll-notation">{roll.notation}</span>
        </div>
        <RollDice roll={roll} />
      </div>
    </li>
  );
}

/** Every die laid out in order: the primary outlined, Adv/Dis drops dashed and
 *  struck, a critical's explosions chained on in ember, modifiers as plain text. */
function RollDice({ roll }: { roll: RollResult }) {
  if (!roll.parts?.length) return <small class="roll-breakdown">{roll.breakdown}</small>;
  // A critical's explosions chain straight off the dice that triggered them, before any modifier.
  const explosion = roll.parts.filter((part) => part.kind === 'explosion');
  const rest = roll.parts.filter((part) => part.kind !== 'explosion');
  const lead = rest.findIndex((part) => part.kind === 'dice') + 1;
  const parts = [...rest.slice(0, lead), ...explosion, ...rest.slice(lead)];
  const sized = parts.filter((part) => part.kind === 'dice').length > 1;
  let order = 0;
  const face = (die: RolledDie, extra = '') => {
    const state = die.state === 'primary' && roll.isCritical ? 'primary max' : die.state === 'primary' && roll.isMiss ? 'primary missed' : (die.state ?? '');
    return (
      <span class={`die ${state} ${extra}`.trim()} style={{ '--i': Math.min(order++, 12) }} title={extra === 'missed' ? `Minion: ${die.value}, miss` : dieTitle(die, roll)}>
        {die.value}
      </span>
    );
  };
  return (
    <p class="roll-dice" title={roll.breakdown}>
      <span class="sr-only">{roll.breakdown}</span>
      <span class="roll-dice-faces" aria-hidden="true">
        {parts.map((part, i) => (
          <span class="roll-part" key={i}>
            {operator(part, i)}
            {part.kind === 'dice' && (
              <>
                {sized && <span class="die-size">d{part.dice[0].sides}</span>}
                {part.dice.map((die) => face(die))}
              </>
            )}
            {part.kind === 'explosion' && part.dice.map((die) => face(die))}
            {part.kind === 'minions' && part.hits.map((hit) => face({ value: hit.value, sides: 0 }, hit.miss ? 'missed' : ''))}
            {part.kind === 'flat' && <span class={part.critOnly ? 'die-mod crit-only' : 'die-mod'}>{Math.abs(part.value)}</span>}
          </span>
        ))}
      </span>
    </p>
  );
}

function operator(part: RollPart, index: number) {
  const negative = (part.kind === 'dice' && part.sign < 0) || (part.kind === 'flat' && part.value < 0);
  if (index === 0 && !negative) return null;
  return <span class="die-op">{negative ? '−' : '+'}</span>;
}

function dieTitle(die: RolledDie, roll: RollResult) {
  if (!die.sides) return `Minion: ${die.value}`;
  const size = `d${die.sides}`;
  if (die.state === 'dropped') return `${size} ${die.value}, dropped`;
  if (die.state === 'exploded') return `${size} ${die.value}, critical explosion`;
  if (die.state === 'primary') return `${size} ${die.value}, primary${roll.isCritical ? ': critical' : roll.isMiss ? ': miss' : ''}`;
  return `${size} ${die.value}`;
}
