# Endgame Loot System — "Contracts"

## Decision

**Proposal B ("Contracts") is the selected direction.** This doc has been revised to spec it
out in full. Proposals A and C from the original design menu are kept at the bottom as
alternates/reference, but are no longer the recommendation.

**Key change from the original pitch:** Contracts do **not** drop chests. TerraCore's boss
fights mint a *crate* NFT that still has to be opened later — that's a redundant extra step and
a whole extra collection to model (mint, own, open, delete). Contracts instead roll rarity once
and mint the **gear item directly** into the player's inventory, using the existing `Asset`/gear
generation system (`RARITY_STAT_COUNT`, slot templates, etc.) — no new collection at all.

---

## Why this exists

Epic and Legendary items currently have **no acquisition path**. Chests only sell
common/uncommon/rare (`PURCHASABLE_CHEST_KEYS` in `features/constants/game.ts`), and there is
no boss-fight equivalent yet. Contracts fill that gap as a slow-burn, always-pays-out loop that
sits alongside raids and chests rather than replacing them.

---

## Core loop

1. Player starts a **Contract** from one of 3 types, each gated by a pair of existing stats:

   | Contract type | Stat 1 | Stat 2 | Theme |
   |---|---|---|---|
   | Breach | `hackPower` | `exploit` | Offensive intrusion job |
   | Lockdown | `security` | `firewall` | Defensive contract work |
   | Black Market | `luck` | `exploit` | High-variance fence job |

2. Starting a contract:
   - Costs HASH, scaled by tier (same decay-sink pattern as chest purchases and stat
     upgrades — resets `lastSinkAt`).
   - Requires a **minimum combined total** of the contract's two stats (e.g. Tier I Breach
     needs `hackPower + exploit ≥ 20`; Tier V needs `≥ 140`). This is what makes stat
     investment matter beyond raid power score.
   - Occupies one of the player's **Contract Slots** (starts at 1, unlockable up to 3 — a
     natural future monetization/progression lever, not required for v1).

3. The contract runs for a fixed duration based on tier (no action needed while it runs):

   | Tier | Duration | Min combined stat | HASH cost |
   |---|---|---|---|
   | I | 1h | 20 | 3,000 |
   | II | 4h | 45 | 8,000 |
   | III | 12h | 75 | 18,000 |
   | IV | 24h | 110 | 35,000 |
   | V | 48h | 140 | 60,000 |

   (Numbers are a starting point for balancing, not final — see Open Questions.)

4. When the timer elapses, the player **claims** the contract. Claiming is where the only RNG
   happens — the contract itself always "succeeds" (no fight, no hit/miss). One roll decides
   the rarity of a single gear item, which mints directly into inventory.

There is no failure state. Every claimed contract produces exactly one item. Tier and stat
investment shift the *rarity odds*, not whether you get anything at all.

---

## Rarity roll — reusing TerraCore's real numbers

TerraCore's boss fights already have two rarity curves on file, and both get reused here
instead of inventing new percentages from scratch:

- **Miss curve** (`services/hive-engine/lib/boss.js`, relic rewards): common 70% / uncommon 20%
  / rare 8% / epic 1% / legendary 1%. This is a *guaranteed-payout* curve — it's what TerraCore
  falls back to when the player's boss-fight roll doesn't hit. It's the right shape for our
  lowest contract tier, since contracts always pay out.
- **Hit curve, best planet (Solisar)** (`mintCrate()` planet thresholds): uncommon ≈92.9% /
  rare ≈4.5% / epic ≈1.8% / legendary ≈0.7%, with **no common outcome at all**. This is
  TerraCore's best-case crate roll and is the right shape for our top contract tier.

Tiers I and V below are those two curves **verbatim**. Tiers II–IV are interpolated between
them, preserving the same shape (common fades out, uncommon becomes the floor, epic/legendary
both creep up):

| Tier | Common | Uncommon | Rare | Epic | Legendary | Source |
|---|---|---|---|---|---|---|
| I | 70% | 20% | 8% | 1% | 1% | TerraCore miss/relic curve, verbatim |
| II | 40% | 40% | 15% | 3.5% | 1.5% | interpolated |
| III | 15% | 60% | 18% | 5% | 2% | interpolated |
| IV | 5% | 75% | 14% | 4% | 2% | interpolated |
| V | 0% | 92.9% | 4.5% | 1.8% | 0.7% | TerraCore Solisar hit/crate curve, verbatim |

Implementation-wise this is the exact same shape as the existing `CHEST_LADDERS` roll-table
walk already used for chest opening — a single `roll < cumulative_threshold` walk, just with a
different table per contract tier instead of per chest key. No new roll mechanism needed, only
a new table.

**Luck's role:** rather than gating success (there is no fail state here), `luck` should nudge
the roll itself — e.g. `effectiveRoll = roll - luck * 0.15` — shifting the outcome toward the
better end of the same table instead of toward a binary hit/miss. This keeps `luck` relevant
without reintroducing TerraCore's binary hit/miss mechanic.

---

## What about a new currency?

The original three-proposal pitch gave Contracts a "Fragments" currency whose only job was
buying chests. Since contracts no longer drop chests, that specific role disappears — but
Fragments (or whatever it's named) can still exist as a **small guaranteed side-reward** on
every claim, independent of the item roll, with two possible jobs instead of one:

- **Reroll insurance** — spend N Fragments to reroll a claim that landed on Common/Uncommon
  once per contract. Turns a currency that's earned passively into a lever players can pull
  when they whiff, without touching the chest/collection system at all.
- **Slot unlock** — spend a lump sum to permanently unlock Contract Slot 2 / 3.

This is optional for v1 — the item-drop loop above works standalone without any new currency.
Recommend shipping without it first, adding Fragments later only if claim-only RNG feels too
swingy in playtesting.

---

## Open questions

- **Balancing pass needed** on the Tier table above (HASH costs, stat minimums, durations) —
  numbers here are a reasonable starting shape, not tuned against your current HASH earn rate.
- **Which gear slot does a claimed item land in?** Random slot (matches chest behavior today),
  or should Breach contracts bias toward offensive slots (ASIC Miner, Network Module) and
  Lockdown toward defensive ones (Cooling System, Power Supply)? The latter adds flavor but
  more surface area to build.
- **Contract Slots:** ship with a hard cap of 1 for v1, or land the "unlock up to 3" lever at
  launch? Affects whether this needs its own upgrade-purchase UI on day one.
- **Should claimed Epic/Legendary items be visually distinct** (a border treatment, a "Contract"
  origin tag on hover) so players can flex how they got a piece of gear, the way TerraCore
  crates carry provenance?

---

## Alternates (not selected, kept for reference)

### Proposal A — "Black Sites"
Instant-attack version: burn HASH to attack a rotating roster of servers, roll against `luck`
for hit/miss (TerraCore's exact binary mechanic), hit mints an item directly (same rarity-curve
idea as Contracts above), miss awards a small currency. Simpler to build than Contracts since
there's no timer/slot system, but concentrates value on `luck` alone rather than paired stats.

### Proposal C — "Overclock Duels"
Most novel: wager HASH to duel a procedurally generated rival rig, comparing all six stats with
jitter. Win/loss margin scales item rarity odds directly, so *build quality* — not just
RNG — drives loot. Most original mechanic of the three, but the most balancing work (rival
stat generation needs real tuning so early duels aren't unwinnable and late duels aren't
trivial).
