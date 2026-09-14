// src/lib/game/raid.server.ts
import type { IPlayer } from "@/lib/modules/players/types.server";
import {
  MAX_CLAIM_CHARGES,
  MAX_RAID_CHARGES,
  CHARGE_REGEN_MS,
  RAID_CHARGE_DECAY_DAYS,
  RIVAL_RAID_COOLDOWN_MS,
} from "@/features/constants/game";
import { createLog } from "@/lib/modules/logs/repository.server";
import { createSeededRng } from "./rng";

export function regenCharges(player: IPlayer): IPlayer {
  const now = Date.now();
  const addClaims = Math.floor((now - player.lastClaimRegenAt) / CHARGE_REGEN_MS);
  const addRaids = Math.floor((now - player.lastRaidRegenAt) / CHARGE_REGEN_MS);

  if (addClaims > 0) {
    player.claimCharges = Math.min(MAX_CLAIM_CHARGES, player.claimCharges + addClaims);
    player.lastClaimRegenAt = now;
  }
  if (addRaids > 0) {
    player.raidCharges = Math.min(MAX_RAID_CHARGES, player.raidCharges + addRaids);
    player.lastRaidRegenAt = now;
  }
  return player;
}

export interface RaidResult {
  success: boolean;
  reason: "success" | "blocked" | "failed" | "outmatched";
  chance: number;
  stealPercent: number;
  stolen: number;
  xp: number;
}

export function calculateRaidChance(
  attacker: IPlayer,
  defender: IPlayer,
): number {
  const attack = attacker.statLevels.hackPower + attacker.statLevels.exploit;
  const defense = defender.statLevels.security + defender.statLevels.firewall;
  const base = 0.5;
  const diff = (attack - defense) / 100;
  return Math.min(0.95, Math.max(0.05, base + diff));
}

export function simulateRaid(
  attacker: IPlayer,
  defender: IPlayer,
  seed: string,
): RaidResult {
  if (defender.protectionUntil > Date.now()) {
    return { success: false, reason: "blocked", chance: 0, stealPercent: 0, stolen: 0, xp: 0 };
  }

  const chance = calculateRaidChance(attacker, defender);
  // Deterministic, verifiable outcome derived from the client-supplied seed.
  const rng = createSeededRng(`${attacker.wallet}:${defender.wallet}:${seed}`);
  const roll = rng();
  const success = roll <= chance;

  if (!success) {
    return { success: false, reason: "failed", chance, stealPercent: 0, stolen: 0, xp: 0 };
  }

  const minSteal = Math.max(0.05, attacker.statLevels.exploit / 100);
  const maxSteal = Math.min(0.5, 0.1 + attacker.statLevels.hackPower / 200);
  const stealPercent = minSteal + rng() * (maxSteal - minSteal);
  const stolen = Math.floor(defender.vault * stealPercent);

  // Mutate player state
  attacker.vault += stolen;
  attacker.raidCharges -= 1;
  attacker.raids += 1;
  attacker.raidWins += 1;
  attacker.totalStolen += stolen;
  attacker.xp += 10;

  defender.vault -= stolen;
  defender.protectionUntil = Date.now() + RIVAL_RAID_COOLDOWN_MS;

  return { success: true, reason: "success", chance, stealPercent, stolen, xp: 10 };
}

export async function logRaid(
  attacker: string,
  defender: string,
  result: RaidResult,
  seed: string,
) {
  await createLog({
    type: "raid",
    wallet: attacker,
    target: defender,
    amount: result.stolen,
    seed,
    data: {
      success: result.success,
      reason: result.reason,
      chance: result.chance,
      stealPercent: result.stealPercent,
      xp: result.xp,
    },
  });
}
