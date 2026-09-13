/**
 * Armory — buying bows, upgrading their stars and equipping them.
 * Every function takes the saved profile and returns the updated one
 * (already persisted), or the unchanged profile when the action is illegal.
 */
import { BOWS, MAX_STARS, starUpgradeCost, type BowRarity } from "@/features/game/bow";
import { saveProgress, type Progress } from "@/features/game/campaign";

export function ownsBow(progress: Progress, rarity: BowRarity): boolean {
  return (progress.bows[rarity] ?? 0) > 0;
}

export function starsOf(progress: Progress, rarity: BowRarity): number {
  return progress.bows[rarity] ?? 0;
}

/** Buys an unowned bow at 1★ and equips it. */
export function buyBow(progress: Progress, rarity: BowRarity): Progress {
  const cost = BOWS[rarity].unlockCost;
  if (ownsBow(progress, rarity) || progress.gold < cost) return progress;
  const next: Progress = {
    ...progress,
    gold: progress.gold - cost,
    bows: { ...progress.bows, [rarity]: 1 },
    equipped: rarity,
  };
  saveProgress(next);
  return next;
}

/** Spends gold to add one star to an owned bow. */
export function upgradeStar(progress: Progress, rarity: BowRarity): Progress {
  const stars = starsOf(progress, rarity);
  const cost = stars > 0 ? starUpgradeCost(rarity, stars) : null;
  if (cost === null || stars >= MAX_STARS || progress.gold < cost) return progress;
  const next: Progress = {
    ...progress,
    gold: progress.gold - cost,
    bows: { ...progress.bows, [rarity]: stars + 1 },
  };
  saveProgress(next);
  return next;
}

export function equipBow(progress: Progress, rarity: BowRarity): Progress {
  if (!ownsBow(progress, rarity) || progress.equipped === rarity) return progress;
  const next: Progress = { ...progress, equipped: rarity };
  saveProgress(next);
  return next;
}

// ---------------------------------------------------------------------------
// Enchantment — spending Weapon Shards to raise a bow's star level.
// ---------------------------------------------------------------------------

/** Weapon Shards needed to go from `stars` to the next star. */
export function enchantShardCost(stars: number): number {
  return Math.min(Math.max(stars, 1), MAX_STARS) * 5;
}

/** A "Get More" bundle: gold traded for shards. */
export const SHARD_BUNDLE_GOLD = 100;
export const SHARD_BUNDLE = 5;

/** Spends Weapon Shards to add one star to an owned bow. */
export function enchantBow(progress: Progress, rarity: BowRarity): Progress {
  const stars = starsOf(progress, rarity);
  if (stars < 1 || stars >= MAX_STARS) return progress;
  const cost = enchantShardCost(stars);
  if (progress.shards < cost) return progress;
  const next: Progress = {
    ...progress,
    shards: progress.shards - cost,
    bows: { ...progress.bows, [rarity]: stars + 1 },
  };
  saveProgress(next);
  return next;
}

/** Trades gold for a bundle of Weapon Shards. */
export function buyShards(progress: Progress): Progress {
  if (progress.gold < SHARD_BUNDLE_GOLD) return progress;
  const next: Progress = {
    ...progress,
    gold: progress.gold - SHARD_BUNDLE_GOLD,
    shards: progress.shards + SHARD_BUNDLE,
  };
  saveProgress(next);
  return next;
}
