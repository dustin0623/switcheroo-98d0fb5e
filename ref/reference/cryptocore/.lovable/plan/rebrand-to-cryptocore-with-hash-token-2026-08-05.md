# Rebrand to CryptoCore with $HASH token

Rename the game from BITSOL to **CryptoCore** and the currency from BITSOL to **$HASH** across the whole app. Sparks stays as the salvage currency.

## What changes for players

- Game name in the sidebar, page titles, about modal, connect screen and browser tab becomes **CryptoCore**.
- Every balance, vault, reward, cost and marketplace price now reads **HASH** instead of BITSOL.
- Copy that referenced "the BITSOL mine" and similar is rewritten to fit CryptoCore / HASH wording.
- Existing saved progress in the browser is preserved — save keys are renamed with a migration so nobody loses their rig.

## Technical scope

- Text/label replacement of `BITSOL` -> `HASH` and game-name strings -> `CryptoCore` across `src/` (44 files: routes, features, components, stores, game logic, constants).
- Rename helper `formatBitsol` -> `formatHash` in `src/lib/format.ts` and update all call sites.
- Rename `BITSOL_*` constants in `src/constants/game.ts` and `src/game/*` to `HASH_*`.
- Persist keys in `src/stores/*`: `bitsol.player` -> `cryptocore.player`, same for settings, equipment, chests, notifications, and `bitsol-auth` -> `cryptocore-auth`. Add a one-time migration copying the old localStorage value to the new key so current saves carry over.
- Update route `head()` titles/descriptions in every route file (`index`, `chests`, `inventory`, `marketplace`, `profile`, `settings`, `__root`) to unique CryptoCore-branded copy.
- Update the branding comment in `src/styles.css` and the `README.md` intro.
- Rebuild to confirm the route tree and typecheck pass.

## Not included

- No logo/artwork regeneration and no gameplay or balance changes. Say the word if you want a matching logo and favicon.