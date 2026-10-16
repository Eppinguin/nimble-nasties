import type { Armor, Monster, MonsterAction } from './types.ts';

/** The Monster Forge: homebrew built on the GMG v1 building rules.
 *  - Monster Builder (p. 29): one table row per level; mix rows for a glass cannon
 *    (damage from N rows higher, HP from N rows lower) or a tank (the reverse).
 *    Each special ability costs one step: lower HP or damage a row, or the monster
 *    counts as one level stronger.
 *  - What die size to use? (p. 29): d8 by default, any die if damage per round holds.
 *  - Default monster stats (p. 24): medium, unarmored, speed 6, reach 1, d20 saves.
 *  - Flavorful monster abilities (p. 30).
 */

export interface LevelRow {
  level: number;
  label: string;
  hp: [none: number, medium: number, heavy: number];
  damage: number;
  one: string;
  two?: string;
  dc: number;
}

export const LEVEL_ROWS: LevelRow[] = [
  { level: 1 / 4, label: '¼', hp: [12, 9, 7], damage: 3, one: '1d4+1', dc: 9 },
  { level: 1 / 3, label: '⅓', hp: [15, 11, 8], damage: 5, one: '1d6+2', dc: 9 },
  { level: 1 / 2, label: '½', hp: [18, 15, 11], damage: 7, one: '1d6+3', dc: 10 },
  { level: 1, label: '1', hp: [26, 20, 16], damage: 11, one: '2d8+2', two: '1d8+1', dc: 10 },
  { level: 2, label: '2', hp: [34, 27, 20], damage: 13, one: '2d8+4', two: '1d8+3', dc: 11 },
  { level: 3, label: '3', hp: [41, 33, 25], damage: 15, one: '2d8+6', two: '1d8+4', dc: 11 },
  { level: 4, label: '4', hp: [49, 39, 29], damage: 18, one: '2d8+9', two: '1d8+5', dc: 12 },
  { level: 5, label: '5', hp: [58, 46, 35], damage: 19, one: '2d8+10', two: '1d8+6', dc: 12 },
  { level: 6, label: '6', hp: [68, 54, 41], damage: 21, one: '2d8+12', two: '1d8+7', dc: 13 },
  { level: 7, label: '7', hp: [79, 63, 47], damage: 24, one: '3d8+10', two: '2d8+4', dc: 13 },
  { level: 8, label: '8', hp: [91, 73, 55], damage: 26, one: '3d8+12', two: '2d8+5', dc: 14 },
  { level: 9, label: '9', hp: [104, 83, 62], damage: 28, one: '4d8+10', two: '2d8+6', dc: 14 },
  { level: 10, label: '10', hp: [118, 94, 71], damage: 30, one: '4d8+12', two: '2d8+7', dc: 15 },
  { level: 11, label: '11', hp: [133, 106, 80], damage: 33, one: '5d8+11', two: '3d8+3', dc: 15 },
  { level: 12, label: '12', hp: [149, 119, 89], damage: 35, one: '5d8+13', two: '3d8+4', dc: 16 },
  { level: 13, label: '13', hp: [166, 132, 100], damage: 38, one: '6d8+11', two: '3d8+6', dc: 16 },
  { level: 14, label: '14', hp: [184, 147, 110], damage: 40, one: '6d8+13', two: '3d8+7', dc: 17 },
  { level: 15, label: '15', hp: [203, 162, 122], damage: 43, one: '7d8+11', two: '3d8+8', dc: 17 },
  { level: 16, label: '16', hp: [223, 178, 134], damage: 45, one: '7d8+13', two: '4d8+5', dc: 18 },
  { level: 17, label: '17', hp: [244, 195, 146], damage: 48, one: '8d8+12', two: '4d8+6', dc: 18 },
  { level: 18, label: '18', hp: [266, 213, 160], damage: 50, one: '8d8+14', two: '4d8+7', dc: 19 },
  { level: 19, label: '19', hp: [289, 231, 173], damage: 52, one: '9d8+12', two: '4d8+8', dc: 19 },
  { level: 20, label: '20', hp: [313, 250, 189], damage: 54, one: '9d8+13', two: '4d8+9', dc: 20 },
];
export const LAST_ROW = LEVEL_ROWS.length - 1;
const ARMOR_COLUMN: Record<Armor, 0 | 1 | 2> = { none: 0, medium: 1, heavy: 2 };

