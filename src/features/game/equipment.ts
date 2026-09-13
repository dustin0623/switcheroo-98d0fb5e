/**
 * Equipment — weapons, helmets, armor and boots.
 *
 * The old star system is gone: every piece of gear simply has a LEVEL.
 * Levelling costs Weapon Shards (level^2 shards to go from `level` to the
 * next), and shards come from salvaging gear you no longer need.
 */
import { BOWS, BOW_RARITIES, MAX_GEAR_LEVEL, type BowRarity } from "@/features/game/bow";
import { saveProgress, type Progress } from "@/features/game/campaign";

export type GearSlot = "weapon" | "helmet" | "armor" | "boots";

export const GEAR_SLOTS: GearSlot[] = ["weapon", "helmet", "armor", "boots"];

export const SLOT_LABEL: Record<GearSlot, string> = {
  weapon: "Weapon",
  helmet: "Helmet",
  armor: "Armor",
  boots: "Boots",
};

export { MAX_GEAR_LEVEL };

export interface GearBonus {
  /** Flat bonus max HP. */
  hp: number;
  /** Flat damage reduction per hit. */
  defense: number;
  /** Flat move speed bonus. */
  moveSpeed: number;
}

export interface GearDef {
  slot: GearSlot;
  rarity: BowRarity;
  name: string;
  /** Gold to unlock the piece. */
  unlockCost: number;
  /** Bonuses at level 1. */
  bonus: GearBonus;
}

const RARITY_INDEX: Record<BowRarity, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
};

const UNLOCK_COST = [0, 300, 900, 2400, 6000];

const NAMES: Record<Exclude<GearSlot, "weapon">, string[]> = {
  helmet: ["Woven Cap", "Hunter's Hood", "Silverwood Helm", "Emberglass Crown", "Ignisite Greathelm"],
  armor: ["Padded Tunic", "Hunter's Jerkin", "Silverwood Mail", "Emberglass Plate", "Ignisite Aegis"],
  boots: ["Bark Sandals", "Hunter's Treads", "Silverwood Greaves", "Emberglass Striders", "Ignisite Warboots"],
};

const BASE_BONUS: Record<Exclude<GearSlot, "weapon">, GearBonus[]> = {
  helmet: [
    { hp: 15, defense: 1, moveSpeed: 0 },
    { hp: 30, defense: 2, moveSpeed: 0 },
    { hp: 55, defense: 3, moveSpeed: 0 },
    { hp: 90, defense: 5, moveSpeed: 0 },
    { hp: 140, defense: 8, moveSpeed: 0 },
  ],
  armor: [
    { hp: 25, defense: 2, moveSpeed: 0 },
    { hp: 50, defense: 4, moveSpeed: 0 },
    { hp: 90, defense: 7, moveSpeed: 0 },
    { hp: 150, defense: 11, moveSpeed: 0 },
    { hp: 230, defense: 17, moveSpeed: 0 },
  ],
  boots: [
    { hp: 8, defense: 0, moveSpeed: 6 },
    { hp: 16, defense: 1, moveSpeed: 12 },
    { hp: 28, defense: 2, moveSpeed: 20 },
    { hp: 45, defense: 3, moveSpeed: 30 },
    { hp: 70, defense: 5, moveSpeed: 44 },
  ],
};

/** Every non-weapon piece of gear, keyed by `slot:rarity`. */
export const GEAR: Record<string, GearDef> = (() => {
  const out: Record<string, GearDef> = {};
  for (const slot of ["helmet", "armor", "boots"] as const) {
    BOW_RARITIES.forEach((rarity, i) => {
      out[gearKey(slot, rarity)] = {
        slot,
        rarity,
        name: NAMES[slot][i]!,
        unlockCost: UNLOCK_COST[i]!,
        bonus: BASE_BONUS[slot][i]!,
      };
    });
  }
  return out;
})();

export function gearKey(slot: GearSlot, rarity: BowRarity): string {
  return `${slot}:${rarity}`;
}

/** Display name of any piece of gear, weapon included. */
export function gearName(slot: GearSlot, rarity: BowRarity): string {
  return slot === "weapon" ? BOWS[rarity].name : (GEAR[gearKey(slot, rarity)]?.name ?? rarity);
}

/** Gold price of any piece of gear, weapon included. */
export function gearUnlockCost(slot: GearSlot, rarity: BowRarity): number {
  return slot === "weapon"
    ? BOWS[rarity].unlockCost
    : (GEAR[gearKey(slot, rarity)]?.unlockCost ?? 0);
}

/** Bonuses a non-weapon piece grants at a given level (+8% per level). */
export function gearBonus(slot: GearSlot, rarity: BowRarity, level: number): GearBonus {
  const def = GEAR[gearKey(slot, rarity)];
  if (!def) return { hp: 0, defense: 0, moveSpeed: 0 };
  const mult = 1 + 0.08 * (clampLevel(level) - 1);
  return {
    hp: Math.round(def.bonus.hp * mult),
    defense: Math.round(def.bonus.defense * mult),
    moveSpeed: Math.round(def.bonus.moveSpeed * mult),
  };
}

