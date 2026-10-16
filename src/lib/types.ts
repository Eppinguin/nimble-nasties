export type Armor = 'none' | 'medium' | 'heavy';
export type MonsterKind = 'standard' | 'minion' | 'legendary' | 'team';
export type StatblockEdition = 'first-printing' | 'unknown';

export interface MonsterAction {
  id: string;
  name: string;
  notation?: string;
  description: string;
  range?: string;
}

/** Set on a minion stat block derived from a summoner's text. */
export interface MonsterSummon {
  by: string;
  byName: string;
  die?: string;
  boost?: { die: string; phase: 'bloodied' | 'laststand' };
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  kind: MonsterKind;
  armor: Armor;
  hp: number | null;
  lastStand?: number;
  family: string;
  role: string;
  size?: string;
  speed?: number;
  saves?: string;
  traits: { name: string; description: string }[];
  actions: MonsterAction[];
  actionInstructions?: string;
  bloodied?: string;
  lastStandText?: string;
  source: 'official' | 'homebrew';
  edition: StatblockEdition;
  sourceUrl?: string;
  /** Who made a homebrew imported from another site, for credit. */
  author?: string;
  summon?: MonsterSummon;
  /** Homebrew built in the Monster Forge: the controls it was built with. */
  forge?: import('./forge.ts').ForgeDraft;
  /** Homebrew only, kept in this browser: where it came from and when it was last saved. */
  origin?: HomebrewOrigin;
  edited?: string;
}

export type HomebrewOrigin = 'forge' | 'link' | 'file' | 'nexus';

export interface Hero {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  defense: number;
}

export interface EncounterMember {
  id: string;
  monsterId: string;
  count: number;
}

/** One die as it landed. `primary` decides miss and crit; `dropped` lost to Adv/Dis;
 *  `exploded` was added by a critical. */
export interface RolledDie {
  value: number;
  sides: number;
  state?: 'primary' | 'dropped' | 'exploded';
}

/** A roll read part by part, so the dice tray can lay out every die. */
export type RollPart = { kind: 'dice'; sign: 1 | -1; dice: RolledDie[] } | { kind: 'explosion'; dice: RolledDie[] } | { kind: 'flat'; value: number; critOnly?: boolean } | { kind: 'minions'; hits: { value: number; miss: boolean }[] };

export interface RollResult {
  label: string;
  notation: string;
  breakdown: string;
  /** Structured breakdown; older or hand-made results may lack it. */
  parts?: RollPart[];
  /** Net Adv (positive) or Dis (negative) actually applied. */
  edge?: number;
  total: number;
  isCritical: boolean;
  isMiss: boolean;
  date: string;
}
