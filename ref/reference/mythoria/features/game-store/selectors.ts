import { now } from "@/lib/clock";
import type { Attributes, EquippedSet, Player } from "@/features/types";
import { computeCurrentAttacks } from "./formulas/combat";
import { computeCurrentClaims, computeCurrentScrap, computeMineRate } from "./formulas/mining";
import { damageCost, defenseCost, arcaneCost } from "./formulas/upgrades";
import { xpToNextFromLevel } from "./formulas/xp";


export function selectStash(player: Player | null) {
  if (!player) return { current: 0, size: 1, rate: 0 };
  const nowMs = now();
  const arcaneLevel = player.arcane ?? player.stats?.arcane ?? 0;
  return {
    current: computeCurrentScrap(player, nowMs),
    size: (player.staked || 0) + 1,
    rate: computeMineRate(arcaneLevel, player.last_upgrade_time, nowMs),
  };
}

export function selectClaims(player: Player | null) {
  if (!player) return { current: 0 };
  return computeCurrentClaims(player, now());
}

export function selectUpgradeCosts(player: Player | null) {
  if (!player) return { arcane: 0, damage: 0, defense: 0 };
  const arcaneLevel = player.arcane ?? player.stats?.arcane ?? 0;
  const arcaneCostVal = arcaneCost(arcaneLevel);
  return {
    arcane: arcaneCostVal,
    damage: damageCost(player.damage ?? 0),
    defense: defenseCost(player.defense ?? 0),
  };
}

const EMPTY_ATTRS: Attributes = {
  damage: 0, defense: 0, arcane: 0, speed: 0, crit: 0, luck: 0,
};

/** Sum attributes across every equipped slot (weapon, armor, avatar, mount, artifact). */
export function selectEquipmentBonuses(player: Player | null): Attributes {
  if (!player?.items) return { ...EMPTY_ATTRS };
  const set = player.items;
  const acc = { ...EMPTY_ATTRS };

  for (const k of ["avatar", "weapon", "armor", "mount", "accessory"] as const) {
    const a = set[k]?.attributes;
    if (!a) continue;
    acc.damage  += a.damage;
    acc.defense += a.defense;
    acc.arcane  += a.arcane;
    acc.speed   += a.speed;
    acc.crit    += a.crit;
    acc.luck    += a.luck;
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
  const baseDamage  = player?.damage  ?? 0;
  const baseDefense = player?.defense ?? 0;
  const baseArcane  = player?.arcane ?? 0;
  return {
    equipment: eq,
    attack:  baseDamage  + eq.damage,
    defense: baseDefense + eq.defense,
    arcane:  baseArcane  + eq.arcane,
    speed:   eq.speed,
    crit:    eq.crit,
    luck:    eq.luck,
    baseAttackLevel:  Math.round(baseDamage  / 10),
    baseDefenseLevel: Math.round(baseDefense / 10),
    baseArcaneLevel:  baseArcane,
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


