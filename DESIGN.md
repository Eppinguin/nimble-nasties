---
name: Nimble Nasties
description: The GMG bestiary page laid open at the table; ivory stat-block sheets under black name bars, tangerine only where you press or roll.
colors:
  signal: '#ff7a33'
  signal-hover: '#ff8a4d'
  signal-line: '#e8590c'
  signal-inverse: '#ff7a33'
  on-signal: '#0a0705'
  signal-text: '#a83307'
  signal-wash: '#ffe8d6'
  ground: '#e9e0d1'
  sheet: '#fffaf0'
  sheet-2: '#f5eddf'
  sheet-3: '#ece2d1'
  ink: '#15110e'
  ink-2: '#4b4139'
  ink-3: '#6d6155'
  rule: '#e4d9c8'
  rule-strong: '#cdbca6'
  bar: '#15110e'
  bar-2: '#2a231d'
  bar-text: '#fffaf0'
  bar-soft: '#bcae9c'
  masthead: '#11100e'
  masthead-edge: '#3a322b'
  masthead-hover: '#1f1a16'
  hp-ok: '#3a3029'
  bloodied: '#9c4f00'
  bloodied-fill: '#e08a1e'
  laststand: '#b3160b'
  laststand-fill: '#d8261a'
  armor-accent: '#ffb37f'
  difficulty-easy: '#79bf72'
  difficulty-medium: '#e3b33a'
  difficulty-hard: '#f08a45'
  difficulty-deadly: '#ff5a4a'
typography:
  display:
    fontFamily: 'Beaufort Pro, Beaufort Pro Heavy, Alegreya, Georgia, serif'
    fontSize: '24px'
    fontWeight: 900
    lineHeight: 1.08
    letterSpacing: '-0.005em'
  numeral:
    fontFamily: 'Beaufort Pro, Beaufort Pro Heavy, Alegreya, Georgia, serif'
    fontSize: '36px'
    fontWeight: 900
    lineHeight: 1
    fontFeature: 'tnum'
  title:
    fontFamily: 'Beaufort Pro, Beaufort Pro Heavy, Alegreya, Georgia, serif'
    fontSize: '18px'
    fontWeight: 800
    lineHeight: 1.15
  hp-numeral:
    fontFamily: 'Avenir Next Condensed, Barlow Condensed, Arial Narrow, sans-serif'
    fontSize: '30px'
    fontWeight: 700
    lineHeight: 1
    fontFeature: 'tnum'
  ui:
    fontFamily: 'Avenir Next Condensed, Barlow Condensed, Arial Narrow, sans-serif'
    fontSize: '15px'
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: 'Avenir Next Condensed, Barlow Semi Condensed, Barlow Condensed, Arial Narrow, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.42
  label:
    fontFamily: 'Avenir Next Condensed, Barlow Condensed, Arial Narrow, sans-serif'
    fontSize: '13px'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '0.09em'
rounded:
  tag: '3px'
  sheet: '4px'
  control: '6px'
  float: '8px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  board-gap: '14px'
  lg: '16px'
  drawer: '18px'
components:
  button-primary:
    backgroundColor: '{colors.signal}'
    textColor: '{colors.on-signal}'
    typography: '{typography.ui}'
    rounded: '{rounded.control}'
    padding: '0 16px'
    height: '42px'
  button-primary-hover:
    backgroundColor: '{colors.signal-hover}'
  button-outline:
    backgroundColor: '{colors.sheet}'
    textColor: '{colors.ink}'
    typography: '{typography.ui}'
    rounded: '{rounded.control}'
    padding: '0 16px'
    height: '42px'
  button-outline-hover:
    backgroundColor: '{colors.sheet-2}'
  roll-pill:
    backgroundColor: '{colors.signal}'
    textColor: '{colors.on-signal}'
    rounded: '7px'
    padding: '0 12px'
    height: '36px'
  roll-edge:
    backgroundColor: '{colors.signal-wash}'
    textColor: '{colors.signal-text}'
    width: '32px'
    height: '36px'
  lane-name-bar:
    backgroundColor: '{colors.bar}'
    textColor: '{colors.bar-text}'
    typography: '{typography.display}'
    padding: '12px 12px 10px 16px'
  hp-field:
    backgroundColor: '{colors.sheet-2}'
    textColor: '{colors.hp-ok}'
    typography: '{typography.hp-numeral}'
    rounded: '{rounded.control}'
    padding: '0 6px'
    height: '42px'
  text-field:
    backgroundColor: '{colors.sheet-2}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '42px'
  condition-chip:
    backgroundColor: '{colors.sheet-3}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sheet}'
    padding: '0 5px 0 7px'
    height: '22px'
  icon-button:
    textColor: '{colors.ink-2}'
    rounded: '{rounded.control}'
    size: '38px'
  horde-token:
    backgroundColor: '{colors.sheet}'
    textColor: '{colors.ink}'
    rounded: '50%'
    size: '34px'
  horde-token-acted:
    backgroundColor: '{colors.sheet-3}'
    textColor: '{colors.ink-3}'
  horde-token-picked:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.sheet}'
---

# Design System: Nimble Nasties

## Overview

**Creative North Star: "The Bestiary Page at the Table"**