export function clampLevel(level: number): number {
  return Math.min(Math.max(Math.round(level) || 1, 1), MAX_GEAR_LEVEL);
}

/** Shards to go from `level` to `level + 1` — level², or null at max level. */
export function levelUpShardCost(level: number): number | null {
  if (level >= MAX_GEAR_LEVEL) return null;
  const l = Math.max(1, Math.round(level));
  return l * l;
}

/** Shards returned by salvaging a piece — scales with rarity and level. */
export function salvageValue(rarity: BowRarity, level: number): number {
  const base = [2, 4, 8, 16, 32][RARITY_INDEX[rarity]]!;
  const l = clampLevel(level);
  // Refund the base value plus roughly half of what was spent levelling it.
  let spent = 0;
  for (let i = 1; i < l; i++) spent += i * i;
  return base + Math.floor(spent / 2);
}

// ---------------------------------------------------------------------------
// Profile helpers
// ---------------------------------------------------------------------------

/** Level of an owned piece, or 0 when it is not owned. */
export function levelOf(progress: Progress, slot: GearSlot, rarity: BowRarity): number {
  if (slot === "weapon") return progress.bows[rarity] ?? 0;
  return progress.gear[gearKey(slot, rarity)] ?? 0;
}

export function owns(progress: Progress, slot: GearSlot, rarity: BowRarity): boolean {
  return levelOf(progress, slot, rarity) > 0;
}

/** Currently equipped rarity for a slot, or null when nothing is equipped. */
export function equippedOf(progress: Progress, slot: GearSlot): BowRarity | null {
  if (slot === "weapon") return progress.equipped;
  return progress.equippedGear[slot] ?? null;
}

function withLevel(progress: Progress, slot: GearSlot, rarity: BowRarity, level: number): Progress {
  return slot === "weapon"
    ? { ...progress, bows: { ...progress.bows, [rarity]: level } }
    : { ...progress, gear: { ...progress.gear, [gearKey(slot, rarity)]: level } };
}

/** Buys an unowned piece at level 1 and equips it. */
export function buyGear(progress: Progress, slot: GearSlot, rarity: BowRarity): Progress {
  const cost = gearUnlockCost(slot, rarity);
  if (owns(progress, slot, rarity) || progress.gold < cost) return progress;
  let next = withLevel({ ...progress, gold: progress.gold - cost }, slot, rarity, 1);
  next = slot === "weapon"
    ? { ...next, equipped: rarity }
    : { ...next, equippedGear: { ...next.equippedGear, [slot]: rarity } };
  saveProgress(next);
  return next;
}

export function equipGear(progress: Progress, slot: GearSlot, rarity: BowRarity): Progress {
  if (!owns(progress, slot, rarity)) return progress;
  if (equippedOf(progress, slot) === rarity) return progress;
  const next: Progress =
    slot === "weapon"
      ? { ...progress, equipped: rarity }
      : { ...progress, equippedGear: { ...progress.equippedGear, [slot]: rarity } };
  saveProgress(next);
  return next;
}

/** Spends shards to raise a piece by one level. */
export function levelUpGear(progress: Progress, slot: GearSlot, rarity: BowRarity): Progress {
  const level = levelOf(progress, slot, rarity);
  if (level < 1) return progress;
  const cost = levelUpShardCost(level);
  if (cost === null || progress.shards < cost) return progress;
  const next = withLevel({ ...progress, shards: progress.shards - cost }, slot, rarity, level + 1);
  saveProgress(next);
  return next;
}

/** Salvages an owned, unequipped piece into shards. */
export function salvageGear(progress: Progress, slot: GearSlot, rarity: BowRarity): Progress {
  const level = levelOf(progress, slot, rarity);
  if (level < 1) return progress;
  if (equippedOf(progress, slot) === rarity) return progress;
  // The starter weapon can never be salvaged away.
  if (slot === "weapon" && rarity === "Common") return progress;

  const gain = salvageValue(rarity, level);
  let next: Progress = { ...progress, shards: progress.shards + gain };
  if (slot === "weapon") {
    const bows = { ...next.bows };
    delete bows[rarity];
    next = { ...next, bows };
  } else {
    const gear = { ...next.gear };
    delete gear[gearKey(slot, rarity)];
    next = { ...next, gear };
  }
  saveProgress(next);
  return next;
}

/** Combined bonuses from every equipped non-weapon piece. */
export function totalGearBonus(progress: Progress): GearBonus {
  const total: GearBonus = { hp: 0, defense: 0, moveSpeed: 0 };
  for (const slot of ["helmet", "armor", "boots"] as const) {
    const rarity = equippedOf(progress, slot);
    if (!rarity) continue;
    const b = gearBonus(slot, rarity, levelOf(progress, slot, rarity));
    total.hp += b.hp;
    total.defense += b.defense;
    total.moveSpeed += b.moveSpeed;
  }
  return total;
}
