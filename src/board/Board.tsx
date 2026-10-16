import { Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronLeft, ChevronRight, Swords } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import type { NemesisCard } from '../lib/board.ts';
import { reorderStatblocks, sortByOrder } from '../lib/board.ts';
import { formatLevel, monsterHp } from '../lib/rules.ts';
import { useApp } from '../app/context.ts';
import { kindLabel, scrollBehavior } from '../app/ui.ts';
import { Lane } from './Lane.tsx';

export type BoardLane = { monster: Monster; cards: NemesisCard[] };

/** The run board: stat block lanes side by side, scrolling sideways. Monsters
 *  dragged from the library and lane grips drop between lanes, with a preview
 *  of where they land. Shift+←/→ and the edge arrows step one lane at a time. */
export function Board({ lanes }: { lanes: BoardLane[] }) {
  const { encounter, lookup, patchEncounter, addMonster, dragging, dropTarget, setDropTarget, clearDrag } = useApp();
  const boardRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  function scrollBoard(direction: -1 | 1) {
    const board = boardRef.current;
    const lane = board?.querySelector<HTMLElement>('.monster-lane');
    if (!board) return;
    const step = lane ? lane.offsetWidth + 14 : board.clientWidth * 0.8;
    board.scrollBy({ left: direction * step, behavior: scrollBehavior() });
  }
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (!event.shiftKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      scrollBoard(event.key === 'ArrowLeft' ? -1 : 1);
    };
    document.addEventListener('keydown', keys);
    return () => document.removeEventListener('keydown', keys);
  }, []);
  // Sheets overflow sideways: keep edge hints in sync, and let a plain wheel
  // over name bars or gaps travel along the row (Shift+wheel works anywhere).
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const update = () =>
      setEdges((previous) => {
        const left = board.scrollLeft > 4,
          right = board.scrollLeft + board.clientWidth < board.scrollWidth - 4;
        return previous.left === left && previous.right === right ? previous : { left, right };
      });
    const wheel = (event: WheelEvent) => {
      if (event.shiftKey || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (board.scrollWidth <= board.clientWidth) return;
      if ((event.target as Element).closest('.lane-scroll')) return;
      event.preventDefault();
      board.scrollLeft += event.deltaY;
    };
    update();
    board.addEventListener('scroll', update, { passive: true });
    board.addEventListener('wheel', wheel, { passive: false });
    const observer = new ResizeObserver(update);
    observer.observe(board);
    Array.from(board.children).forEach((child) => observer.observe(child));
    return () => {
      board.removeEventListener('scroll', update);
      board.removeEventListener('wheel', wheel);
      observer.disconnect();
    };
  }, [encounter.id, encounter.cards.length, encounter.order?.join()]);

  const laneIds = (cards: NemesisCard[], order?: string[]) => sortByOrder([...new Set(cards.map((c) => c.monsterId))], order);
  // Dropping a lane before its right-hand neighbour (or at the end when it is already last)
  // leaves it in place, so fold those slots onto the lane itself: no preview, no layout shift.
  function laneSlot(moving: string, raw: string) {
    const i = lanes.findIndex((lane) => lane.monster.id === moving);
    if (i < 0) return raw;
    return raw === (lanes[i + 1]?.monster.id ?? 'end') ? moving : raw;
  }
  // Pick the slot from the pointer's x against lane midpoints rather than the element under it,
  // so gaps between lanes don't flip the target to 'end' and the preview can't jitter.
  function slotAt(moving: string, clientX: number) {
    const sections = boardRef.current?.querySelectorAll<HTMLElement>('section.monster-lane[data-lane-id]') ?? [];
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      if (clientX < box.left + box.width / 2) return laneSlot(moving, section.dataset.laneId!);
    }
    return laneSlot(moving, 'end');
  }
  function dragOver(event: DragEvent) {
    const kinds = Array.from(event.dataTransfer?.types ?? []);
    if (!kinds.includes('text/plain')) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = dragging?.kind === 'lane' ? 'move' : 'copy';
    if (!dragging) return;
    const next = slotAt(dragging.id, event.clientX);
    if (dropTarget !== next) setDropTarget(next);
    const board = boardRef.current;
    if (board) {
      const box = board.getBoundingClientRect();
      if (event.clientX < box.left + 46) board.scrollLeft -= 22;
      if (event.clientX > box.right - 46) board.scrollLeft += 22;
    }
  }
  function drop(event: DragEvent) {
    const payload = event.dataTransfer?.getData('text/plain') ?? '';
    if (!payload.startsWith('monster:') && !payload.startsWith('lane:')) return;
    event.preventDefault();
    if (payload.startsWith('monster:')) {
      const monster = lookup.get(payload.slice(8));
      const slot = monster && slotAt(monster.id, event.clientX);
      if (monster) addMonster(monster, undefined, 1, slot === 'end' ? undefined : slot);
    } else {
      const moving = payload.slice(5);
      const slot = slotAt(moving, event.clientX);
      const label = `Moved ${lookup.get(moving)?.name ?? dragging?.name ?? 'stat block'}`;
      if (slot === 'end') patchEncounter(label, (e) => ({ ...e, order: [...laneIds(e.cards, e.order).filter((id) => id !== moving), moving] }));
      else if (slot !== moving) patchEncounter(label, (e) => ({ ...e, order: reorderStatblocks(laneIds(e.cards, e.order), moving, slot) }));
    }
    clearDrag();
  }

  return (
    <div class="board-frame" data-left={edges.left} data-right={edges.right}>
      {edges.left && (
        <button class="board-nav prev" onClick={() => scrollBoard(-1)} aria-label="Scroll to previous stat blocks" title="Previous stat blocks (Shift+←)">
          <ChevronLeft size={24} />
        </button>
      )}
      {edges.right && (
        <button class="board-nav next" onClick={() => scrollBoard(1)} aria-label="Scroll to next stat blocks" title="More stat blocks (Shift+→)">
          <ChevronRight size={24} />
        </button>
      )}
      <div class={`run-board ${dragging ? 'is-dragging' : ''}`} ref={boardRef} onDragOver={dragOver} onDrop={drop} onDragEnd={clearDrag}>
        {dragging && (
          <div class="drop-instruction" aria-live="polite">
            {dragging.kind === 'monster' ? 'Drop to add a creature · positions preview as you drag' : 'Drop to reorder this stat block'}
          </div>
        )}
        {lanes.length === 0 && (
          <div class={`empty-combat ${dragging?.kind === 'monster' ? 'drop-empty' : ''}`}>
            <div class="empty-drop-preview">{dragging?.kind === 'monster' ? `+ Add ${dragging.name}` : ''}</div>
            <Swords size={32} />
            <h3>No adversaries yet</h3>
            <span class="empty-hint">
              Select <b>Add monsters</b> above, or press <kbd>/</kbd>.
            </span>
          </div>
        )}
        {lanes.map(({ monster, cards }) => (
          <Fragment key={monster.id}>
            {dragging && dropTarget === monster.id && dragging.id !== monster.id && <DropPreview before={monster.id} />}
            <Lane monster={monster} cards={cards} />
          </Fragment>
        ))}
        {dragging && dropTarget === 'end' && <DropPreview />}
      </div>
    </div>
  );
}