export type Die = 4 | 6 | 8 | 10 | 12 | 20;
export const DICE: { die: Die; theme: string; note: string }[] = [
  { die: 4, theme: 'Undead', note: 'Slow, with big bonus damage' },
  { die: 6, theme: 'Goblins', note: 'Small and chaotic: misses and crits' },
  { die: 8, theme: 'Humans', note: 'Balanced and reliable' },
  { die: 10, theme: 'Beasts', note: 'Stronger than humans' },
  { die: 12, theme: 'Giants', note: 'Superhumanly strong and accurate' },
  { die: 20, theme: 'Mightiest', note: 'Massive damage' },
];

export type AbilityTag = 'defense' | 'offense' | 'movement' | 'control';
export interface Ability {
  id: string;
  name: string;
  text: string;
  tag: AbilityTag;
}

/** GMG v1 p. 30, worded for the sheet. `{dc}` becomes the row's save DC. */
export const ABILITIES: Ability[] = [
  { id: 'acid-blood', name: 'Acid Blood', tag: 'defense', text: 'Melee attackers take half the HP you lose in return, as acid damage.' },
  { id: 'aggressive', name: 'Aggressive', tag: 'movement', text: '+2 speed while moving toward enemies.' },
  { id: 'blinding-spit', name: 'Blinding Spit', tag: 'control', text: 'Spit at a target within range: DC {dc} save or Blinded for 1 round.' },
  { id: 'bloodthirsty', name: 'Bloodthirsty', tag: 'offense', text: 'Advantage on attacks against Bloodied targets.' },
  { id: 'brute', name: 'Brute', tag: 'offense', text: 'Attacks also knock the target back a number of spaces equal to the primary die rolled.' },
  { id: 'brawler', name: 'Brawler', tag: 'offense', text: 'Deals extra damage, but can only attack in melee.' },
  { id: 'burning-aura', name: 'Burning Aura', tag: 'offense', text: 'Creatures that start their turn adjacent to you take 1d6 fire damage.' },
  { id: 'climbing', name: 'Climbing', tag: 'movement', text: 'Traverse walls and ceilings normally.' },
  { id: 'controlling', name: 'Controlling', tag: 'control', text: 'Create difficult terrain; immune to difficult terrain.' },
  { id: 'heavy-blows', name: 'Heavy Blows', tag: 'offense', text: 'Attacks also Daze the target. (Or Disgusting, or Venomous.)' },
  { id: 'disintegrating-armor', name: 'Disintegrating Armor', tag: 'defense', text: 'Starts with Heavy Armor. Each crit degrades it a step: Medium, then none.' },
  { id: 'doom', name: 'Doom', tag: 'offense', text: 'Attacks also Wound the target.' },
  { id: 'explosive-death', name: 'Explosive Death', tag: 'offense', text: 'On Death: explode, dealing 2d6 damage to creatures within reach.' },
  { id: 'fast', name: 'Fast', tag: 'defense', text: 'Reaction (1/round): force a reroll with disadvantage on an attack.' },
  { id: 'fearsome', name: 'Fearsome', tag: 'control', text: '1/encounter: enemies within range are Frightened on a failed DC {dc} WIL save.' },
  { id: 'flying', name: 'Flying', tag: 'movement', text: 'Flying speed; immune to Opportunity Attacks. When crit, may fall (1d6 damage per 10 ft. fallen, lands Prone).' },
  { id: 'formation', name: 'Formation', tag: 'defense', text: 'Armor increases 1 step for each adjacent ally (none, Medium, Heavy).' },
  { id: 'frenzied', name: 'Frenzied', tag: 'offense', text: 'Deals extra damage or moves faster while damaged.' },
  { id: 'grappler', name: 'Grappler', tag: 'control', text: 'On hit: Grapple.' },
  { id: 'gravity-manipulator', name: 'Gravity Manipulator', tag: 'control', text: 'Pull or push enemies within reach.' },
  { id: 'hates-the-light', name: 'Hates the Light', tag: 'offense', text: 'Attacks the hero holding a light.' },
  { id: 'hypnotic-gaze', name: 'Hypnotic Gaze', tag: 'control', text: 'Enemies make a DC {dc} WIL save or are Confused for 1 round.' },
  { id: 'invulnerable', name: 'Invulnerable', tag: 'defense', text: 'Immune to damage until crit.' },
  { id: 'mounted', name: 'Mounted', tag: 'movement', text: 'Moves faster, and deals extra damage after moving toward an enemy.' },
  { id: 'obstinate', name: 'Obstinate', tag: 'offense', text: 'When attacking a target with disadvantage, treat the roll as if it had advantage instead.' },
  { id: 'pack-tactics', name: 'Pack Tactics', tag: 'offense', text: 'Advantage on attacks when an ally is adjacent to the target.' },
  { id: 'parry', name: 'Parry', tag: 'defense', text: 'Attacks against you miss on a 1 or 2.' },
  { id: 'ranged', name: 'Ranged', tag: 'offense', text: 'Deals extra damage, but can only attack at range.' },
  { id: 'retaliate', name: 'Retaliate', tag: 'offense', text: 'Attack the first creature that attacks you in melee each round.' },
  { id: 'savage', name: 'Savage', tag: 'offense', text: 'Always crits Grappled creatures.' },
  { id: 'shifty', name: 'Shifty', tag: 'movement', text: 'Can move after being attacked.' },
  { id: 'silencer', name: 'Silencer', tag: 'control', text: 'Attacks Silence enemies: they cannot cast spells or do anything else that needs a voice.' },
  { id: 'sneak', name: 'Sneak', tag: 'defense', text: 'You are invisible until you attack.' },
  { id: 'spiked', name: 'Spiked', tag: 'defense', text: 'When hit by a melee attack, the attacker takes 1d4 piercing damage in return.' },
  { id: 'standard-bearer', name: 'Standard Bearer', tag: 'control', text: 'Nearby allies take 2 less damage, or deal 2 more.' },
  { id: 'undying', name: 'Undying', tag: 'defense', text: 'The first time you would die, you have 1 HP instead.' },
  { id: 'summoner', name: 'Summoner', tag: 'control', text: 'Each round, summon 1 {minion} minion (d6).' },
  { id: 'tricky', name: 'Tricky', tag: 'movement', text: 'Swap places with an ally or enemy.' },
  { id: 'vicious', name: 'Vicious', tag: 'offense', text: 'Crits are Vicious (roll 1 additional die).' },
  { id: 'warping-touch', name: 'Warping Touch', tag: 'control', text: 'On hit: teleport the target 3 spaces.' },
  { id: 'webslinger', name: 'Webslinger', tag: 'control', text: 'On hit or crit: may Immobilize the target with webs.' },
];
export const abilityById = new Map(ABILITIES.map((a) => [a.id, a]));

