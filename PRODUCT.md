# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Game Masters running **Nimble RPG** (5e-compatible, fast-paced) combat live at the table. They glance at the tool between player turns, often mid-conversation, and need to find a monster's HP, an attack roll, or a trait within a second or two. Usage is split equally between a laptop beside the GM screen (mouse + keyboard) and a tablet at the table (touch, landscape or portrait). Mobile phone use is supported but secondary.

## Product Purpose

A fast, local-first encounter manager: build an encounter from the bundled GMG bestiary, then run it. One horizontal lane per monster type shows each copy's HP, conditions and turn marker above the shared stat block (actions, traits, bloodied, last stand), with one-click dice rolls. Success = the GM never loses the thread of combat and never has to flip to the book.

## Positioning

The best at-the-table tool for Nimble: stat blocks stay on screen side by side as lanes instead of being hidden behind a list, HP is a single command field that understands Nimble armor rules (`18`, `!18`, `v18`, `100-20`, `=80`…), and dice rolls follow Nimble rules (exploding max, 1 misses, advantage stacks, minions can't crit).

## Operating Context

- Live play, dim or bright rooms, divided attention; information must be glanceable.
- Laptop and tablet are both first-class; touch targets matter as much as keyboard shortcuts (`/`, `Ctrl+K`, Enter/Escape in HP field, arrow keys to reorder lanes).
- Prep happens in the same UI: library drawer with search, party setup, encounter difficulty budget, encounter switcher (rename/duplicate/export/delete/notes/reset), homebrew monsters, JSON import/export.

## Capabilities and Constraints

- Preact + Vite + TypeScript, no backend; state in `localStorage`; JSON import/export.
- Data: 86 official GMG first-printing monsters, unchanged. Rules per encounter: the July 2026 changelog (default) or the First Printing (see `src/lib/rulesets.ts`).
- Terminology: Encounter, Round, Lane / stat block, Creature, Minion, Legendary, Last Stand, Bloodied, Armor (none / Medium / Heavy), Conditions, Advantage/Disadvantage, Difficulty budget.
- Must support light and dark themes, following the system preference.

## Brand Commitments

- Name: **Nimble Nasties**. Logo artwork (`public/nimble-nasties-logo.*`, `public/nimble-nasties-icon.webp`, favicons) is binding.
- Brand tangerine `#ff7a33` with ink black and warm ivory is binding (rebranded from `#ff5800` before launch; logo, icons and favicons were recolored by pixel remap as a stopgap; a re-export from the source artwork will replace them).
- Should feel at home next to Nimble RPG's own visual language while keeping its own identity (the mischievous imp mascot).
- Nimble's Creator's Kit names Beaufort Pro Heavy (headlines) and Avenir Next Condensed (body); these are proprietary and must not be bundled.
- Independent fan tool under the Nimble 3rd Party Creator License; must not imply official affiliation.

## Evidence on Hand

README.md, bundled GMG data in `src/data/`, logo assets in `public/`. No testimonials or user metrics exist; do not fabricate any.

## Product Principles

1. Glance first: the most-needed number (HP, roll result, round) is readable at arm's length.
2. Never lose combat state: undo for removals, no accidental commits, autosave.
3. Rules-aware, not rules-heavy: the tool applies Nimble rules quietly; explanation is available, never in the way.
4. Same power with touch and keyboard.
5. Fan-made with personality, but the stat block is the hero.

## Accessibility & Inclusion

WCAG AA contrast in both themes; full keyboard operability; visible focus; respect reduced motion; touch targets ≥ 40px on tablet layouts.
