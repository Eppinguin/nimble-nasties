import type { Monster } from '../lib/types.ts';
import type { NemesisCard } from '../lib/board.ts';

export const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z\d]+/g, '-')
    .replace(/^-|-$/g, '');
export const clamp = (number: number, min: number, max: number) => Math.max(min, Math.min(max, number));
export const edgeLabel = (edge: number) => (edge > 0 ? `Adv ${edge}` : edge < 0 ? `Dis ${-edge}` : 'Normal');
export const kindLabel = (m: Monster) => (m.kind === 'legendary' ? 'Legendary' : m.kind === 'minion' ? 'Minion' : 'Standard');
export const levelOrMinion = (m: Monster, level: string) => (m.kind === 'minion' ? 'Minion' : `Level ${level}`);

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform);
export const undoKeys = isMac ? '⌘Z' : 'Ctrl+Z';
export const redoKeys = isMac ? '⇧⌘Z' : 'Ctrl+Y';

/** The phone layout: one snapped sheet at a time, drawers stack over the board. */
export const isPhone = () => window.matchMedia('(max-width:790px)').matches;
export const scrollBehavior = (): ScrollBehavior => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

export type HpState = 'down' | 'laststand' | 'bloodied' | 'healthy';
export function hpStateOf(card: NemesisCard): HpState {
  if (card.lane === 'defeated') return 'down';
  if (card.hp === 0 && (card.lastStandRemaining ?? 0) > 0) return 'laststand';
  return card.maxHp > 1 && card.hp <= card.maxHp / 2 ? 'bloodied' : 'healthy';
}