export type ForgeKind = 'standard' | 'minion' | 'legendary';
export type PayWith = 'level' | 'hp' | 'damage';
export type SaveEdge = -1 | 0 | 1 | 2;
export const SAVE_STATS = ['STR', 'DEX', 'INT', 'WIL'] as const;
export const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;

/** `own`: came with a remixed stat block, whose level already pays for it. */
export interface ForgeTrait {
  id: string;
  abilityId?: string;
  name: string;
  text?: string;
  own?: boolean;
}
/** `notation`: 'auto' rolls the table's damage on the chosen die; '' has no roll. */
export interface ForgeAction {
  id: string;
  name: string;
  notation: 'auto' | string;
  description: string;
  range?: string;
}

export interface ForgeDraft {
  name: string;
  kind: ForgeKind;
  row: number;
  armor: Armor;
  /** + glass cannon (damage up, HP down), − tank. Rows shifted each way. */
  shape: number;
  die: Die;
  twoAttacks: boolean;
  payWith: PayWith;
  hp?: number;
  family: string;
  size: string;
  speed: number;
  saves: Partial<Record<(typeof SAVE_STATS)[number], SaveEdge>>;
  traits: ForgeTrait[];
  actions: ForgeAction[];
  actionInstructions?: string;
  bloodied?: string;
  lastStandText?: string;
  lastStand?: number;
}

