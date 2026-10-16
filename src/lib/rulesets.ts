import { appliedDamage, difficulty, flatArmorDamage } from './rules.ts';

/** Nimble Co. revises its rules between printings. Every encounter records
 * the rule set it runs under and keeps it until the GM changes it, so an app
 * update never shifts HP or armor math in the middle of a campaign.
 *
 * Adding a rule set: add its id here, its mechanics (and stat block patches)
 * beside rules.ts, an entry in RULESETS at the front of RULESET_ORDER, and
 * its release in changelog.ts. Never remove an old one: saved and exported
 * encounters keep pointing at it.
 */
export type RulesetId = 'nimble-1p' | 'nimble-jul26';

/** A row of the quick reference: what you see or type, and what it does. */
export type ReferenceRow = [term: string, meaning: string];

export interface DifficultyTier {
  label: string;
  tone: 'easy' | 'medium' | 'hard' | 'deadly';
  /** Monster levels for a budget (total hero levels), e.g. `under 2`. */
  levels: (budget: number) => string;
  expect: string;
  often: string;
}

export interface Ruleset {
  id: RulesetId;
  /** Nimble Co.'s own name for the release, shown wherever space is short. */
  name: string;
  /** One line for the rules picker. */
  armorSummary: string;
  armorReference: ReferenceRow[];
  /** Encounter difficulty guidance, easiest first. */
  tiers: DifficultyTier[];
  /** Medium/Heavy armor only counts the dice, so `d18+5` matters. */
  splitsDice: boolean;
  appliedDamage: typeof appliedDamage;
  difficulty: typeof difficulty;
}

const levels = (n: number) => String(+n.toFixed(1));
// GMG v1 p. 25, "Encounter Difficulties". The July 2026 changelog keeps it.
const firstPrintingTiers: DifficultyTier[] = [
  { label: 'Easy', tone: 'easy', levels: (b) => `under ${levels(b / 2)}`, expect: 'Little HP or resources lost', often: '1–2 a session' },
  { label: 'Medium', tone: 'medium', levels: (b) => `about ${levels(b * 0.75)}`, expect: 'Heroes get hurt, nobody should drop', often: '1–2 a session' },
  { label: 'Hard', tone: 'hard', levels: (b) => levels(b), expect: 'Some may drop to 0 HP, none should die', often: '1 a session' },
  { label: 'Deadly', tone: 'deadly', levels: (b) => `${levels(b)}–${levels(b * 1.25)}`, expect: 'Needs tactics and teamwork; for bosses', often: 'Sparingly' },
  { label: 'Very deadly', tone: 'deadly', levels: (b) => `${levels(b * 1.5)}+`, expect: 'Heroes retreat or die', often: 'Only if they ignore your warnings' },
];

export const RULESETS: Record<RulesetId, Ruleset> = {
  'nimble-1p': {
    id: 'nimble-1p',
    name: 'First Printing',
    armorSummary: 'Medium: dice only · Heavy: half the dice',
    armorReference: [
      ['Medium', 'Only the dice count, positive modifiers are ignored'],
      ['Heavy', 'Half the dice, rounded up, modifiers ignored'],
      ['Crit', 'Ignores armor'],
      ['Vulnerable', 'Ignores armor; double damage if unarmored'],
      ['Resistant', 'Half damage, rounded up'],
    ],
    tiers: firstPrintingTiers,
    splitsDice: true,
    appliedDamage,
    difficulty,
  },
  // Reprint draft as published in July 2026 and used on Nimble Nexus.
  // Changes no stat blocks, levels or encounter rules: only armor math.
  'nimble-jul26': {
    id: 'nimble-jul26',
    name: 'July 2026 Changelog',
    armorSummary: 'Medium −5 · Heavy −10, off each attack',
    armorReference: [
      ['Medium', '−5 damage from each attack'],
      ['Heavy', '−10 damage from each attack'],
      ['Crit', 'Ignores armor'],
      ['Vulnerable', '+10 damage'],
      ['Resistant', '−10 damage'],
    ],
    tiers: firstPrintingTiers,
    splitsDice: false,
    appliedDamage: flatArmorDamage(5, 10),
    difficulty,
  },
};

/** Newest first, as shown in the rules picker. */
export const RULESET_ORDER: RulesetId[] = ['nimble-jul26', 'nimble-1p'];

/** New encounters get the newest rule set. */
export const DEFAULT_RULES: RulesetId = RULESET_ORDER[0];

export function isRulesetId(value: unknown): value is RulesetId {
  return typeof value === 'string' && Object.hasOwn(RULESETS, value);
}

/** Reads the rule set an encounter was stored with. A missing field gets the
 * default; an id this build does not know comes back as `unknown` so callers
 * can refuse it instead of guessing. */
export function readRules(raw: unknown): { id: RulesetId } | { unknown: string } {
  if (raw == null || raw === '') return { id: DEFAULT_RULES };
  if (isRulesetId(raw)) return { id: raw };
  return { unknown: String(raw) };
}

export function rulesFor(encounter: { rules?: RulesetId }): Ruleset {
  return RULESETS[encounter.rules ?? DEFAULT_RULES] ?? RULESETS[DEFAULT_RULES];
}

/** The rule set's name when it differs from the one new encounters get, so
 * lists only call out encounters that run on older rules. */
export function otherPrinting(encounter: { rules?: RulesetId }): string | null {
  const rules = rulesFor(encounter);
  return rules.id === DEFAULT_RULES ? null : rules.name;
}
