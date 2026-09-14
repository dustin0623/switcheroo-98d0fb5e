# Shell layout update — sidebar-driven navigation

Reference reviewed: `ref/components/layout/AppShell.tsx`, `SidebarNav.tsx`, `AccountDropdown.tsx`, `ActivityMenu.tsx`.
Their pattern: no content header at all. Everything — brand, account dropdown, mail popover, balances, nav links — lives in the left rail; the content area is a plain scrolling region.

## What changes

1. **Remove the content header**
   The top bar above the pages (gold pill, shard pill, mail button) is deleted. Pages start directly with their banner, so nothing sits between the banner and the top edge.

2. **New sidebar arrangement** (top to bottom, mirroring the reference)
   - Brand row: ARCOON wordmark + collapse toggle (unchanged behaviour).
   - Account row: avatar + name + level as a **dropdown trigger**, with the **mail popover** button beside it.
   - Divider.
   - Currency block: gold and shards, moved down from the old header.
   - Navigation list (World, Inventory, Enchantment, Book, Character, Marketplace).
   - Bottom: XP bar for the current level.

3. **Avatar dropdown** (opens from the account row)
   - Header showing name and level.
   - Character, Settings, Sign out.

4. **Mail popover** (opens from the icon beside the avatar)
   - Panel titled Notifications with a "Mark all read" action.
   - Two tabs: Activity and Market, each listing entries with a read/unread dot and relative time; unread count badge on the icon.
   - Opens to the right of the rail when expanded, below the icon when the rail is collapsed.

5. **Collapsed rail**
   Avatar and mail become centred icons, currency shows icon-only, dropdown and popover flip to open to the right.

## Notes

- Styling stays with the existing pixel panels, fonts and colours — the reference supplies structure only, not its look.
- Mail entries use local placeholder activity for now (no backend), so the panel is fully clickable and states are visible.
- The same components get gallery slots added on `/test-ui` so every state can be reviewed there.
