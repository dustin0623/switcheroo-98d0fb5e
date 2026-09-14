import type { Player, Quest, QuestBoardSlot, Rarity } from "@/mock/types";
import { rollDice, rngFloat } from "@/stores/rng";
import { selectEffectiveStats } from "@/stores/selectors";

export const QUEST_TYPE_MAP: Record<
  string,
  { primary: keyof Player["stats"]; secondary: keyof Player["stats"] | null; item: string }
> = {
  combat: { primary: "damage", secondary: "crit", item: "weapon" },
  salvage: { primary: "engineering", secondary: null, item: "special" },
  stealth: { primary: "dodge", secondary: "luck", item: "armor" },
  fortune: { primary: "luck", secondary: "crit", item: "avatar" },
  defense: { primary: "defense", secondary: null, item: "ship" },
};

export const TIER_LEVEL_REQ = { 1: 1, 2: 10, 3: 25, 4: 50, 5: 100 };
export const TIER_STAT_REQ = { 1: 10, 2: 50, 3: 100, 4: 200, 5: 500 };
export const TIER_STAT_REQ_ITEM = { 1: 2, 2: 5, 3: 12, 4: 20, 5: 40 };
export const TIER_BASE_COST = { 1: 20, 2: 100, 3: 235, 4: 985, 5: 4010 };
export const TIER_DURATION = { 1: 1, 2: 4, 3: 12, 4: 24, 5: 48 };
export const TIER_BASE_ROLLS = { 1: 2, 2: 3, 3: 4, 4: 6, 5: 10 };
export const TIER_XP = { 1: 25, 2: 50, 3: 100, 4: 200, 5: 400 };

const ITEM_ONLY_STATS = new Set(["luck", "dodge"]);

const BASE_LOOT_PROFILES: Record<string, { r: Rarity; w: number }[]> = {
  combat: [
    { r: "legendary", w: 1 },
    { r: "epic", w: 5 },
    { r: "rare", w: 20 },
    { r: "uncommon", w: 38 },
    { r: "common", w: 36 },
  ],
  salvage: [
    { r: "legendary", w: 1 },
    { r: "epic", w: 3 },
    { r: "rare", w: 12 },
    { r: "uncommon", w: 43 },
    { r: "common", w: 41 },
  ],
  stealth: [
    { r: "legendary", w: 1 },
    { r: "epic", w: 5 },
    { r: "rare", w: 18 },
    { r: "uncommon", w: 39 },
    { r: "common", w: 37 },
  ],
  fortune: [
    { r: "legendary", w: 2 },
    { r: "epic", w: 7 },
    { r: "rare", w: 20 },
    { r: "uncommon", w: 36 },
    { r: "common", w: 35 },
  ],
  defense: [
    { r: "legendary", w: 1 },
    { r: "epic", w: 4 },
    { r: "rare", w: 15 },
    { r: "uncommon", w: 41 },
    { r: "common", w: 39 },
  ],
};

const LOW_TIER_RARITY_MULT: Record<number, Partial<Record<Rarity, number>>> = {
  1: { legendary: 0, epic: 0.05, rare: 0.3 },
  2: { legendary: 0.1, epic: 0.3, rare: 0.55 },
  3: { legendary: 0.55, epic: 0.8 },
};

const TIER_SCALE = { 1: 0.7, 2: 0.58, 3: 0.48, 4: 0.4, 5: 0.32 };
const AMOUNT_BASE: Record<Rarity, { min: number; max: number }> = {
  common: { min: 0.01, max: 1.49 },
  uncommon: { min: 0.01, max: 1.01 },
  rare: { min: 0.01, max: 0.6 },
  epic: { min: 0.01, max: 0.37 },
  legendary: { min: 0.01, max: 0.53 },
};

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
const RARITY_BUMP: Record<Rarity, Rarity> = {
  common: "uncommon",
  uncommon: "rare",
  rare: "epic",
  epic: "legendary",
  legendary: "legendary",
};

export function effectivePrimaryStat(player: Player, primary: keyof Player["stats"]): number {
  const stats = selectEffectiveStats(player);
  if (ITEM_ONLY_STATS.has(primary as string)) {
    return stats.equipment[primary as keyof typeof stats.equipment] || 0;
  }
  return stats[primary as keyof typeof stats] as number;
}

