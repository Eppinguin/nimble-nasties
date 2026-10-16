# Nimble Nasties

An encounter tracker for [Nimble RPG](https://nimblerpg.com/) built around stat blocks instead of an initiative list. Each monster type in the fight gets its own column with its full stat block, and the HP, conditions and turn marker for every copy sit on top. You run the fight from there instead of flipping to the book.

## Features

- All 86 monsters from the Nimble GMG, plus your own homebrew
- Type damage into the HP field (`18`, `!18` for a crit, `v18` for vulnerable) and armor is applied for you
- Click any attack or dice in the stat block to roll it. Max rolls explode, a 1 misses, advantage stacks
- Monster Forge for building monsters with the GMG's rules
- Share homebrew as a link, or import from [Nimble Nexus](https://nimble.nexus) by pasting a monster or collection link
- Encounter difficulty budget for your party
- Undo for everything on the board
- Works offline. Everything is stored in your browser, with no account or server

## HP input

Type a command into a creature's HP field and press **Enter**. **Esc** or clicking away discards it.

| Input    | Effect                                                        |
| -------- | ------------------------------------------------------------- |
| `18`     | Deal 18 damage, after armor                                   |
| `d18+5`  | 18 dice damage plus a +5 modifier (matters for armor)         |
| `!18`    | Critical hit, bypasses armor (`^18` does the same)            |
| `v18`    | Vulnerable                                                    |
| `r18`    | Resistant                                                     |
| `+5`     | Heal 5                                                        |
| `-5`     | Lose 5 HP directly, ignoring armor                            |
| `=80`    | Set HP to 80                                                  |
| `100-20` | Set HP to 80 (useful when you add `-20` after the current HP) |

You can combine prefixes, e.g. `!v18`.

Armor follows Nimble's July 2026 changelog by default. Each encounter can switch back to the First Printing rules.

## Undo

Undo and redo are in the combat strip, or use `Ctrl/Cmd+Z`. They cover damage, conditions, turn marks, rounds, removed creatures and deleted encounters. History lasts until you close the tab.

## Saving your data

Everything is saved in your browser as you go. Use **Back up** in the encounter switcher to download a copy now and then. Safari deletes site data after seven days without a visit unless the app is added to the Home Screen.

## Keyboard shortcuts

| Key                        | Action                                   |
| -------------------------- | ---------------------------------------- |
| `/` or `Ctrl/Cmd+K`        | Open or close the monster library        |
| `D`                        | Open or close the dice tray              |
| `Esc`                      | Close panels, menus and dialogs          |
| `Ctrl/Cmd+Z`               | Undo the last change                     |
| `Ctrl+Y` / `Shift+Cmd+Z`   | Redo                                     |
| `Shift+←` / `Shift+→`      | Scroll the board between lanes           |
| `←` / `→` on a lane handle | Move that lane left or right             |
| `↑` / `↓`                  | Move through the encounter switcher list |
| `Shift+click` inline dice  | Roll with advantage                      |
| `Alt+click` inline dice    | Roll with disadvantage                   |

`D` puts the cursor in the dice tray's roll field, so you can type a roll and press **Enter**. Pressing `D` again closes the tray, until you start editing the roll.

Inline dice are the rolls that appear inside trait and ability text. For attack rolls, use the `−` / `+` buttons next to the dice instead.

## Development

Requires Node 22.13+ and pnpm.

```sh
pnpm install
pnpm dev          # start dev server
pnpm build        # production build
pnpm check        # typecheck, lint, format check, tests
pnpm test:rules   # rules and data tests
pnpm test:e2e     # browser tests, incl. accessibility and offline (first run: pnpm exec playwright install chromium)
pnpm fonts        # regenerate src/fonts.css after upgrading a @fontsource package
```

Built with Preact, Vite and TypeScript.

## Data source

Monster data comes from [Nimble Nexus](https://nimble.nexus/u/nimble-co/monsters) via [`dstrelau/nimble.monster`](https://github.com/dstrelau/nimble.monster/blob/main/data/official/gmg/bestiary.json). The app uses text only, with no official artwork.

## License

- **Code:** [GNU AGPL v3 or later](LICENSE).
- **Nimble content:** the GMG monsters in [`src/data/gmg.ts`](src/data/gmg.ts), the rules and tables the app quotes, the Nimble name and the "Powered by Nimble" logos belong to Nimble Co. They are used under the [Nimble 3rd Party Creator License v2.0](https://nimblerpg.com/pages/create), not the AGPL. To reuse them, accept that license yourself or ask Nimble Co.

Nimble Nasties is an independent product published under the Nimble 3rd Party Creator License. Nimble © Nimble Co.

This tool is free to use for anyone who already owns the content, is trying the system out, or cannot afford to buy it right now. If you enjoy Nimble and are able, please support the game by purchasing the official content at [nimbleRPG.com](https://nimblerpg.com).