/** Where a dragged monster or lane will land. */
function DropPreview({ before }: { before?: string }) {
  const { encounter, lookup, dragging } = useApp();
  if (!dragging) return null;
  const monster = lookup.get(dragging.id);
  const quantity = dragging.kind === 'lane' ? encounter.cards.filter((card) => card.monsterId === dragging.id).length : 1;
  return (
    <div class={`lane-insert-preview ${before ? '' : 'at-end'}`} data-lane-id={before} role="status" aria-label={`${dragging.kind === 'monster' ? 'Add' : 'Move'} ${dragging.name} at this position`}>
      <div class="insert-preview-band">
        <strong>{dragging.name}</strong>
        <span>{monster ? (monster.kind === 'minion' ? 'MINION' : `LV ${formatLevel(monster.level)}`) : ''}</span>
      </div>
      <div class="insert-preview-tracker">
        <span>
          {quantity} {quantity === 1 ? 'creature' : 'creatures'}
        </span>
        <strong>{monster ? `${monsterHp(monster, encounter.heroes.length)} HP each` : ''}</strong>
      </div>
      {monster && (
        <div class="insert-preview-meta">
          {kindLabel(monster)}
          {monster.armor !== 'none' && ` · ${monster.armor === 'medium' ? 'M' : 'H'}`}
        </div>
      )}
      <div class="insert-preview-hint">Release to {dragging.kind === 'monster' ? 'add here' : 'reorder here'}</div>
    </div>
  );
}