export function canStartQuest(
  player: Player,
  slot: QuestBoardSlot,
  multiplier: number
): { ok: boolean; reason?: string; cost?: number } {
  const mapping = QUEST_TYPE_MAP[slot.quest_type];
  if (!mapping) return { ok: false, reason: "Unknown quest type" };
  if (player.level < TIER_LEVEL_REQ[slot.tier as keyof typeof TIER_LEVEL_REQ])
    return { ok: false, reason: "Level too low" };
  const statReq = ITEM_ONLY_STATS.has(mapping.primary as string)
    ? TIER_STAT_REQ_ITEM[slot.tier as keyof typeof TIER_STAT_REQ_ITEM]
    : TIER_STAT_REQ[slot.tier as keyof typeof TIER_STAT_REQ];
  if (effectivePrimaryStat(player, mapping.primary) < statReq)
    return { ok: false, reason: "Primary stat too low" };
  if (slot.tier >= 3 && !player.items?.[mapping.item as keyof typeof player.items]?.item_number) {
    return { ok: false, reason: "Required item not equipped" };
  }
  const cost = Math.ceil(TIER_BASE_COST[slot.tier as keyof typeof TIER_BASE_COST] * multiplier);
  if ((player.hiveEngineScrap || 0) < cost) return { ok: false, reason: "Not enough $SCRAP", cost };
  return { ok: true, cost };
}

export function computeEffectiveRoll(
  baseRoll: number,
  effectivePrimaryStat: number,
  statReq: number,
  secondaryStatValue: number | null
): number {
  const statMod = Math.max(0, Math.min((effectivePrimaryStat - statReq) / (statReq * 4), 0.75));
  const secBonus =
    secondaryStatValue != null
      ? Math.min((secondaryStatValue / Math.max(statReq, 1)) * 8, 8)
      : 0;
  return baseRoll * (1 + statMod) + secBonus;
}

export function computeDrawCount(effectiveRoll: number, baseRolls: number) {
  if (effectiveRoll < 35) return { count: Math.max(1, Math.floor(baseRolls * 0.5)) };
  if (effectiveRoll < 65) return { count: baseRolls };
  if (effectiveRoll < 100) return { count: Math.ceil(baseRolls * 1.5) };
  if (effectiveRoll < 130) return { count: baseRolls * 2 };
  if (effectiveRoll < 155) return { count: Math.ceil(baseRolls * 2.5), shiftRareUp: true };
  if (effectiveRoll < 175) return { count: baseRolls * 3 };
  return { count: baseRolls * 3, guaranteedLegendary: true };
}

function getLootTable(questType: string, tier: number): { r: Rarity; w: number }[] {
  const base = BASE_LOOT_PROFILES[questType] || BASE_LOOT_PROFILES.combat;
  const shift = (tier - 1) * 2;
  const table = base.map((entry) => {
    let w = entry.w;
    if (entry.r === "legendary") w += shift * 2;
    else if (entry.r === "epic") w += shift;
    else if (entry.r === "uncommon" || entry.r === "common") w = Math.max(0, w - shift);
    return { ...entry, w };
  });

  const mult = LOW_TIER_RARITY_MULT[tier];
  if (mult) {
    for (const entry of table) {
      if (mult[entry.r] != null) entry.w *= mult[entry.r]!;
    }
  }
  return table;
}

function drawRarity(table: { r: Rarity; w: number }[], rng: () => number): Rarity {
  const total = table.reduce((s, e) => s + e.w, 0);
  let roll = rng() * total;
  for (const entry of table) {
    roll -= entry.w;
    if (roll <= 0) return entry.r;
  }
  return "common";
}

function drawAmount(rng: () => number, rarity: Rarity, tier: number): number {
  const base = AMOUNT_BASE[rarity];
  const raw = base.min + rng() * (base.max - base.min);
  const fortuneVariance = 0.2 + rng() * 1.6;
  return Math.round(raw * TIER_SCALE[tier as keyof typeof TIER_SCALE] * fortuneVariance * 100) / 100;
}

