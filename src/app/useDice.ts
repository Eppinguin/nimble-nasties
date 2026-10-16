import { useState } from 'preact/hooks';
import type { Monster, RollResult } from '../lib/types.ts';
import { rollDice } from '../lib/dice.ts';
import type { RollReceipt } from './context.ts';

/** The dice: rolls from stat blocks and the quick-roll field, the latest result for
 *  the toolbar, and the last 40 for the tray. A bad expression is reported, not thrown. */
export function useDice(notify: (message: string) => void) {
  const [rolls, setRolls] = useState<RollResult[]>([]);
  const [receipt, setReceipt] = useState<RollReceipt | null>(null);
  const [open, setOpen] = useState(false);
  const [quickRoll, setQuickRoll] = useState('1d20');
  const [quickEdge, setQuickEdge] = useState(0);

  function showRoll(results: RollResult[], next: RollReceipt) {
    setReceipt(next);
    setRolls((old) => [...results, ...old].slice(0, 40));
  }
  function roll(expression: string, label: string, monster?: Monster, repeat = 1, edgeOverride?: number) {
    try {
      const edge = Math.max(-10, Math.min(10, edgeOverride ?? 0));
      const results = Array.from({ length: repeat }, (_, i) =>
        rollDice(expression, {
          label: repeat > 1 ? `${label} · ${i + 1}/${repeat}` : label,
          advantage: edge,
          minion: monster?.kind === 'minion',
          level: monster?.level,
        }),
      );
      const summary = results.map((r) => (r.isMiss ? 'Miss' : r.isCritical ? `${r.total}!` : String(r.total))).join(' / ');
      const status = results.some((r) => r.isCritical) ? 'critical' : results.every((r) => r.isMiss) ? 'miss' : 'normal';
      showRoll([...results].reverse(), { label: `${label}${edge && monster?.kind !== 'minion' ? ` (${edge > 0 ? `Adv ${edge}` : `Dis ${-edge}`})` : ''}`, summary, status });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Invalid dice notation');
    }
  }
  function rollAction(monster: Monster, action: Monster['actions'][number], edge = 0) {
    if (!action.notation) return;
    const count = /(?:\(|\s)([234])\s*[×x]\)?/i.exec(action.name);
    roll(action.notation, `${monster.name} · ${action.name}`, monster, count ? Number(count[1]) : 1, edge);
  }
  function quickRollNow() {
    roll(quickRoll, 'Quick roll', undefined, 1, quickEdge);
    setQuickEdge(0);
  }

  return { rolls, receipt, open, setOpen, quickRoll, setQuickRoll, quickEdge, setQuickEdge, showRoll, roll, rollAction, quickRollNow };
}
