/** Reference data for the rules dialog, the library's quick filters and the About dialog. */
export const QUICK_LABEL = { all: 'All', fielded: 'In encounter', standard: 'Standard', minion: 'Minions', legendary: 'Legendary', fits: 'Fits budget' } as const;

// The rules dialog's reference; armor and difficulty tiers come from the encounter's rule set.
// Encounter guidance is GMG v1 pp. 24–42 (also on nimble.nexus/rules).
export const HP_COMMANDS: [string, string][] = [
  ['18', 'Damage; armor applies'],
  ['d18+5', 'Damage with a modifier: 18 on the dice, +5 on top'],
  ['!18', 'Crit, ignores armor'],
  ['v18', 'Vulnerable'],
  ['r18', 'Resistant'],
  ['^18', 'Ignores armor'],
  ['+5', 'Heal'],
  ['-5', 'Lose HP directly, no armor'],
  ['=18', 'Set HP'],
  ['100-20', 'Edit the HP shown: sets it to 80'],
];
export const DICE_RULES: [string, string][] = [
  ['1', 'The primary (leftmost) die misses'],
  ['Max', 'Crit: the primary die explodes'],
  ['Adv / Dis', 'Add a die, drop the lowest / highest. Stacks; each cancels one of the other'],
];
export const TABLE_MINIONS: [string, string][] = [
  ['Any damage', 'Kills a minion'],
  ['Attacks', 'One die each, a 1 misses, never crit, ignore Adv and Dis'],
  ['Act together', 'All minions attacking one hero move and roll at once: 5 minions roll 5d6, ignoring 1s'],
  ['Defend', 'Their combined damage is one attack: Defend or Interpose once against all of them'],
];
export const TABLE_LEGENDARY: [string, string][] = [
  ['Turns', "Acts after each hero's turn (not after minions or other followers)"],
  ['Bloodied', 'At half HP it gains a new dangerous ability'],
  ['Last Stand', 'At 0 HP it is dying; it dies after the extra damage on its stat block'],
];
export const MINION_DICE: { die: string; from: number; to: number }[] = [
  { die: 'd4', from: 1, to: 3 },
  { die: 'd6', from: 3, to: 5 },
  { die: 'd8', from: 5, to: 10 },
  { die: 'd10', from: 10, to: 13 },
  { die: 'd12', from: 13, to: 17 },
  { die: 'd20', from: 17, to: 20 },
];
export const TUNING: { harder: string[]; easier: string[] } = {
  harder: ['Focus fire on one or two heroes', 'Move monsters every turn', 'Go after fragile heroes', 'Move monsters earlier in initiative'],
  easier: ['Spread damage around', 'Send monsters in waves', 'Move monsters less', 'Start easy: raising difficulty mid-fight beats lowering it'],
};

export type RulesTab = 'build' | 'table' | 'changes';
export const RULES_TABS: [RulesTab, string][] = [
  ['build', 'Building'],
  ['table', 'At the table'],
  ['changes', 'What changed'],
];
/** Sibling tools by the same author, listed in the About dialog. */
export const OTHER_TOOLS = [
  { title: 'Malice Menagerie', blurb: 'Encounter builder and Malice tracker for Draw Steel', href: 'https://malice-menagerie.pages.dev' },
  { title: 'RED//OPS', blurb: 'NPC generator and encounter tracker for Cyberpunk RED', href: 'https://red-ops.pages.dev' },
  { title: 'Legend Ledger', blurb: 'Character sheet and play companion for Legend in the Mist', href: 'https://legend-ledger.pages.dev' },
  { title: 'Daggerheart Toolkit', blurb: 'Obsidian plugin for Daggerheart statblocks, encounters and Fear', href: 'https://github.com/Eppinguin/obsidian-daggerheart-toolkit' },
];