function computeInvestmentFactor(itemRarity: Rarity | null, itemLevel: number): number {
  const floor = 0.3;
  const rarityWeight: Record<string, number> = {
    none: 0,
    common: 0.1,
    uncommon: 0.3,
    rare: 0.6,
    epic: 0.85,
    legendary: 1.0,
  };
  const rarity = itemRarity || "none";
  const levelComponent = Math.min((itemLevel - 1) / 9, 1);
  const gearScore = rarityWeight[rarity] * (0.6 + 0.4 * levelComponent);
  return Math.max(floor, Math.min(1, floor + (1 - floor) * gearScore));
}

export function collectQuestRewards(
  quest: Quest,
  player: Player,
  seed: string
): { relics: Partial<Record<Rarity, number>>; xp: number; log: string[] } {
  const mapping = QUEST_TYPE_MAP[quest.quest_type];
  const baseRoll = rollDice(100, seed);
  const statReq = ITEM_ONLY_STATS.has(mapping?.primary as string)
    ? TIER_STAT_REQ_ITEM[quest.tier as keyof typeof TIER_STAT_REQ_ITEM]
    : TIER_STAT_REQ[quest.tier as keyof typeof TIER_STAT_REQ];
  const effectiveStat = quest.effective_primary_stat;
  const secondary = mapping?.secondary ? (quest as unknown as Record<string, number>)[mapping.secondary] || 0 : null;
  const effectiveRoll = computeEffectiveRoll(baseRoll, effectiveStat, statReq, secondary);
  const { count: baseCount, shiftRareUp, guaranteedLegendary } = computeDrawCount(
    effectiveRoll,
    quest.base_rolls
  );

  let drawCount = baseCount;
  const itemRarity = quest.equipped_item_rarity;
  const itemLevel = quest.equipped_item_level || 1;

  if (["rare", "epic", "legendary"].includes(itemRarity || "")) drawCount += 1;

  const levelChance = itemRarity ? Math.min((itemLevel - 1) * 0.05, 1) : 0;
  if (levelChance > 0 && rngFloat(seed + "_lvl") < levelChance) drawCount += 1;

  const itemAttrValue = (quest as unknown as Record<string, number>).item_attribute_value || 0;
  const rawAff = Math.min(itemAttrValue * 4, 1);
  const affGuar = Math.floor(rawAff);
  const affFrac = rawAff - affGuar;
  drawCount += affGuar;
  if (affFrac > 0 && rngFloat(seed + "_aff") < affFrac) drawCount += 1;

  const table = getLootTable(quest.quest_type, quest.tier);
  const relics: Partial<Record<Rarity, number>> = {};
  const log: string[] = [];

  for (let i = 0; i < drawCount; i++) {
    let rarity = drawRarity(table, () => rngFloat(seed + `_drop_${i}`));
    if (shiftRareUp) {
      const idx = RARITY_ORDER.indexOf(rarity);
      rarity = RARITY_ORDER[Math.min(idx + 1, RARITY_ORDER.length - 1)];
    }
    let amount = drawAmount(() => rngFloat(seed + `_drop_${i}`), rarity, quest.tier);
    if (rngFloat(seed + `_jp_${i}`) < 0.02) {
      rarity = RARITY_BUMP[rarity];
      amount *= 3;
      log.push(`Jackpot! ${rarity} x${amount.toFixed(2)}`);
    }
    relics[rarity] = (relics[rarity] || 0) + amount;
  }

  if (guaranteedLegendary) {
    const legAmt = drawAmount(() => rngFloat(seed + "_leg_bonus"), "legendary", quest.tier);
    relics.legendary = (relics.legendary || 0) + legAmt;
    log.push(`Guaranteed legendary x${legAmt.toFixed(2)}`);
  }

  const factor = computeInvestmentFactor(itemRarity, itemLevel);
  for (const r of Object.keys(relics) as Rarity[]) {
    relics[r] = Math.round((relics[r] || 0) * factor * 100) / 100;
  }

  return { relics, xp: TIER_XP[quest.tier as keyof typeof TIER_XP], log };
}
