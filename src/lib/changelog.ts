import type { RulesetId } from './rulesets.ts';

/** Nimble Co.'s rules releases as they affect the GM's side of the table,
 * newest first. Each change compares against the release below it. A release
 * with `rules` can be picked for an encounter; one without is listed so GMs
 * know what is coming. Sources are Nimble Co.'s own changelog posts. */
export interface RulesChange {
  what: string;
  from?: string;
  to: string;
}
export interface RulesRelease {
  key: string;
  name: string;
  when: string;
  summary: string;
  rules?: RulesetId;
  source?: string;
  sections: { title: string; changes: RulesChange[] }[];
}

export const RULES_RELEASES: RulesRelease[] = [
  {
    key: 'oct26',
    name: 'Second Printing playtest',
    when: 'October 2026',
    summary: 'Armor doubles again, six monsters change level, and encounter building is reworked. Coming to Nimble Nasties once the new GMG is out.',
    source: 'https://nimblerpg.com/blogs/news/core-rules-gmg-heroes-full-changelog',
    sections: [
      {
        title: 'Monster armor',
        changes: [
          { what: 'Medium armor', from: '−5', to: '−10' },
          { what: 'Heavy armor', from: '−10', to: '−20' },
        ],
      },
      {
        title: 'Monster levels',
        changes: [
          { what: 'Goblin', from: '⅓', to: '½' },
          { what: 'Kobold Sneak', from: '½', to: '1' },
          { what: 'Kobold Clanger', from: '1', to: '2' },
          { what: 'Kobold Trapper', from: '1', to: '2' },
          { what: 'Kobold Denwarden', from: '1', to: '3' },
          { what: 'Hill Giant', from: '12', to: '10' },
        ],
      },
      {
        title: 'Encounter building',
        changes: [
          { what: 'Difficulty', from: 'Rough bands', to: 'Steps at 50, 75, 100, 125, 150%' },
          { what: 'Monsters per hero', from: '1–4', to: '1–3' },
          { what: 'Minions', from: 'Outside the budget', to: '2 per hero count as one hero-level monster, 3–4 as two' },
          { what: 'Flunkies', to: 'Removed' },
        ],
      },
      { title: 'Legendary monsters', changes: [{ what: 'HP', from: 'One total for any party', to: 'Per hero' }] },
    ],
  },
  {
    key: 'jul26',
    name: 'July 2026 Changelog',
    when: 'July 2026',
    summary: 'Monster armor, vulnerability and resistance become flat numbers. No stat block changes. Nimble Nexus uses these rules.',
    rules: 'nimble-jul26',
    source: 'https://nimblerpg.com/blogs/news/core-rules-reprint-full-changelog',
    sections: [
      {
        title: 'Monster armor',
        changes: [
          { what: 'Medium armor', from: 'Dice only', to: '−5' },
          { what: 'Heavy armor', from: 'Half the dice', to: '−10' },
          { what: 'Vulnerable', from: 'Ignores armor, ×2 unarmored', to: '+10' },
          { what: 'Resistant', from: 'Half', to: '−10' },
          { what: 'Crits', to: 'Still ignore armor' },
        ],
      },
      { title: 'Minions', changes: [{ what: 'Advantage and disadvantage', to: 'Ignored on minion attacks (clarified)' }] },
    ],
  },
  {
    key: '1p',
    name: 'First Printing',
    when: 'Original release',
    summary: "The original Core Rules and Game Master's Guide. All 86 bundled stat blocks come from this printing.",
    rules: 'nimble-1p',
    sections: [],
  },
];
