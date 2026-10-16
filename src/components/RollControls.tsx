import { Dice5, Minus, Plus } from 'lucide-preact';
import { edgeLabel } from '../app/ui.ts';

/** Nimble edge, set where you roll: ADV and DIS only change the stack count
 * (each advantage cancels one disadvantage); the pill rolls with it and resets.
 */
export function EdgeRoll({ name, notation, edge, setEdge, onRoll, allowEdge }: { name: string; notation: string; edge: number; setEdge: (edge: number) => void; onRoll: () => void; allowEdge: boolean }) {
  const state = edge > 0 ? 'adv' : edge < 0 ? 'dis' : 'none';
  return (
    <div class="action-roll-group" data-edge={state} role="group" aria-label={`${name} roll`}>
      {allowEdge && (
        <button type="button" class="edge-btn edge-dis" onClick={() => setEdge(Math.max(-6, edge - 1))} disabled={edge <= -6} aria-label={`Dis: add disadvantage to ${name}${edge > 0 ? ' (cancels one advantage)' : ''}`} title="Disadvantage: +1 die, drop highest. Cancels one advantage.">
          Dis
        </button>
      )}
      <button type="button" class="roll-pill" onClick={onRoll} aria-label={`Roll ${name}: ${notation}${edge ? `, ${edgeLabel(edge)}` : ''}`} title={`Roll ${notation}${edge ? ` with ${edgeLabel(edge).toLowerCase()}` : ''}`}>
        <Dice5 size={14} />
        <span>{notation}</span>
        {edge !== 0 && <b class="edge-badge">{edgeLabel(edge)}</b>}
      </button>
      {allowEdge && (
        <button type="button" class="edge-btn edge-adv" onClick={() => setEdge(Math.min(6, edge + 1))} disabled={edge >= 6} aria-label={`Adv: add advantage to ${name}${edge < 0 ? ' (cancels one disadvantage)' : ''}`} title="Advantage: +1 die, drop lowest. Cancels one disadvantage.">
          Adv
        </button>
      )}
    </div>
  );
}

/** Minions attacking one hero roll together: one die each, 1s miss, the rest
 * add up into a single attack. Preset to the pack's minions still to act;
 * − and + change only this roll. `max` 0 means none are standing;
 * `extra` means all have acted, so the roll marks no one. */
export function HordeRoll({ name, notation, count, max, extra, setCount, onRoll }: { name: string; notation: string; count: number; max: number; extra?: boolean; setCount: (count: number) => void; onRoll: () => void }) {
  const done = max < 1;
  const each = /^1d\d+$/i.test(notation) ? notation.slice(1) : /^d\d+$/i.test(notation) ? notation : `(${notation})`;
  return (
    <div class="action-roll-group horde-roll" data-done={done || undefined} data-extra={extra || undefined} role="group" aria-label={`${name}: minions attacking together`}>
      {!done && (
        <button type="button" class="edge-btn" onClick={() => setCount(count - 1)} disabled={count <= 1} aria-label={`One fewer minion using ${name}`} title="One fewer minion in this attack">
          <Minus size={14} />
        </button>
      )}
      <button
        type="button"
        class="roll-pill"
        onClick={onRoll}
        disabled={done}
        aria-label={done ? `${name}: no minions standing` : `Roll ${name} for ${count} ${count === 1 ? 'minion' : 'minions'}: ${count} × ${notation}, each 1 misses${extra ? ', no turns marked' : ''}`}
        title={done ? 'No minions standing here' : `${count} attacking together: ${count} × ${notation}, each 1 misses, the rest add up${extra ? '. Everyone has acted, so no turns are marked.' : ''}`}
      >
        <Dice5 size={14} />
        <span>{done ? 'None left' : `${count}× ${each}`}</span>
      </button>
      {!done && (
        <button type="button" class="edge-btn" onClick={() => setCount(count + 1)} disabled={count >= max} aria-label={`One more minion using ${name}`} title="One more minion in this attack">
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}
