# Capybara Delve

A 2D roguelike dungeon crawler. Combat is automatic, loot is Diablo-style, and your party is built up Dungeon Siege-style. Every member of the party is a capybara.

You start as one small capybara with a bad weapon. As you go down through procedurally generated floors, you rescue other capybaras, equip them with loot, level them up, and turn them into a strong adventuring party. Then everyone dies and you start a new run.

## Running the game

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm run dev
```

Then open the URL that Vite prints (usually http://localhost:5173).

To make a static production build:

```bash
npm run build      # output goes to dist/
npm run preview    # serves dist/ locally
```

`dist/` is plain static files and can be hosted on any static web host. The game needs no backend, no API keys and no network access. All art, music and sound are generated procedurally at runtime.

## Branch workflow

Feature branches can be integrated into `develop` for batch testing. Stable changes go to `master`.

## How to play

| Input | Action |
| --- | --- |
| **WASD** / **Arrow keys** | Move your lead capybara |
| **I**, **Tab** or **B** | Open the party & bag screen (pauses the game) |
| **Esc** / **P** | Pause menu (volume, screen shake, restart, main menu) |
| **F** | Toggle fullscreen |
| **M** | Mute |
| **1–3** | Pick a talent when one is offered |
| **Enter** | Start / new run |

- **Attacks are automatic.** Your capybaras choose their own targets. Your job is to position the party, kite enemies, and choose where to go.
- **Recruit capybaras.** Look for caged or campfire capybaras (marked with a `?` and a green dot on the minimap). Walk up to them to recruit. The party holds up to 5.
- **Classes:**
  - **Vanguard**: cleaving melee tank; enemies prefer to attack it.
  - **Ranger**: fast, long-range arrows.
  - **Embermancer**: exploding fireballs that set enemies on fire.
  - **Herbalist**: wears an orange and heals the party with periodic pulses.
  - **Stormrunner**: dashes in and hits with chain lightning.
- **Loot** drops from enemies, chests, pots and bosses in five rarities, from Common to Legendary. Open the bag with **I**. A green ▲ marks an upgrade, and **Auto-Equip Best** handles the details if you'd rather not. You can salvage unwanted items for XP.
- **Levels:** XP gems are shared by the whole party. Every 3rd level, a capybara picks a talent.
- **Floors:** find the stairs on each floor to go deeper. Every 3rd depth has a **boss lair**. Beat the boss to open a portal. Floors get harder the deeper you go, and reinforcements keep arriving the longer you stay on one.
- **Hot springs** heal your party. Capybaras love hot springs.
- **Death is permanent.** A fallen capybara is gone for the rest of the run, but their gear goes back into the bag. When the whole party falls, the run ends and you get a summary.

Settings and your best run are saved in the browser's localStorage. Runs themselves are never saved.

## Project layout

```
src/
  main.ts            boot: fonts, Phaser config, texture generation
  title.ts           title screen campfire diorama
  data.ts            classes, enemies, bosses, talents, names, biomes
  items.ts           item bases, affixes, legendaries, generation
  stats.ts           stat computation, XP curve, power scores
  dungeon.ts         procedural floor generation
  audio.ts           synthesized SFX + generative music (Web Audio)
  art/               procedural canvas art (capybaras, monsters, tiles, props, icons)
  game/GameScene.ts  the game: party AI, combat, enemies, loot, floors
  game/boss.ts       boss attack patterns
  game/fx.ts         particles, damage numbers, lightning
  game/lightmap.ts   dynamic lighting
  ui/                DOM user interface (HUD, bag, menus) + styles
tests/               headless-browser test scripts (Playwright)
```

## Automated tests

The `tests/` scripts drive the game in headless Chromium through Playwright. To run them, start the dev server (`npm run dev`), install the browser once (`npx playwright install chromium`), and then run:

```bash
node tests/smoke.mjs          # title -> start -> move
node tests/ui_flow.mjs        # bag, equip, pause, talents, recruit, squad wipe, new run, menu
node tests/bot.mjs --secs=180 # an autonomous bot plays the game (add --god for invulnerability)
node tests/bosses.mjs         # jumps to each boss lair and fights it
```

The page exposes test hooks only when the URL contains `?test`.