const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clampRow = (row: number) => Math.max(0, Math.min(LAST_ROW, Math.round(row)));

export function blankDraft(row = 4): ForgeDraft {
  return {
    name: '',
    kind: 'standard',
    row,
    armor: 'none',
    shape: 0,
    die: 8,
    twoAttacks: false,
    payWith: 'level',
    family: 'Homebrew',
    size: 'Medium',
    speed: 6,
    saves: {},
    traits: [],
    actions: [{ id: uid(), name: 'Strike', notation: 'auto', description: '' }],
  };
}

/** Where each number comes from on the table, after shape and ability costs. */
export function forgeMath(draft: ForgeDraft) {
  const abilities = draft.traits.filter((trait) => !trait.own).length;
  const paid = (kind: PayWith) => (draft.payWith === kind ? abilities : 0);
  const hpRow = clampRow(draft.row - draft.shape - paid('hp'));
  const damageRow = clampRow(draft.row + draft.shape - paid('damage'));
  const levelRow = clampRow(draft.row + paid('level'));
  const minion = draft.kind === 'minion';
  const tableHp = minion ? 1 : LEVEL_ROWS[hpRow].hp[ARMOR_COLUMN[draft.armor]];
  const hp = minion ? 1 : (draft.hp ?? tableHp);
  const damage = LEVEL_ROWS[damageRow].damage;
  const attacks = draft.twoAttacks && !minion ? 2 : 1;
  const notation = minion ? `1d${draft.die}` : attackDice(damageRow, draft.die, attacks);
  // A big die on a weak row can't stay near the table's damage: say so.
  const overshoot = !minion && averageOf(notation) * attacks > damage * 1.3 + 1;
  return { hpRow, damageRow, levelRow, level: LEVEL_ROWS[levelRow].level, tableHp, hp, damage, attacks, notation, overshoot, dc: LEVEL_ROWS[levelRow].dc };
}

export function averageOf(notation: string): number {
  const match = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(notation);
  return match ? (Number(match[1]) * (Number(match[2]) + 1)) / 2 + Number(match[3] ?? 0) : 0;
}

/** Same damage per round on any die. d8 uses the book's own sample dice;
 *  small dice lean on bonus damage, big dice on the roll, as the GMG suggests. */
export function attackDice(row: number, die: Die, attacks: 1 | 2 | number): string {
  const line = LEVEL_ROWS[clampRow(row)];
  if (die === 8) {
    if (attacks === 2 && line.two) return line.two;
    if (attacks === 1) return line.one;
  }
  const share: Record<Die, number> = { 4: 0.4, 6: 0.65, 8: 0.75, 10: 0.75, 12: 0.8, 20: 0.9 };
  const per = line.damage / attacks;
  const average = (die + 1) / 2;
  let count = Math.max(1, Math.round((per * share[die]) / average));
  while (count > 1 && count * average > per) count--;
  const bonus = Math.max(0, Math.round(per - count * average));
  return `${count}d${die}${bonus ? `+${bonus}` : ''}`;
}

