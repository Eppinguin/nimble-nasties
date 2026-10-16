import { ArrowRight, ChevronLeft, Dice5, Redo2, Undo2 } from 'lucide-preact';
import type { RollReceipt } from '../app/context.ts';
import { redoKeys, undoKeys } from '../app/ui.ts';

/** The combat strip: round counter, how many have acted, next round, undo/redo and the latest roll. */
export function CombatToolbar({
  round,
  acted,
  inPlay,
  hasCreatures,
  undoLabel,
  redoLabel,
  canUndo,
  canRedo,
  receipt,
  onPreviousRound,
  onNextRound,
  onUndo,
  onRedo,
  onDice,
}: {
  round: number;
  acted: number;
  inPlay: number;
  hasCreatures: boolean;
  undoLabel?: string;
  redoLabel?: string;
  canUndo: boolean;
  canRedo: boolean;
  receipt: RollReceipt | null;
  onPreviousRound: () => void;
  onNextRound: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDice: () => void;
}) {
  return (
    <section class="combat-toolbar" aria-label="Combat controls">
      <div class="round-control">
        <button class="round-back" onClick={onPreviousRound} disabled={round <= 1} aria-label={`Back to round ${round - 1}`} title={round > 1 ? `Back to round ${round - 1} · HP stays as it is` : 'Already at round 1'}>
          <ChevronLeft size={18} />
        </button>
        <span>Round</span>
        <strong>{round}</strong>
      </div>
      <div class="acted-status" title={`${acted} of ${inPlay} active creatures have acted`} data-done={inPlay > 0 && acted === inPlay}>
        <span class="acted-meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${inPlay ? acted / inPlay : 0})` }} />
        </span>
        <strong>
          {acted}/{inPlay}
        </strong>
        <span>acted</span>
      </div>
      <button class="solid compact next-round" onClick={onNextRound} disabled={!hasCreatures} title={hasCreatures ? 'Advance one round and clear all turn marks' : 'Add monsters to start the fight'}>
        Next round <ArrowRight size={15} />
      </button>
      <div class="history-controls" role="group" aria-label="Undo history">
        <button onClick={onUndo} disabled={!canUndo} aria-label={canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'} title={canUndo ? `Undo: ${undoLabel} (${undoKeys})` : 'Nothing to undo'}>
          <Undo2 size={17} />
        </button>
        <button class="history-redo" onClick={onRedo} disabled={!canRedo} aria-label={canRedo ? `Redo: ${redoLabel}` : 'Nothing to redo'} title={canRedo ? `Redo: ${redoLabel} (${redoKeys})` : 'Nothing to redo'}>
          <Redo2 size={17} />
        </button>
      </div>
      <button
        class="outline compact roll-trigger"
        data-roll-status={receipt?.status ?? 'normal'}
        onClick={onDice}
        title={receipt ? `${receipt.label}: ${receipt.summary} · Open dice history (D)` : 'Open dice tray (D)'}
        aria-label={receipt ? `Latest roll ${receipt.label}: ${receipt.summary}. Open dice history` : 'Open dice tray'}
        aria-keyshortcuts="d"
        aria-live="polite"
      >
        <Dice5 size={15} />
        {receipt ? (
          <>
            <span class="recent-roll-label">{receipt.label.split(' · ').at(-1)}</span>
            <strong class="roll-total">{receipt.summary}</strong>
          </>
        ) : (
          <span class="roll-word">Dice</span>
        )}
      </button>
    </section>
  );
}
