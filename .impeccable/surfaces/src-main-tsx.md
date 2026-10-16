---
version: 1
slug: 'src-main-tsx'
primary_target: 'src/main.tsx'
related_targets: []
---

# Surface brief: Encounter runner (whole app)

Mode: Operate. GMs run Nimble combat live at the table on laptop and tablet equally; glance-first reading of HP, rolls, round, traits.

## Direction contract

THESIS: The app is the GMG bestiary page laid open at the table: ivory stat-block sheets side by side, each under a black name bar, creatures slotted above the printed stat lines. Refuses the dark VTT dashboard of neutral cards and sidebars.

OWN-WORLD: Ink #15110e, ivory sheet, warm paper ground; brand tangerine #ff7a33 only on things you press or roll (#e8590c for thin lines on paper), plus one brand strike: a 3px orange rule under each lane name bar (and the preview's), echoing the logo's lightning stroke; deep orange for small accent text. Black name bars with heavy display type: Beaufort Pro when installed, else Alegreya 900 (README's chosen stand-in for Beaufort's flared serif; mixed case like the GMG); UI in Avenir Next Condensed when installed, else Barlow (Semi) Condensed — platform faces first is a deliberate README commitment to Nimble's Creator's Kit fonts. One-pixel hairline rules, tabular numerals, square-ish 2–4px corners. HP track: ink → amber (Bloodied ≤ half) → red (Last Stand). Acted = filled ink turn box + dimmed name (the familiar tick reads fastest at the table); defeated rows fold into an in-lane 'N defeated · show' toggle (existing behavior the GM relies on to keep lanes short) and render struck-through with a skull when shown. Dark theme = same sheet printed in ivory on ink.

STORY: The GM glances: round, who has acted, each creature's HP in big tabular numerals, then the attack pill to roll. Prep (library, party, difficulty) lives in a drawer that leaves the sheets alone.

FIRST VIEWPORT: Slim ink masthead (logo sticker, encounter name, difficulty chip, Add monsters, Rules), then a combat strip (ROUND numeral large, acted x/y, Next round, latest roll). Below, horizontally scrolling sheets ~360px wide, full height, each: black name bar with level/armor/HP stat triad, creature rows (turn box, name, HP numeral 24px+, hp track, conditions), then stat block.

FORM: GMG Stat Block Page, user-chosen pick (top of grounded list); seed key 1779bf0e.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