export function traitText(trait: ForgeTrait, dc: number, name: string): string {
  if (trait.text !== undefined) return trait.text;
  const ability = trait.abilityId ? abilityById.get(trait.abilityId) : undefined;
  return (ability?.text ?? '').replace('{dc}', String(dc)).replace('{minion}', `${(name.trim().split(/\s+/).at(-1) || 'lesser').toLowerCase().replace(/[^a-z'-]/g, '') || 'lesser'} spawn`);
}

export function savesText(saves: ForgeDraft['saves']): string | undefined {
  const marks = SAVE_STATS.filter((stat) => saves[stat]).map((stat) => {
    const edge = saves[stat] ?? 0;
    return `${stat}${edge > 0 ? '+'.repeat(edge) : '−'}`;
  });
  return marks.length ? marks.join(' · ') : undefined;
}

export function draftToMonster(draft: ForgeDraft, id: string): Monster {
  const math = forgeMath(draft);
  const name = draft.name.trim() || 'Nameless Nasty';
  const actions: MonsterAction[] = draft.actions.map((action, index) => {
    const auto = action.notation === 'auto';
    const base = action.name.trim() || (index ? 'Action' : 'Strike');
    // "(2×)" is what the roller reads to roll an attack twice.
    const twice = auto && math.attacks === 2 && !/\(\d\s*[×x]\)/i.test(base) ? `${base} (2×)` : base;
    return {
      id: action.id,
      name: twice,
      description: action.description.trim(),
      notation: auto ? math.notation : action.notation.trim() || undefined,
      range: action.range?.trim() || undefined,
    };
  });
  const lastStand = draft.kind === 'legendary' && draft.lastStand ? draft.lastStand : undefined;
  return {
    id,
    name,
    source: 'homebrew',
    edition: 'unknown',
    kind: draft.kind,
    level: math.level,
    hp: math.hp,
    armor: draft.armor,
    family: draft.family.trim() || 'Homebrew',
    role: draft.kind === 'legendary' ? 'Solo' : draft.kind === 'minion' ? 'Minion' : 'Custom',
    size: draft.size !== 'Medium' ? draft.size : undefined,
    speed: draft.speed !== 6 ? draft.speed : undefined,
    saves: savesText(draft.saves),
    traits: draft.traits.map((trait) => ({ name: trait.name.trim() || 'Trait', description: traitText(trait, math.dc, name) })),
    actions,
    actionInstructions: draft.actionInstructions?.trim() || undefined,
    bloodied: draft.bloodied?.trim() || undefined,
    lastStandText: draft.lastStandText?.trim() || (lastStand ? `${name} is dying! ${lastStand} more damage and it dies.` : undefined),
    lastStand,
    forge: draft,
  };
}

/** Any stat block (official or homebrew) back into the forge. Numbers that are
 *  not on the table stay as written: HP and rolls become overrides. */
export function monsterToDraft(monster: Monster, copy = false): ForgeDraft {
  if (monster.forge && !copy) return structuredClone(monster.forge);
  if (monster.forge) return { ...structuredClone(monster.forge), name: `${monster.name} (copy)` };
  const row = LEVEL_ROWS.reduce((best, line, index) => (Math.abs(line.level - monster.level) < Math.abs(LEVEL_ROWS[best].level - monster.level) ? index : best), 0);
  const kind: ForgeKind = monster.kind === 'team' ? 'standard' : monster.kind;
  const saves: ForgeDraft['saves'] = {};
  for (const part of monster.saves?.split('·') ?? []) {
    const match = /^\s*([A-Z]+)\s*([+−-]+)/i.exec(part);
    if (!match) continue;
    const edge = (match[2].startsWith('+') ? Math.min(2, match[2].length) : -1) as SaveEdge;
    const stats = match[1].toUpperCase() === 'ALL' ? SAVE_STATS : SAVE_STATS.filter((stat) => stat === match[1].toUpperCase());
    for (const stat of stats) saves[stat] = edge;
  }
  const dieMatch = /d(4|6|8|10|12|20)\b/.exec(monster.actions.find((a) => a.notation)?.notation ?? '');
  return {
    name: copy ? `${monster.name} (remix)` : monster.name,
    kind,
    row,
    armor: monster.armor,
    shape: 0,
    die: dieMatch ? (Number(dieMatch[1]) as Die) : 8,
    twoAttacks: false,
    payWith: 'level',
    hp: kind === 'minion' ? undefined : (monster.hp ?? undefined),
    family: monster.family,
    size: monster.size ?? 'Medium',
    speed: monster.speed ?? 6,
    saves,
    traits: monster.traits.map((trait) => ({ id: uid(), name: trait.name, text: trait.description, own: true })),
    actions: monster.actions.map((action) => ({ id: uid(), name: action.name, notation: action.notation ?? '', description: action.description, range: action.range })),
    actionInstructions: monster.actionInstructions,
    bloodied: monster.bloodied,
    lastStandText: monster.lastStandText,
    lastStand: monster.lastStand,
  };
}

