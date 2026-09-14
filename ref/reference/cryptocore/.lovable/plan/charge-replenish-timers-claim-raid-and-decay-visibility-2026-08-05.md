# Charge replenish timers (claim + raid) and decay visibility

Right now the vault card and the Raids header both show a flat "+1 every 4h" with no live countdown, so after claiming or raiding you can't tell when the next charge lands. The charge math already tracks the regen clock — it just isn't surfaced, and it has a bug that makes the first charge after a long idle stretch come back instantly.

## What changes

### 1. Live countdown next to charges
- Vault card: replace "+1 every 4h" with "Next charge in 3h 12m 40s" (and "Charges full" at max), ticking every second.
- Raids header: same countdown next to `Charges: 7 / 8`.
- Both read the existing per-clock value, so claim and raid timers stay independent (claim uses the claim clock, raid uses the raid clock).

### 2. Fix the regen clock so the timers are honest
When charges sit at max, the regen timestamp goes stale. Spending a charge then immediately refunds one, because the elapsed time since that stale timestamp is already hours. Fix: when charges are at max, anchor the regen clock to now, so spending a charge starts a real fresh 4h wait — exactly what the countdown displays.

### 3. Show the mining decay state
Hash rate already decays when a player stops sinking HASH (14-day grace, -10%/week, 25% floor), but nothing tells the player. Add to the vault card, only when decay is active: a small warning line such as "Rate reduced to 78% — upgrade or buy a chest to reset decay", plus time until the next decay step. During the grace period, no clutter.

### 4. Raid charge cap decay
The raid charge cap already shrinks by one per 5 idle days (min 1). Surface that in the raid header when the cap is below max, so a shrinking `/ 8` isn't mysterious.

## Technical notes

- New 1s ticking hook (`useNow`) so countdown text re-renders without touching the mining tick loop.
- `src/game/charges.ts`: clamp `lastRegenAt` to `now` when `current >= max`; `msUntilNext` semantics unchanged.
- `src/stores/playerStore.ts`: `claim()` and `spendRaidCharge()` already persist `lastRegenAt` from the snapshot, so they inherit the fix.
- Display work in `src/components/game/VaultCard.tsx` and `src/features/raid/RaidTable.tsx`; reuse `formatDuration` from `src/lib/format.ts`.
- `src/hooks/useGameStats.ts` already returns `claims`, `raids`, and `decay` — no store shape change, so existing saves keep working.