The app is a printed GMG bestiary spread laid open beside the GM screen. Each monster type is an ivory sheet standing on a warm paper table, headed by a black name bar set in heavy flared serif, with a single orange strike beneath it like the logo's lightning stroke. Creature rows sit above the printed stat lines; the stat block below reads like the book. Everything else (library, party, difficulty, dice history) arrives as a drawer or a floating sheet that leaves the page alone.

Density is high but glanceable: condensed sans for every interface word, tabular numerals everywhere a number changes, and the largest type on screen reserved for the numbers a GM needs at arm's length (round, HP, roll totals). Orange is a tool mark, not decoration. HP state speaks a reserved three-step language, ink to amber to red. The dark theme is the same sheet printed in ivory on ink, not a separate dashboard skin; the masthead is ink in both themes because it is the logo's own ground.

The system rejects the neutral-card VTT dashboard: no grey cards, no sidebar chrome, no generic accent color spread across surfaces.

**Key Characteristics:**

- Ivory sheets on a warm table ground, each headed by a black name bar with a 3px orange strike.
- Heavy mixed-case serif (900) for names and headline numerals; condensed sans for everything else.
- Orange marks only what you press or roll, the name-bar strike, and small accent text.
- Tabular numerals for every changing number.
- HP state in one reserved ramp: ink, amber (Bloodied), red (Last Stand).
- Hairline 1px rules divide rows; corners stay small (3 to 8px).

## Colors

Warm ink and ivory paper carrying one loud brand orange that behaves like a tool, plus a reserved amber-to-red HP language.

### Primary