export function addAbility(draft: ForgeDraft, ability: Ability): ForgeDraft {
  if (draft.traits.some((trait) => trait.abilityId === ability.id)) return { ...draft, traits: draft.traits.filter((trait) => trait.abilityId !== ability.id) };
  return { ...draft, traits: [...draft.traits, { id: uid(), abilityId: ability.id, name: ability.name }] };
}
export const newTrait = (): ForgeTrait => ({ id: uid(), name: '', text: '' });
export const newAction = (): ForgeAction => ({ id: uid(), name: '', notation: '', description: '' });

const FIRST = ['Ash', 'Bog', 'Bone', 'Brine', 'Cinder', 'Dread', 'Dusk', 'Gloom', 'Grave', 'Grim', 'Hollow', 'Iron', 'Mire', 'Moss', 'Murk', 'Rot', 'Rust', 'Salt', 'Shade', 'Thorn', 'Tomb', 'Venom', 'Wither', 'Hex'];
const LAST = ['Gnasher', 'Lurker', 'Stalker', 'Howler', 'Creeper', 'Maw', 'Fiend', 'Crawler', 'Hulk', 'Wretch', 'Shrieker', 'Brute', 'Wyrmling', 'Hag', 'Ogre', 'Imp', 'Witch', 'Golem', 'Knight', 'Toad', 'Wolf', 'Spider', 'Beetle', 'Troll'];
const FAMILY_BY_DIE: Record<Die, string> = { 4: 'Undead', 6: 'Goblinoids', 8: 'Humanoids', 10: 'Beasts', 12: 'Giants', 20: 'Horrors' };
const pick = <T>(list: readonly T[], random: () => number) => list[Math.floor(random() * list.length)];

export const rollName = (random = Math.random) => `${pick(FIRST, random)} ${pick(LAST, random)}`;

/** Surprise me: a legal monster near the party's level. */
export function rollMonster(partyLevel: number, random = Math.random): ForgeDraft {
  const base = LEVEL_ROWS.findIndex((line) => line.level >= partyLevel);
  const row = clampRow((base < 0 ? LAST_ROW : base) + Math.floor(random() * 5) - 3);
  const die = pick(DICE, random).die;
  const armor = pick<Armor>(['none', 'none', 'medium', 'heavy'], random);
  const shape = Math.max(-row, Math.min(LAST_ROW - row, pick([-2, -1, 0, 0, 0, 1, 2, 3], random)));
  const draft: ForgeDraft = { ...blankDraft(row), name: rollName(random), die, armor, shape, twoAttacks: random() < 0.35, family: FAMILY_BY_DIE[die] };
  const pool = [...ABILITIES];
  const count = 1 + Math.floor(random() * 2);
  let next = draft;
  for (let i = 0; i < count; i++) next = addAbility(next, pool.splice(Math.floor(random() * pool.length), 1)[0]);
  next.actions = [{ ...next.actions[0], name: pick(['Claw', 'Bite', 'Slam', 'Gore', 'Lash', 'Rend', 'Smite', 'Sting'], random) }];
  return next;
}
