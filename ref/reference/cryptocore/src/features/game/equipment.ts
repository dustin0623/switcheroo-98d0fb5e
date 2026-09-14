import { RARITY_INDEX, RARITY_STAT_COUNT, SLOT_KEYS, STAT_KEYS } from "@/features/constants/game";
import { createId, equipmentName, pickOne, shuffle } from "@/features/game/random";
import type { Equipment, Rarity, SlotKey, StatKey, StatRoll } from "@/features/types/game";

/** Combat-scale stats are stored on a x10 scale, like the reference game. */
const SCALED_STATS: StatKey[] = ["hackPower", "security"];

/** Slots that always guarantee their signature stat as the first roll. */
const SLOT_SIGNATURE_STAT: Partial<Record<SlotKey, StatKey>> = {
  asicMiner: "hashRate",
  networkModule: "hackPower",
  coolingSystem: "security",
};

/** How many stats an item of this rarity rolls (Epic is a 50/50 of 4 or 5). */
export const statCountForRarity = (rarity: Rarity): number => {
  const spec = RARITY_STAT_COUNT[rarity];
  if (Array.isArray(spec)) return Math.random() < 0.5 ? spec[0] : spec[1];
  return spec;
};

/**
 * Value formula from the reference game: a roll inside
 * [0.1 x rarityIndex, rarityIndex], with combat stats scaled x10.
 */
export const rollStatValue = (key: StatKey, rarity: Rarity): number => {
  const index = RARITY_INDEX[rarity];
  const floor = 0.1 * index;
  const roll = Math.random() * (index - floor) + floor;
  const scaled = SCALED_STATS.includes(key) ? roll * 10 : roll;
  return Math.round(scaled * 10) / 10;
};

/**
 * Roll stats from the shared pool. A slot may guarantee one signature stat,
 * and a single item never rolls the same stat twice.
 */
export const rollStats = (rarity: Rarity, slot?: SlotKey): StatRoll => {
  const count = Math.min(STAT_KEYS.length, statCountForRarity(rarity));
  const signature = slot ? SLOT_SIGNATURE_STAT[slot] : undefined;

  const pool = shuffle(STAT_KEYS.filter((key) => key !== signature));
  const keys = signature ? [signature, ...pool].slice(0, count) : pool.slice(0, count);

  const stats: StatRoll = {};
  for (const key of keys) {
    stats[key] = rollStatValue(key, rarity);
  }
  return stats;
};

export const generateEquipment = (options?: {
  rarity?: Rarity;
  slot?: SlotKey;
}): Equipment => {
  const rarity = options?.rarity ?? "common";
  const slot = options?.slot ?? pickOne(SLOT_KEYS);
  return {
    id: createId("eq"),
    name: equipmentName(slot),
    slot,
    rarity,
    stats: rollStats(rarity, slot),
    level: 1,
    equipped: false,
    createdAt: Date.now(),
  };
};
