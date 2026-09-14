# Complete Test UI gallery

## Goal
Rename the current `/test-modals` page to `/test-ui` and make it the central visual reference for every interface used by both the Phaser game and the homepage.

## Changes
- Replace the old route with `/test-ui` and update all remaining references to the old name.
- Add clear Phaser and Homepage gallery sections with an easy switch between them.
- Keep the Phaser section interactive and include the battle HUD, loading, wave break, level-up, skill tree, victory, defeat, progress bars, and representative active/boss/disabled states.
- Add a complete shared-style reference showing dark/light panels, labels, default/green/red buttons, disabled controls, currency readouts, rarity and level treatments, filters, fields, progress bars, equipment tiles, and locked/selected states.
- Add the full homepage shell inside the gallery so World, Inventory, Enchantment, Book, Character, Marketplace, sidebar states, header, drawers, tabs, and popovers can all be reviewed in their real layout.
- Keep gallery actions isolated from saved player progress wherever a test action could purchase, salvage, level, or claim something.

## Technical details
- Reuse the real production UI components rather than maintaining look-alike samples.
- Add a gallery-safe mode or sample progress input to the homepage shell where needed, preserving normal `/` behavior.
- Give `/test-ui` unique page metadata and retain one accessible page heading.
- Verify `/test-ui` and `/` at desktop and narrow widths, including interactive tab switching and browser console errors.
