import type { Attributes, Item, ItemType, Rarity } from "@/features/types";
import { generateRandomNumber, rngFloat, rngInt } from "@/features/game-store/rng";
import seedrandom from "seedrandom";


const DEFAULT_LADDERS: Record<Rarity, { max: number; r: Rarity }[]> = {
  common: [
    { max: 90000, r: "common" },
    { max: 99000, r: "uncommon" },
    { max: 99750, r: "rare" },
    { max: 99950, r: "epic" },
    { max: Infinity, r: "legendary" },
  ],
  uncommon: [
    { max: 95000, r: "uncommon" },
    { max: 99000, r: "rare" },
    { max: 99900, r: "epic" },
    { max: Infinity, r: "legendary" },
  ],
  rare: [
    { max: 94999, r: "rare" },
    { max: 98999, r: "epic" },
    { max: Infinity, r: "legendary" },
  ],
  epic: [
    { max: 97999, r: "epic" },
    { max: Infinity, r: "legendary" },
  ],
  legendary: [{ max: Infinity, r: "legendary" }],
};

const RARITY_INDEX: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 6,
};

const ALL_ATTRS: (keyof Attributes)[] = ["damage", "defense", "arcane", "speed", "crit", "luck"];

export function rollItemRarity(crateRarity: Rarity, seed: string): Rarity {
  const roll = generateRandomNumber(seed);
  const ladder = DEFAULT_LADDERS[crateRarity];
  for (const step of ladder) {
    if (roll < step.max) return step.r;
  }
  return "common";
}

function attributeCount(rarity: Rarity, rng: () => number): number {
  switch (rarity) {
    case "common":
      return 1;
    case "uncommon":
      return 2;
    case "rare":
      return 3;
    case "epic":
      return rng() <= 0.5 ? 4 : 5;
    case "legendary":
      return 6;
  }
}

export function rollItemAttributes(type: ItemType, rarity: Rarity, seed: string): Attributes {
  const rng = seedrandom(seed + "-attrs");
  const idx = RARITY_INDEX[rarity];
  const count = attributeCount(rarity, rng);

  let firstPool: (keyof Attributes)[];
  if (type === "weapon") firstPool = ["damage"];
  else if (type === "armor") firstPool = ["defense"];
  else firstPool = [...ALL_ATTRS];

  const first = firstPool[rngInt(seed + "-first", firstPool.length)];
  const chosen: (keyof Attributes)[] = [first];
  const remaining = ALL_ATTRS.filter((a) => a !== first);

  while (chosen.length < count && remaining.length > 0) {
    const i = Math.floor(rng() * remaining.length);
    chosen.push(remaining.splice(i, 1)[0]);
  }

  const attrs: Attributes = { damage: 0, defense: 0, arcane: 0, speed: 0, crit: 0, luck: 0 };
  for (const attr of chosen) {
    const roll = rng() * (idx - 0.1 * idx) + 0.1 * idx;
    if (attr === "damage" || attr === "defense") {
      attrs[attr] = roll * 10;
    } else {
      attrs[attr] = roll;
    }
  }
  return attrs;
}

export function dismantleValue(attributes: Attributes): number {
  return (
    attributes.damage / 2 +
    attributes.defense / 2 +
    attributes.arcane * 5 +
    attributes.speed * 5 +
    attributes.crit * 5 +
    attributes.luck * 10
  );
}

export function enchantCost(item: Item): number {
  return dismantleValue(item.attributes) * 0.0498 * item.level;
}

export function enchantAttributes(attrs: Attributes): Attributes {
  return {
    damage:  attrs.damage  * 1.05,
    defense: attrs.defense * 1.05,
    arcane:  attrs.arcane  * 1.05,
    speed:   attrs.speed   * 1.05,
    crit:    attrs.crit    * 1.05,
    luck:    attrs.luck    * 1.05,
  };
}
