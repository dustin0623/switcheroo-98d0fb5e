/**
 * Bows — five rarity sets, each upgradeable by level.
 * Pure data + math; ownership lives in the saved profile (armory.ts).
 */

export type BowRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface BowDef {
  rarity: BowRarity;
  name: string;
  /** Base stats at level 1. */
  damage: number;
  rangeTiles: number;
  fireRateMs: number;
  /** Gold to unlock the bow in the Blacksmith. */
  unlockCost: number;
}

export interface BowStats {
  damage: number;
  rangeTiles: number;
  fireRateMs: number;
}

/** Highest level any piece of equipment can reach. */
export const MAX_GEAR_LEVEL = 20;

export const BOW_RARITIES: BowRarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

export const BOWS: Record<BowRarity, BowDef> = {
  Common: {
    rarity: "Common",
    name: "Sapling Shortbow",
    damage: 5,
    rangeTiles: 6,
    fireRateMs: 640,
    unlockCost: 0,
  },
  Uncommon: {
    rarity: "Uncommon",
    name: "Hunter's Recurve",
    damage: 9,
    rangeTiles: 7,
    fireRateMs: 590,
    unlockCost: 400,
  },
  Rare: {
    rarity: "Rare",
    name: "Silverwood Longbow",
    damage: 15,
    rangeTiles: 8,
    fireRateMs: 540,
    unlockCost: 1200,
  },
  Epic: {
    rarity: "Epic",
    name: "Emberglass Bow",
    damage: 24,
    rangeTiles: 9,
    fireRateMs: 480,
    unlockCost: 3200,
  },
  Legendary: {
    rarity: "Legendary",
    name: "Ignisite Warbow",
    damage: 38,
    rangeTiles: 11,
    fireRateMs: 420,
    unlockCost: 8000,
  },
};

/**
 * Stats for a bow at a given level.
 * Each level adds +6% damage and 2% faster draw; every 5th level adds a tile of range.
 */
export function bowStats(rarity: BowRarity, level: number): BowStats {
  const def = BOWS[rarity];
  const l = Math.min(Math.max(Math.round(level) || 1, 1), MAX_GEAR_LEVEL);
  const steps = l - 1;
  return {
    damage: Math.round(def.damage * (1 + 0.06 * steps)),
    rangeTiles: def.rangeTiles + Math.floor(steps / 5),
    fireRateMs: Math.round(def.fireRateMs * Math.pow(0.98, steps)),
  };
}
