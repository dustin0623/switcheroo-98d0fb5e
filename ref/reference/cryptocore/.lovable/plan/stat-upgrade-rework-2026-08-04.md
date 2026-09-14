# Stat upgrade rework

Split the six stats into two upgrade paths, matching how Mythoria/TerraCore does it.

## 1. Directly upgradeable stats (BITSOL cost, level-based)

| Our stat | Mythoria equivalent |
|---|---|
| Hash Rate | Engineering (mining) |
| Hack Power | Damage |
| Security | Defense |

These keep the current permanent-stat tiles and the `level²` cost curve. Only these three
appear in the "Permanent stats" grid on the dashboard.

## 2. Indirect stats (no direct upgrade button)

| Stat | Source | Mythoria equivalent |
|---|---|---|
| Luck | Vault level (staked BITSOL) | Luck from staked SCRAP |
| Firewall | Vault level (staked BITSOL) | stash / defensive scaling |
| Exploit | Burned BITSOL (new sink) | Favor from burning SCRAP |

Luck and Firewall are derived read-only values, plus whatever gear rolls add. Their tiles
show the value and how to raise it ("Expand vault", "Burn BITSOL") instead of an upgrade button.

### Vault → Luck & Firewall

Vault expansion already exists and already costs BITSOL, so we keep it exactly as-is and simply
derive the two percentages from `vaultLevel` using a diminishing-returns curve, mirroring
Mythoria's stepped halving on staked SCRAP: early levels give the most, later levels give less.

### Burning → Exploit

New sink, permanent and irreversible. Name for the burned-value counter: **Notoriety**
(alternatives if you prefer: Reputation, Infamy, Cred). 1 BITSOL burned = 1 Notoriety, forever.

Notoriety drives Exploit today (diminishing curve, capped) and is reserved for future
gates — access tiers, seasonal leaderboards, higher chest tiers, quest unlocks.

Burning is exposed as a modal on the dashboard next to the Vault card:
- Shows current Notoriety, current Exploit %, and the Exploit % after the burn.
- Amount input with quick presets (25 / 100 / 500 / Max wallet).
- Confirm step, since the burn is permanent.

## Technical notes

- `src/types/game.ts` — add `notoriety` to player state; stats union unchanged.
- `src/stores/playerStore.ts` — add `notoriety`, `totalBurned`, and a `burn(amount)` action
  that debits the wallet, increments notoriety, and counts as a sink (resets decay timer).
- `src/game/stats.ts` — add `luckFromVault(vaultLevel)`, `firewallFromVault(vaultLevel)`,
  `exploitFromNotoriety(notoriety)`; base stat levels for luck/firewall/exploit are replaced
  by these derived values before gear is summed.
- `src/stores/playerStore.ts` — `upgradeStat` restricted to hashRate / hackPower / security.
- New `src/components/game/BurnModal.tsx`; dashboard renders it beside the Vault card.
- `src/features/dashboard/DashboardPage.tsx` — permanent-stats grid drops the three derived
  tiles into a separate read-only row with "how to increase" hints.
- Existing saved players migrate: derived stats recomputed from `vaultLevel` / `notoriety = 0`.

## Balance defaults (tunable)

- Luck: `+2%` per vault level, halving every 5 levels.
- Firewall: `+1.5%` per vault level, halving every 5 levels, cap 60%.
- Exploit: starts 1%, `+1%` per 100 Notoriety with halving steps, cap 25%.
