import { useState } from 'preact/hooks';

/** Per-lane view toggles: defeated rows shown, long roster expanded, minion rows shown. */
export type LaneFlag = 'defeated' | 'expanded' | 'rows';

/** The board's view state, shared by all lanes and keyed by monster (and pack, action)
 *  ids, so it outlives a lane leaving the board: switching encounters and back keeps it.
 *  Only one lane is in move mode, one pack menu and one condition picker open at a time. */
export function useBoardUi() {
  const [laneUi, setLaneUi] = useState<Record<string, Partial<Record<LaneFlag, boolean>>>>({});
  const [conditionFor, setConditionFor] = useState<string | null>(null);
  // Reshaping packs: the lane in move mode and the minions picked.
  const [arrange, setArrange] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  // The pack menu open, as `monsterId|packId`.
  const [packMenu, setPackMenu] = useState<string | null>(null);
  // Adv/Dis set on an action's roll pill until it rolls, as `scope|actionId`.
  const [edges, setEdges] = useState<Record<string, number>>({});
  // Minions attacking the current hero, as `monsterId|packId|actionId`; unset follows who's left to act.
  const [attackers, setAttackers] = useState<Record<string, number>>({});
  return {
    laneUi,
    toggleLaneUi: (monsterId: string, flag: LaneFlag) => setLaneUi((all) => ({ ...all, [monsterId]: { ...all[monsterId], [flag]: !all[monsterId]?.[flag] } })),
    expandLane: (monsterId: string) => setLaneUi((all) => ({ ...all, [monsterId]: { ...all[monsterId], expanded: true } })),
    conditionFor,
    setConditionFor,
    arrange,
    setArrange,
    picked,
    setPicked,
    packMenu,
    setPackMenu,
    edges,
    setEdge: (key: string, edge: number) => setEdges((all) => ({ ...all, [key]: edge })),
    attackers,
    setAttackers: (key: string, count: number) => setAttackers((all) => ({ ...all, [key]: count })),
    /** A pack rolled: its counts go back to following who's left to act. */
    resetAttackers: (prefix: string) => setAttackers((all) => Object.fromEntries(Object.entries(all).filter(([key]) => !key.startsWith(prefix)))),
  };
}
export type BoardUi = ReturnType<typeof useBoardUi>;
