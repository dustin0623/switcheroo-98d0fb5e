import { now } from "@/lib/clock";
import type { Attributes, EquippedSet, Player } from "@/mock/types";
import { computeCurrentAttacks } from "./formulas/combat";
import { computeCurrentClaims, computeCurrentScrap, computeMineRate } from "./formulas/mining";
import { damageCost, defenseCost, engineeringCost } from "./formulas/upgrades";
import { xpToNextFromLevel } from "./formulas/xp";


export function selectStash(player: Player | null) {
  if (!player) return { current: 0, size: 1, rate: 0 };
  const nowMs = now();
  return {
    current: computeCurrentScrap(player, nowMs),
    size: (player.hiveEngineStake || 0) + 1,
    rate: computeMineRate(player.engineering ?? player.stats?.engineering ?? 0, player.last_upgrade_time, nowMs),
  };
}

export function selectClaims(player: Player | null) {
  if (!player) return { current: 0 };
  return computeCurrentClaims(player, now());
}

export function selectUpgradeCosts(player: Player | null) {
  if (!player) return { engineering: 0, damage: 0, defense: 0 };
  return {
    engineering: engineeringCost(player.engineering ?? player.stats?.engineering ?? 0),
    damage: damageCost(player.damage ?? 0),
    defense: defenseCost(player.defense ?? 0),
  };
}

const EMPTY_ATTRS: Attributes = {
  damage: 0, defense: 0, engineering: 0, dodge: 0, crit: 0, luck: 0,
};

/** Sum attributes across every equipped slot (weapon, armor, ship, avatar, special). */
export function selectEquipmentBonuses(player: Player | null): Attributes {
  if (!player?.items) return { ...EMPTY_ATTRS };
  const set = player.items;
  const acc = { ...EMPTY_ATTRS };

  for (const k of ["avatar", "weapon", "armor", "ship", "special"] as const) {
    const a = set[k]?.attributes;
    if (!a) continue;
    acc.damage += a.damage;
    acc.defense += a.defense;
    acc.engineering += a.engineering;
    acc.dodge += a.dodge;
    acc.crit += a.crit;
    acc.luck += a.luck;
  }
  return acc;
}

/**
 * Effective combat stats shown on the dashboard tiles.
 *
 * Damage / defense are stored on the player as `level × 10` (matching the
 * on-chain SC field). Item attributes for damage / defense are likewise stored
 * ×10. The displayed Attack / Defense values are simply the sum of both, so
 * the true base level can be recovered as `(displayed − equipment) / 10`,
 * i.e. `player.damage / 10`.
 *
 * Engineering is a raw integer level; equipment engineering is a small decimal
 * multiplier bonus and is added straight on.
 */
export function selectEffectiveStats(player: Player | null) {
  const eq = selectEquipmentBonuses(player);
  const baseDamage = player?.damage ?? 0;
  const baseDefense = player?.defense ?? 0;
  const baseEng = player?.engineering ?? 0;
  return {
    equipment: eq,
    attack: baseDamage + eq.damage,
    defense: baseDefense + eq.defense,
    engineering: baseEng + eq.engineering,
    baseAttackLevel: Math.round(baseDamage / 10),
    baseDefenseLevel: Math.round(baseDefense / 10),
    baseEngineeringLevel: baseEng,
  };
}

export function selectXpProgress(player: Player | null) {
  if (!player) return { level: 1, current: 0, next: xpToNextFromLevel(1), pct: 0 };
  const next = xpToNextFromLevel(player.level || 1);
  return {
    level: player.level || 1,
    current: player.experience || 0,
    next,
    pct: Math.min(100, ((player.experience || 0) / next) * 100),
  };
}

export function selectAttacks(player: Player | null) {
  if (!player) return { current: 0, max: 8, nextRegenMs: 0 };
  const { current, effectiveMax } = computeCurrentAttacks(player, now());
  const regenInterval = 4 * 3600000;
  const elapsed = now() - (player.lastregen || 0);
  const nextRegenMs = current >= effectiveMax ? 0 : regenInterval - (elapsed % regenInterval);
  return { current, max: effectiveMax, nextRegenMs };
}


