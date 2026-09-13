/**
 * Armory — weapon-facing helpers on top of the shared equipment system.
 * Weapons are just the "weapon" slot; levels replaced the old star ranks.
 */
import type { BowRarity } from "@/features/game/bow";
import type { Progress } from "@/features/game/campaign";
import {
  buyGear,
  equipGear,
  levelOf,
  levelUpGear,
  owns,
  salvageGear,
} from "@/features/game/equipment";

export function ownsBow(progress: Progress, rarity: BowRarity): boolean {
  return owns(progress, "weapon", rarity);
}

/** Level of an owned bow, or 0 when it is not owned. */
export function bowLevelOf(progress: Progress, rarity: BowRarity): number {
  return levelOf(progress, "weapon", rarity);
}

export function buyBow(progress: Progress, rarity: BowRarity): Progress {
  return buyGear(progress, "weapon", rarity);
}

export function equipBow(progress: Progress, rarity: BowRarity): Progress {
  return equipGear(progress, "weapon", rarity);
}

export function levelUpBow(progress: Progress, rarity: BowRarity): Progress {
  return levelUpGear(progress, "weapon", rarity);
}

export function salvageBow(progress: Progress, rarity: BowRarity): Progress {
  return salvageGear(progress, "weapon", rarity);
}
