# Match the CryptoCore wallet shell

## What changes

1. Replace the current two separate currency tiles with one full-width **Balances** wallet card, matching the reference layout:
   - green-tinted glass/pixel surface using ARCOON tokens
   - wallet icon and Balances label
   - Gold as the primary balance
   - divider and Shards as the secondary balance
   - the entire card acts as the wallet trigger

2. Add the reference wallet interaction adapted to ARCOON:
   - clicking the balance card opens a wallet dialog
   - show current Gold and Shards balances prominently
   - provide clear Gold and Shards sections using existing game data
   - avoid blockchain deposit/withdraw controls because ARCOON currently stores game currency locally

3. Align the complete sidebar shell with the reference ordering and behavior:
   - brand and collapse control
   - avatar dropdown and mail action
   - divider
   - wallet balance card
   - navigation
   - About Arcoon at the bottom
   - collapsed mode uses a centered wallet icon that opens the same dialog

4. Update `/test-ui` so expanded and collapsed wallet states remain part of the UI reference gallery.

## Technical details

- Keep the existing local progress system and currency rules unchanged.
- Reuse the current dialog, token colors, pixel type, and semantic green shell tokens.
- Preserve the removed Character sidebar item; Character remains available from the avatar dropdown.
- Verify the expanded shell, collapsed shell, wallet dialog, and `/test-ui` at desktop and narrow widths.