- **Nimble Tangerine** (signal, #ff7a33): the brand color. It fills everything you press or roll (primary buttons, roll pills, the add-monsters trigger, toast Undo, text selection, the forge slider thumb) and draws the 3px strike under every black name bar. Chosen over the hotter #ff5800 because ink labels read at 7.7:1 on it and it feels playful rather than hazard-orange. Text on fills is **Deep Ink** (on-signal, a notch below ink) with platform font smoothing and 2.5 icon strokes so labels hold their weight. Hover lifts to **Flare** (signal-hover) so contrast rises under the pointer; press settles back onto signal. Never darken a tangerine fill under ink text.
- **Tangerine Line** (signal-line): tangerine is too pale for thin marks on ivory (2.5:1), so focus outlines, active and focused borders, dashed drop targets and invalid underlines on paper use #e8590c (3.4:1). In dark theme it is tangerine itself. **Signal Inverse** (signal-inverse) colors accent words inside the inverted HP help tip: tangerine on its ink ground, ember in dark theme where the tip turns ivory.
- **Ember Text** (signal-text): small accent text on paper: links, legendary tags, budget counts, the critical roll total, warning icons. Lifts to a lighter ember in dark theme to hold contrast.
- **Signal Wash** (signal-wash): the quiet orange field behind advantage/disadvantage edges, inline dice rolls, focus halos (3px ring), the selected encounter, drop targets, and the "everyone has acted" nudge around Next round.

### Tertiary (state language)

- **Bloodied Amber** (bloodied text, bloodied-fill track): HP at or below half. Also the heading color of a stat block's Bloodied section.
- **Last Stand Red** (laststand text, laststand-fill track and row tint at 7%): Last Stand state and the Last Stand section heading; also used for destructive actions (delete, remove hover).
- **Armor Peach** (armor-accent): Medium and Heavy armor values and kind tags on the black name bar.
- **Difficulty dots** (difficulty-easy, -medium, -hard, -deadly): the 9px dot in the masthead difficulty chip; deadly adds a 3px translucent halo.

### Neutral

- **Table Ground** (ground): the page behind the sheets.
- **Ivory Sheet** (sheet), **Sheet Shade** (sheet-2), **Sheet Deep** (sheet-3): sheet surface; shade for inputs at rest, stat-block toggles, special-text boxes, hover rows; deep for chips, segmented-control tracks, icon-button hover.
- **Bestiary Ink** (ink), **Ink Soft** (ink-2), **Ink Faint** (ink-3): primary text and filled turn boxes; secondary labels; metadata, placeholders, maxima.
- **Hairline** (rule) and **Hairline Strong** (rule-strong): row dividers and meters; control borders and the toolbar edge.
- **Name Bar** (bar, bar-2, bar-text, bar-soft): black title bands of lanes, the dice tray, modals and the drawer head; bar-2 for icon hover; bar-soft for stat labels and tools.
- **Masthead Ink** (masthead, masthead-edge, masthead-hover): the always-dark app header, its 1px control borders and hover fill.

Dark theme (system preference, or forced with `data-theme="dark"`) remaps the same roles: ground #090706, sheet #211b16 / #2a231d / #342b24, ink #f3ead8 / #d0c4b2 / #a29482, rules #2f2822 / #463c33, bar #050403, signal-text #ff8a4d, signal-line #ff7a33, signal-inverse #a83307, signal-wash #3b1e0e, hp-ok #e2d6c3, bloodied #f2a54a, laststand #ff7466. Tangerine itself does not change.

### Named Rules

**The Press-or-Roll Rule.** Solid orange fills only things you can press or roll. Its other two licensed uses are the name-bar strike and small ember accent text; nothing else is orange.

**The One Strike Rule.** The 3px signal rule appears only under a monster's black name bar (lane header and library preview). It is the brand mark of the sheet, not a divider style.

**The Reserved Ramp Rule.** Amber means Bloodied and red means Last Stand or destruction. Never use them for decoration, categories, or generic warnings.

## Typography

**Display Font:** Beaufort Pro when installed, else Alegreya 900 (Georgia, serif fallback)
**Body Font:** Avenir Next Condensed when installed, else Barlow Semi Condensed for running text and Barlow Condensed for UI (Arial Narrow fallback)

**Character:** A flared, heavy book serif in mixed case for names and big numbers, set against a narrow, workmanlike condensed sans that packs labels and stat text into a sheet the width of a column. Platform faces load first by commitment to Nimble's Creator's Kit; the Google stand-ins are never bundled substitutes for them.

### Hierarchy

- **Display** (900, 24px, 1.08): monster names on the name bar. Scales 18 to 30px for the drag ghost, encounter switcher (20px), drawer and dice-tray heads (20 to 22px), modal heads (26px), and empty states (30px).
- **Numeral** (900, 36px, 1, tabular): the round number; the same face at 24 to 30px for roll totals, budget totals, and level badges.
- **Title** (800, 18px, 1.15): ability and trait names inside the stat block.
- **HP Numeral** (sans 700, 30px, 1, tabular): the HP command field; current HP is the largest sans number on the sheet.
- **UI** (sans 600 to 700, 15 to 17px, 1.4): buttons, creature names (17px), menu items, chips (13px).
- **Body** (sans 400, 16px, 1.42): ability and trait text; rules copy at 1.5 and 68ch max.
- **Label** (sans 800, 11 to 13px, 0.07 to 0.09em, uppercase): stat-line keys (LV, SAVES), ROUND, BLOODIED / LAST STAND phase keys, HP state words, range tags, kind tags. These are the book's own data labels.

### Named Rules

**The Mixed-Case Serif Rule.** Display type is always mixed case at 800 to 900. Uppercase belongs only to the small tracked sans labels.

**The Tabular Rule.** Every number that changes (HP, round, rolls, budget, counts) uses tabular numerals.

## Layout

A full-height, no-page-scroll shell: a 64px ink masthead, a 60px ivory combat strip (round, acted meter, Next round, latest roll pushed right), then a board of sheets that scrolls horizontally with a 14px gap and 14 to 16px insets. Each sheet is a column 330 to 410px wide (a quarter of the viewport, clamped), only as tall as its content and capped at the board height, past which it scrolls internally: name bar, creature rows, lane actions, then the always-open stat block.

Creature rows are a three-column grid: 34px turn box, name and conditions, HP field; the HP track spans beneath. Rows pad 9 to 10px by 12px; the stat block pads 16px. The library is a 390px right drawer over a scrim; the encounter picker (400px) and dice tray (360px) float as sheets.

Breakpoints: at 1100px lanes narrow to a third of the viewport and secondary header text drops. At 790px the masthead shrinks to 56px, the logo crops to a 38px icon, lanes become full-width snap-scrolled sheets, drawers go full width, and the dice tray docks to the bottom. On coarse pointers, turn boxes, grips, roll controls, chips and menu rows grow to 40 to 46px targets.

## Elevation & Depth

Sheets lie on the table; floating tools lift off it. Light theme uses warm brown shadows: a soft sheet shadow for lanes and a deeper pop shadow for menus, the dice tray, modals, toasts, and help tips. The drawer casts a leftward shadow with a hairline edge. In dark theme shadows become a 1px warm ring plus a deep black fall, so sheets read as printed edges rather than glowing cards.

### Shadow Vocabulary

- **Sheet** (`0 1px 1px rgb(40 25 10 / .08), 0 8px 20px -10px rgb(40 25 10 / .35)`): every lane.
- **Pop** (`0 2px 4px rgb(20 12 6 / .12), 0 18px 40px -12px rgb(20 12 6 / .45)`): floating pickers, dice tray, modals, toasts, HP entry help.
- **Focus halo** (`0 0 0 3px` signal-wash): focused inputs alongside a signal-line border.

### Named Rules

**The Paper Not Glass Rule.** Depth comes from paper shadows and tonal sheet shades. No blur, no translucency on surfaces, no glow.

## Shapes

Small, square-ish corners: 3px on inline tags and roll links, 4px on sheets, chips and level badges, 6px on buttons, inputs and icon buttons, 7px on segmented tracks, 8px on floating sheets and toasts. Pills (999px) are reserved for the difficulty chip and the drop instruction. Borders are 1px hairlines; dashed 2px signal-line marks drop targets. Roll-pill groups are 6px.

## Components

### Buttons

Tactile and blunt, like tabs on a printed sheet.

- **Shape:** gently squared (6px), 42px tall (40px compact).
- **Primary:** signal, ink text, 16px bold condensed, 0 16px padding.
- **Hover / Focus:** hover lightens to signal-hover; active returns to signal and nudges down 1px; focus is a 2px signal-line outline at 2px offset.
- **Outline:** ivory sheet fill, 1px rule-strong border, ink text; hover shades to sheet-2 with an ink-3 border.
- **Icon button:** 38px square, ink-2 icon, sheet-3 hover. On the name bar, icons are bar-soft and hover to bar-2.

### Roll Controls (signature)

- **Roll pill:** signal, 16px 800 tabular notation with a dice icon, 32px tall (40px touch), flanked by signal-wash minus/plus edges for disadvantage and advantage, all in one 7px-rounded group.
- **Inline roll:** dice notation inside ability text becomes a 3px-rounded signal-wash run of text (no icon, so words like "d20s" stay whole) that inverts to solid signal on hover.
- **Latest roll:** an outline button in the combat strip; critical rolls take a signal-line border and wash, misses strike through in ink-3.

### Name Bar (signature)

Black band, display name at 22px 900, then one book-style stat line: kind tag first (Minion, Legendary), `LV` key + value, heart icon + HP, shield icon + M/H in armor peach (omitted when unarmored, as in the book), `SAVES` for legendaries, family right-aligned and truncated. No count pill: a standard monster's creature rows show how many there are, and a minion stat block shows its tokens and a standing count instead (see Minion hordes). The line wraps rather than clips. Grip and remove tools sit top-right at 32px (40px touch), then the 3px signal strike.

### Creature Row (signature)

Standard monsters only; minion stat blocks show packs of tokens in place of rows (see Minion hordes), with rows available on demand through "Names & conditions".

- **One line per creature:** 30px turn box, name, a faint `+` conditions button, hover-only remove, HP field. A second line appears only when there is something to say (HP state word, condition chips). On touch the remove control moves into the conditions panel.
- **Turn box:** 30px square (40px touch), 2px rule-strong border; acted fills solid ink with a check and a brief stamp scale, and the name dims to ink-3.
- **HP field:** 28px tabular numeral on sheet-2, 38px tall, sized to the digit count of max HP; colored by state; focus widens it, borders it in signal-line with a wash halo.
- **HP track:** 4px rounded bar under the row; ink, then amber fill, then red with a red-tinted row.
- **Down:** row at 60% opacity, name struck through, turn box greyed.
- **Spent lane:** once every standing creature in a stat block has acted, the black name bar lifts to bare parchment (sheet-3, ink-2 name, ink-3 stats), the orange strike turns rule-strong, the sheet shadow flattens to a 1px rule, and acted turn boxes soften to ink-3. Creature rows (HP, conditions) stay fully usable. The stat block's text steps down one ink level (still AA), and every roll pill becomes the "already acted" pill: signal-wash with signal-text, solid orange on hover. Acted minion packs use the same pill. No badge; screen readers hear “all acted this round” in the heading.
- **Lane actions:** one ghost row (Add another · N more · N defeated · show), no dashed box.

### Stat Block (signature)

Printed like the GMG, no chrome: no collapse bar, no section headings, no per-lane source footer (it stays in the library preview).

- **Order:** traits, then action instructions (italic, legendaries), then actions, then Bloodied and Last Stand. Matches the book.
- **Run-in names:** display serif 800 at 16.5px followed by the 15px body on the same line ("**Stab.** (or Shoot, Range 8)"). A period is added unless the name already ends in punctuation.
- **Rolls float:** each action's edge roll floats right inside its paragraph, so text wraps beside it and a short book entry stays one line. Hairlines divide traits from actions and actions from each other. Range is a tiny uppercase tag at the end of the text.
- **Live phases:** Bloodied and Last Stand are run-in paragraphs with a colored uppercase key. While any creature in the lane is in that state the paragraph gets a 13 to 16% amber/red wash and the key reads "Bloodied · now".

### Chips

- **Condition chip:** sheet-3 fill, rule-strong border, 13px bold, 22px tall, 4px corners, trailing x icon.
- **Kind tag:** 11px 800 uppercase, 1px currentColor border, 3px corners; peach on the name bar, ember for Legendary.

### Inputs / Fields

- **Style:** 42px, 1px rule-strong border, sheet-2 fill, 6px corners, 16px text; custom chevron on selects.
- **Focus:** border turns signal-line, fill lifts to sheet, 3px signal-wash halo.

### Navigation

The masthead is always ink: the logo sticker at 78px in the 64px masthead (tilted −2°, −4° on hover), so only its bottom edge hangs a few pixels onto the strip, clear of the strip's controls (the support notice gets 18px top padding for it); on phones the 42px icon tile. Then a 1px divider, the encounter switcher (display name 20px, bordered 44px control that turns signal-bordered when open), then on the right a ghost info button (About), a ghost theme toggle, a pill difficulty chip with a colored dot, and the orange Add monsters button. There is no masthead Rules button; the rules dialog opens from the info button beside the difficulty in the library drawer.

## Do's and Don'ts

### Do:

- **Do** head every monster sheet, modal, drawer and dice tray with a black name bar and display type at 900.
- **Do** keep the 3px signal strike exclusive to monster name bars.
- **Do** set HP, round, roll and budget numbers in tabular numerals at the largest size in their region.
- **Do** express HP state only through ink, Bloodied Amber and Last Stand Red, in both text and track.
- **Do** divide rows with 1px hairlines and keep corners between 3px and 8px.
- **Do** keep the masthead ink in both themes.
- **Do** grow touch targets to 40px or more on coarse pointers.

### Don't:

- **Don't** fill non-interactive surfaces, headings or decorative shapes with tangerine.
- **Don't** set display type in uppercase or use the serif for interface labels.
- **Don't** use amber or red for anything other than HP state and destructive actions.
- **Don't** replace the paper shadows with blur, glass, or glow.
- **Don't** turn sheets into neutral grey dashboard cards or move stat blocks behind a list.

## Additions (theme, notice, board navigation, edge)

- **Theme toggle** (masthead, `.theme-toggle`): cycles Auto → Light → Dark, stored in `localStorage['nimble-nasties-theme']`, applied as `data-theme` on `<html>` (pre-paint script in `index.html` avoids a flash). Auto removes the attribute and follows `prefers-color-scheme`.
- **Support notice** (`.support-banner`): full-width `--signal-wash` strip directly under the masthead carrying the Nimble 3rd Party Creator License free-tool notice and required attribution, an ink "Support Nimble" link, and a close button (`localStorage['nimble-nasties-support-banner']`). The same text stays in the About dialog and the rules dialog (library drawer → difficulty info) after closing.
- **About dialog** (masthead info button, `.about-copy`): the standard modal with a black head bar. It holds the official "Powered by Nimble" compatibility mark (`public/powered-by-nimble-black.webp` on light, `-white.webp` on dark; official artwork, never recolored or inverted), the required license attribution, a support line to nimbleRPG.com, a "Source on GitHub" link, then "More tools for the table": sibling tools by the same author as a hairline-divided list (bold name with an external-link icon, ink-3 one-line description). The list lives in `OTHER_TOOLS` in `src/main.tsx`. There is no app footer: the board keeps the full height.
- **Dialog focus**: every modal takes focus on open (the labelled dialog itself) and returns focus to its opener on close, unless another surface such as the forge has claimed it.
- **Board navigation** (`.board-frame`, `.board-nav`): when sheets overflow, ground-coloured fades mark the hidden side and ink arrow buttons step one sheet at a time; a vertical wheel over name bars or gaps scrolls the row; Shift+←/→ also steps. Hidden on phones, where sheets snap.
- **Edge roll** (`.action-roll-group`, one component everywhere a roll happens: every attack and the dice tray): `DIS | dice pill | ADV`. DIS/ADV only add a stack (each cancels one of the other, per Nimble's rules); the net shows as an ink badge in the pill (`ADV 2`), the winning side fills `--easy` green or `--laststand` red, and tapping the pill rolls and resets to normal. No hold or modifier-key gestures. Minions show `− | N× dX | +` instead (`HordeRoll`, `.horde-roll`): one die per minion, each 1 misses, the rest add up. It is preset to the pack's minions still to act; − and + (the same sheet-2 `.edge-btn` steppers, with minus/plus icons in place of DIS/ADV) change only this roll, between 1 and the number left. A single `1dX` reads as `dX` (`5× d6`); other notation is parenthesised (`5× (1d6+2)`). When nobody is left it becomes a single quiet, disabled sheet-3 "All acted" pill in ink-2 with a hairline inset and no edges.
- **Dice tray history** (`src/board/DiceTray.tsx`, `.roll-entry`, `.die`): each roll is a hairline row: the total right-aligned in display serif (30px, 36px for the newest on sheet-2), ember with a `CRITICAL` label on a crit, ink-3 with `MISS` on a miss. Beside it, the label (truncating) with a kind-tag-style `ADV N` / `DIS N` and the notation in ink-3 at the right, then every die as a 28px sheet tile (4px corners, 1px rule-strong, 16px 800 tabular) in rolled order, with ink-3 `+`/`−` between groups and plain ink-2 modifiers. The primary die carries a 2px ink edge; a critical primary and its explosion chain (placed straight after the dice, before modifiers) take signal-wash with ember edge and numerals; Adv/Dis drops and minion misses are dashed, struck and ink-3. Dashed always means "didn't count". A `d20`/`d6` size label precedes each group only when a roll mixes dice. Minion hordes show one tile per minion total. The newest roll's tiles land in a 35ms stagger (no motion under reduced motion). `RollResult.parts` carries this structure; `breakdown` stays as the screen-reader text and tooltip.
- **Library shortcuts toggle** (`/`, Ctrl/Cmd+K): the same key that opens the drawer closes it. `/` types normally in fields, except the empty library search, where it closes the drawer.
- **Drawer and dice tray share the screen**: on desktop, while the library is open the combat strip's right end and the dice tray step left of the drawer (406px), so Dice and the latest roll stay reachable. On phones the two are exclusive: opening one closes the other.
- **Summons** (`src/lib/summons.ts`, `.inline-summon`): stat block prose like `summon 1 blood bat minion (d10)` or `spiderling minions (1/hero, size: d8)` is parsed into a summon. In the text it becomes a signal-wash run (a wrapping span, so the sentence keeps its shape) ending in a solid signal `+N` badge with the count resolved against the party. The phrase in the stat block is the only summon control: no lane button, no icon. Summoned minions are derived stat blocks (`summon-<summonerId>--<name>`, never saved separately) that open their own lane directly after the summoner, family slot "Summoned by …", no level shown, attack = `1d<die>` under minion rules, excluded from the difficulty budget. New rows arrive in a signal-wash that settles into the sheet (1.3s) with the turn-box stamp. A summoner's "bats roll d20s instead of d10s" in Bloodied/Last Stand text becomes the summoned lane's live phase paragraph and swaps its roll die. Undo in the toast takes a summon back; Reset combat dismisses summons.
- **Monster Forge** (`src/MonsterForge.tsx`, `src/lib/forge.ts`, `.forge-*`): the homebrew builder, opened from the library footer ("Forge a monster"), or from a library preview as Edit (homebrew) or Remix (any stat block, opened as a copy). A near-full-screen sheet with a black head bar holding the one orange roll button (Surprise me: a random legal monster near the party's level). Controls sit on the ivory sheet on the left; on the right the monster's real lane sheet (name bar, strike, statline, stat block with working rolls) lies on the table ground and redraws with every tap. Each choice comes from the GMG building rules: a 23-chip level row (¼ to 20) whose HP and damage source rows wear dashed ember outlines with tiny `HP` / `DMG` labels; armor tiles that show the table HP for each column; a Tank and Glass cannon slider that shifts damage and HP rows in opposite directions; six die tiles labeled with the GMG themes (d4 Undead … d20 Mightiest); one or two attacks; 41 flavorful abilities as chips grouped Offense, Defense, Control and Movement, with a segmented choice of how each one is paid for (+1 level, −1 HP row, −1 damage row). Pointing at or focusing an ability chip reads its text in a sheet-2 peek box under the chips. The Build slider is a two-way scale: a neutral track with a center mark and an orange thumb, not a fill. Every number can be overridden (Exact HP, a per-action roll that leaves "Table" for a hand-typed roll) and every word edited. Selected tiles and chips fill solid ink (ivory in dark theme), never orange. A sticky footer tallies name, level, HP and roll beside Cancel, Save to library and the orange Add to encounter; saving without a name focuses the name and says so in ember text instead of disabling the buttons. When stacked, the tally is a button that scrolls to the sheet. The forge traps Tab and returns focus to its opener. The forge stores its draft on the homebrew monster (`monster.forge`) so Edit reopens the exact controls. At 1020px and below it becomes one scrolling column with the sheet last; on phones it fills the screen and the footer keeps the tally and both save buttons.
- **Rules versions** (`src/lib/rulesets.ts`, `src/lib/changelog.ts`, `.printing-plate`, `.ref-list`, `.changelog`): Nimble Co. revises its rules between printings, and every encounter stores the rule set it runs under (`nimble-jul26` July 2026 Changelog, `nimble-1p` First Printing). New encounters get the newest; saves without the field stay First Printing; an unknown id is refused on import and held verbatim in storage. Stat blocks are the First Printing's in every version. The rules dialog is three parts. (1) A sheet-2 plate, "Rules for <encounter>" in display serif, over a hairline-divided radio list, newest first, with an ink `NEWEST` tag; switching commits with an Undo toast and never touches HP. No explanatory note under it. (2) A three-way segmented tablist (`.rules-tabs`, same track as the forge segments; the drawer's difficulty info button opens it on Building). **Building** works out GMG v1 encounter guidance for the current party: the budget in a lead line, then the difficulty tiers (`.tier-list`: difficulty dot, name, the tier's monster levels for this budget in large tabular numerals, what to expect and how often a session; the encounter's own tier sits on sheet-3 with an ink `THIS ENCOUNTER` tag), monsters per hero / solo boss / armor mix / fights per session, minion waves counted for this party, a six-cell minion die strip with the party's level cell in solid ink, and a two-column Harder / Easier tuning list. **At the table** opens with the Overkill switch (see Minion hordes), then definition grids: Monster armor (from the rule set), HP field commands as `kbd` tokens, Dice, Minions, Legendary monsters. (3) **What changed** is a timeline of Nimble's releases, newest first: a 1px rail with an 11px node per release (solid ink = this encounter, ink ring = in the app, dashed ink-3 ring = playtest not in the app), the release name in display serif, then date and an uppercase status tag, a one-line summary, and change rows grouped under small tracked uppercase section labels, each row `what … ~~from~~ → **to**` with the delta right-aligned and capped at 64% width. A future release adds data, not markup. The drawer's difficulty caption names the rule set; switcher rows name it only when it is not the newest. No board chip, and never orange or the HP ramp colors.
- **Segment on-state** (`--segment-on`): the selected button in segmented tracks (party tabs, forge segments) is `--sheet` in light theme and a lifted `#4d4238` in dark, so the selection reads raised rather than sunken on the `--sheet-3` track.
- **Minion hordes** (`src/lib/horde.ts`, `hordeView` / `packRoll` / `HordeRoll` in `src/main.tsx`, `.horde`, `.pack-*`, `.horde-*`): a minion stat block thinks in packs (GMG v1 p. 26), not creatures. Packs stack as bands under the name bar, divided by hairlines (8px 10px 9px 12px padding). Until the GM splits a horde every minion sits in one implicit pack with no chrome: no name, no ⋯ menu, and its rolls stay floated in the stat block. Split packs are auto-named Pack A, Pack B….
  - **Pack head** (32px row): the 30px turn box, which fills itself (solid ink, check) once nobody is left to act and greys to sheet-3 when nobody stands; tapping it marks the rest as holding back, tapping again hands the pack its actions back. Then, for split packs, an inline name input (17px 800, borderless until hover/focus, at most 14ch). Then the count in ink-2 600: "**N** of M standing" (the "of M" only once some have fallen) plus "**N** to act" while some have acted, the numerals 20px 800 ink tabular; a fully acted pack shows a tracked uppercase `DONE` label instead. Then the 66px, 32px-tall Hit / Kill # field (sheet-2, signal border and wash halo on focus, Enter applies; "Kill #" takes how many fell, "Hit" takes damage under overkill), then the ⋯ icon button.
  - **Tokens** (`.horde-token`): 34px circles, 2px border, 15px 800 tabular index, 6px gaps, in the sheet's own neutrals. Ready is ivory sheet with a rule-strong ring; acted sinks to sheet-3 with ink-3 numerals; fallen is a transparent dashed skull at 60%; picked (move mode) is solid ink with sheet numerals. A condition shows as a 9px ink dot with a sheet ring at the top right, never orange (Press-or-Roll). The turn-box stamp plays only on tokens a roll or hold just marked; summoned arrivals take the summon wash. Tapping a token defeats it (any damage kills a minion) and tapping again brings it back.
  - **Pack rolls** (split packs): one row per action, display serif 16px 800 name left, `HordeRoll` right. Every action draws on the same pool: one action per minion per round, whichever action it uses.
  - **Pack round log** (`.pack-log`): one 28px line per roll, ink-2 15px "N× Stab → **total**", the total in display serif 22px 900 tabular (ink-3 "miss" on a miss), "· N missed" in ink-3 13px on partial hits, "**N** held back" for a held turn, and a 28px ✕ at the right that takes the entry back and hands exactly those minions their action again.
  - **Move mode** (lane action "Move", or M on a focused token): a sheet-2 bar under the name bar reads "**N** picked · move to" (or "Tap minions to pick them"), then 32px outline targets for each pack, "+ New pack", and an ink-filled Done. Tokens become pick toggles.
  - **Drag between packs**: tokens drag (the picked set, or the one token) under their own data type so the board's lane drop never claims them. A pack under the drag takes the 2px dashed signal outline (inset 2px) over a signal-wash fill; a 44px "Drop here for a new pack" zone with the same dashed signal border and ember text appears below the packs while a drag is in flight.
  - **⋯ menu** (split packs): an inline sheet-2 strip under the head, a tracked uppercase "Merge into" label, a 32px outline button per other pack, and "Split in half" pushed right (standing minions shared out evenly; offered only with two or more standing). Every reshape lands with an Undo toast.
  - **Overkill** (`encounter.overkill`, `.rule-switch`): an optional GMG rule, set per encounter by a switch in the rules dialog's At the table tab: an ivory 1px rule-strong bordered row (sheet-2 hover, inset signal focus outline), an 18px ink-accented checkbox, the 17px 800 title and an ink-3 14px explanation. When on, the Hit field takes damage and ⌊damage ÷ die⌋ minions fall (at least one) within that pack only; those still to act fall first so the "to act" pool stays honest.
  - **Summons and rounds**: summoned minions arrive as their own pack (when the lane already has minions, both groups become named packs). Next round clears acted marks and every pack's log but keeps the packs.
  - **Touch**: on coarse pointers tokens grow to 42px and pack controls (name, Hit field, ⋯, move targets, menu buttons) to 40px; the log ✕ to 40 × 36px.
  - **Keyboard**: one tab stop per pack (its first token); arrow keys walk the tokens across the horde; M on a token enters move mode with that token picked.
- **Sharing homebrew** (`src/lib/share.ts`, `.incoming-*`, `.library-files`): a homebrew preview's footer adds an outline Share button (link icon) between Edit and Add to encounter; it copies a `#monster=` link (deflate-raw + base64url in the fragment, never sent to a host) or opens the share sheet on touch. Opening such a link, or pasting one into the library search (placeholder "Search, or paste a monster link…"), opens the standard preview dialog for the shared stat block with working rolls; the bottom bar's ink-3 note reads "Shared homebrew · not saved yet" beside outline Save to library and solid Save & add. When the library holds a different version with the same id, a sheet-2 strip above the bar says so and offers a forge-segment choice, Replace mine / Keep both ("(shared)" suffix); an identical copy reads "Already in your library" with only Add to encounter. The strip and bar stick to the dialog's bottom together. The Bestiary footer pairs Forge a monster with right-aligned ghost Import and Export (Export only once homebrew exists); the Homebrew shelf footer drops Export for its own select mode. Import opens an "Import monsters" modal (`.import-*`): a "Paste a link" URL field (the text-field: 42px, sheet-2, signal focus ring) with an ink-3 hint naming what it reads; an unreadable link or a failed Nexus fetch swaps the hint for an ink-2 message behind an ember Info icon (the drawer-warning voice, never the reserved red). The bar holds outline "Choose a file…" and solid "Import link", which reads "Fetching from Nexus…" (signal, progress cursor) while the dialog waits; it closes only once the monster or collection arrives. The encounter picker's Import still goes straight to the file dialog. A one-monster file opens the same preview, several merge with one Undo toast. Export opens the Homebrew shelf in select mode with every homebrew ticked (see Homebrew shelf); files carry the stat block only, never the shelf's browser bookkeeping. Links use a packed wire format (`y`): positional arrays, defaults dropped, forge abilities by id, and a forge-built monster sent as its controls alone and rebuilt on arrival; older `z` links still open. Everything read from a link or file is whitelisted to stat-block fields; summon wiring never travels, and the only source links kept point to nimble.nexus. **Nimble Nexus** (`src/lib/nexus.ts`): a nimble.nexus or nimblenomi.com monster or collection link, pasted in the Import modal or the search, shows a "Fetching… from Nimble Nexus" toast; one monster opens the incoming preview (its note reads "Not saved yet"), and a collection merges into the library with one Undo. The fetching toast clears when the result lands. Imported stat blocks have the id `homebrew-nexus-<id>`, and their source line (in both the library and the incoming preview) reads "Homebrew by <creator> · Nimble Nexus" with the Source link.
- **Homebrew shelf** (`src/lib/homebrew.ts`, `homebrewShelf()` in `src/main.tsx`, `.library-tabs`, `.brew-*`): the library drawer opens with a two-tab segmented track (a real tablist with arrow, Home and End keys and roving focus; the rules-tabs track: sheet-3, `--segment-on` selection), **Bestiary N** and **Homebrew N**, each with a small tabular count badge that turns solid ink on the selected tab. Bestiary is the familiar list (homebrew still appears there with its tag; the category select lost its Homebrew option). The search field is shared and reads "Search your homebrew, or paste a link…" on the shelf. Tab, sort and grouping are remembered per browser (`localStorage['nimble-nasties-library']`).
  - **Tools row**: two 40px selects with a tracked uppercase ink-3 key inside the field (`SORT` Recent / Name / Level, `GROUP` None / Family / Source) and a ghost "Select" button. Recent means last saved first.
  - **Rows**: the library row (level badge, 17px 800 name) whose meta line separates family, kind tag, origin ("Forged", "Nexus · <author>", "Shared link", "From a file") and an ink-2 bold "in N encounters" with hairline-coloured middle dots, on one line: a Nexus author truncates first, then the family; origin words, kind tags and usage never truncate. The grouped-by field is dropped from the line. Then a 34 × 40px ink-3 pencil (Edit in the Monster Forge), a ⋯ toggle, and the signal-wash `+`. Rows stay draggable onto the board.
  - **⋯ strip**: the row and an inline sheet-2 strip under it join into one 6px-rounded block; a 2 × 2 grid of 34px outline buttons aligned under the name: Duplicate, Share link, Export (one JSON file), Delete in Last Stand red. When the stat block fields creatures, Delete spans the row and says what goes with it ("+2 creatures") before the press. Escape closes it before the drawer.
  - **Group heads**: sticky 12px 800 tracked uppercase labels with an ink-3 tabular count over a hairline; Source groups order Forged, Nimble Nexus, Shared link, From a file.
  - **Select mode**: the tools row becomes "**N** of M selected", an ember Select all / Select none and an ink-filled Done. Rows become ink-accented checkbox labels at full ink (ticked rows take the sheet-2 tint; nothing dims, because dimming means acted); the footer becomes a bulk bar: outline Delete in red with its "+N creatures" cost, outline Copy link for one or "Share N" for several (the share sheet gets one JSON file on touch, elsewhere one link per monster goes to the clipboard), and the solid "Export N" ("Pick monsters" disabled at zero). A bulk delete takes the creatures those stat blocks fielded and lands with one Undo toast.
  - **Arrivals**: a forge save, a saved link, an import or a duplicate switches the drawer to the shelf and washes the new rows in (the summon wash, 1.3s, with the stamp on the level badge). A duplicate lands directly under its original as "<name> (copy)", numbered when taken.
  - **Empty shelf**: a 28px display-serif "Your own monsters live here", one ink-2 line naming the three ways in, and solid Forge a monster beside outline Import.
  - **Bookkeeping**: homebrew carries `origin` (forge, link, file, nexus) and `edited` in browser storage only, stamped by every save path (forge, saved link, import, duplicate); every export strips both.
- **Library browse** (`src/lib/browse.ts`, `quickFilters()` in `src/main.tsx`, `.lib-quick`, `.lib-summary`, `.lib-views`): one search, one chip row, one count line.
  - **Search** reads more than names: words match name, then family, kind or armor ("heavy"), then ability names, then ability prose at a word start (so "or" never hits "for"), and every word has to land somewhere. Levels come out of the query (`3`, `lv 3`, `2-4`, `<=3`, `5+`, `1/4`) and show as a sheet-3 token in the count line. Results rank by best landing while searching A–Z. Matched letters in a name turn ember (`--signal-text`, no fill); a match found only in an ability appends its name to the meta line in ink-2 bold ("· Poison Blade"); on a homebrew row it takes the family's place, since that line never wraps.
  - **Quick filters**: 32px (40px touch) outline chips, Standard / Minions / Legendary / Fits budget, one at a time; a second tap lets go. The pressed chip is solid ink, never orange (Press-or-Roll). Fits budget keeps standard monsters at or under the levels left before Hard and adds a "≤ N left" token; it disables once the budget is spent. The chips filter the homebrew shelf too, and hide while that shelf is empty.
  - **Count line**: "**N** of M" with an ember Clear while anything narrows, "**M** monsters" otherwise; at the right, text tabs A–Z / Level / Family with a 2px ink underline on the chosen one (remembered with the library tab). Level and Family reuse the sticky `.brew-group` shelf heads; Family sorts by level inside a shelf and folds one-member families into Lone monsters and legendaries into Legendary.
  - **Rows** show "×N" in ink-2 tabular before the add button while that stat block fields creatures in this encounter.
  - **Empty result** names what was searched and, when a chip hides matches, offers "Show N more outside <chip>" before the search hint.
  - **Keyboard**: ↓ from the search walks into the results, ↑/↓ move between rows, ↑ from the top row returns to the search, Enter in a non-empty search opens the top result.
