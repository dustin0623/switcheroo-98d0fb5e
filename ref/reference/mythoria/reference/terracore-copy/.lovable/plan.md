# Making Terracore Playable on Zustand

Right now the app is a **read-only viewer**: every route just fetches mock JSON via `useGameStore.fetchX` and renders it. Nothing mutates. This plan turns it into an actual single-player game where the active citizen mines, claims, upgrades, battles, opens crates, forges, salvages, equips, and runs quests — all driven by Zustand actions that implement the formulas in `TERRACORE_GAME_MECHANICS_3.md`.

Marketplace (`market.*`, `market_logs`) stays exactly as it is: read-only mock listings and logs, no buy/sell/list actions.

---

## Scope — what becomes interactive

Implemented as real actions on the Zustand store:

1. **Mining & Claim** (docs §6, §7) — passive `minerate` accrual capped by `stashsize`, `claim` action that consumes a claim charge, moves scrap → balance, logs it.
2. **Stat Upgrades** (§8) — `upgradeEngineering/Damage/Defense` with the exact cost curves and favor gain.
3. **PvP Battle** (§9) — `attackPlayer(target)` running dodge → attack% → stash-cap → apply outcome, decrement attack charge, log battle. Opponents = other citizens in the roster.
4. **Boss Fights / Planets** (§10) — `fightBoss(planet)` with favor gate, FLUX cost, cooldown slot, RNG hit/miss, relic drop on miss, crate drop on hit.
5. **Crate Open** (§12) — `openCrate(crateId)` running rarity upgrade ladder + attribute formula, mints a new `Item` into inventory, writes an `NftLog`.
6. **Equip / Unequip** (§13) — `equipItem(item_number)` / `unequipSlot(slot)` swapping into the correct `EquippedSet` slot and recomputing `player.stats`.
7. **Salvage** (§14) — `salvageItem(item_number)` removing the item, adding FLUX per the yield formula, writing a `SalvageLog`.
8. **Forge** (§15) — `forgeItem(item_number)` with the FLUX cost curve, level +1, attribute bump, `ForgeLog` entry.
9. **Quests** (§16–§18) — `startQuest(slotIndex)` snapshots equipped stats and pays scrap; `collectQuest(questId)` runs the full reward pipeline (rolls → draws → loot table → jackpot → guaranteed legendary → anti-farm) and grants relics + XP. The daily board comes from the existing mock.
10. **Consumables** (§24) — `useConsumable(type)` sets the matching `*_times` timers and applies buffs consumed by battle/quest math.
11. **XP & Leveling** (§29) — every action that awards XP funnels through one helper that levels the player up when thresholds are crossed.

Everything else — marketplace listings, marketplace logs, leaderboard, all `$user.*` log viewers — keeps its current fetch-and-render behavior.

## Non-goals

- No blockchain, no server, no persistence beyond in-memory Zustand (optional `persist` middleware later).
- No marketplace buy/sell/list. No inter-player trading.
- No lb-rewards cycle, no oracle TWAP, no leaderboard payouts (§19, §20, §26). We keep the mock leaderboard as-is.
- No registration flow — the 10 mock citizens are the roster.

---

## Architecture

```text
src/stores/
  game-store.ts          ← keep as the seed loader (unchanged shape)
  actions/
    mining.ts            ← claim, tickMinerate
    upgrades.ts          ← upgradeEngineering/Damage/Defense
    battle.ts            ← attackPlayer
    boss.ts              ← fightBoss
    crates.ts            ← openCrate
    items.ts             ← equipItem, unequipSlot, salvageItem, forgeItem
    quests.ts            ← startQuest, collectQuest
    consumables.ts       ← useConsumable
  selectors.ts           ← derived values (currentStash, effectiveStats, cooldownRemaining, xpToNext)
  rng.ts                 ← deterministic RNG (§25) seeded from action+timestamp
  formulas/
    mining.ts  upgrades.ts  combat.ts  crates.ts  quests.ts  xp.ts
```

Rules:
- **Formulas are pure functions** taking primitives and returning primitives — trivially unit-testable and mirror the doc section-for-section.
- **Actions are the only mutators.** They read the current player via `get()`, call formulas, then `set()` an immutable update. Every action also appends to the relevant `*Logs` array so the existing log routes keep working.
- **Selectors, not derived state.** `currentStash`, `effectiveStats`, quest `time_remaining_ms`, etc. are computed on read, not stored.
- **Time source is `Date.now()`** wrapped in `src/lib/clock.ts` so tests can inject a fake clock later.

## Data flow changes

- `fetchPlayer/Inventory/Quests/...` become **seed-once** loaders: on first call for a user they populate the store from the mock API; after that all mutations are local. Refetch buttons in the UI (if any) become "reset user" instead.
- Cross-user state (marketplace, leaderboard, market logs, quest board) keeps the current fetch-and-cache behavior.
- The `activeUser` continues to drive which player the game screens (`/play`, `/planets`, `/quests`, `/shop`) act on.

## UI wiring (minimal)

Only the screens that already exist get new buttons. No new routes.

- `/play` — Claim button, Attack-random-citizen button, stat upgrade buttons, use-consumable buttons.
- `/planets` — per-planet Fight button (favor + FLUX gated) with cooldown state.
- `/quests` — Start on each board slot, Collect on each active quest.
- `/shop` (crates) — Open button per owned crate. Buying crates stays out of scope for now (marketplace is view-only).
- Inventory (`$user.items`) — Equip/Unequip/Salvage/Forge buttons on each item, active only when `activeUser === user`.

All buttons call a store action and rely on the existing selectors to re-render.

## Sequencing

1. **Foundation** — `rng.ts`, `formulas/*`, `selectors.ts`, `lib/clock.ts`. No UI yet; verify with a scratch test route.
2. **Player-only loops** — mining/claim, upgrades, XP helper. Wire into `/play`.
3. **Inventory loops** — equip/unequip/salvage/forge + crate open. Wire into inventory + `/shop`.
4. **Combat** — PvP battle, then boss fights + planets.
5. **Quests** — start/collect using the existing mock board.
6. **Consumables** — timers + their effect on combat/quest formulas.
7. **Polish pass** — toasts on every action, disabled states from selectors, log routes verified to show new entries.

Each step ends with the affected route(s) verified in the preview.

## Decisions (resolved)

1. **Persistence** — progress survives refresh via Zustand `persist` to `localStorage`.
2. **Time compression** — keep real time (no scaling).
3. **Opponent pool for PvP** — add a target picker on `/play`.

