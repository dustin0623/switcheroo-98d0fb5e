// src/lib/game/upgrade.server.ts
import type { IPlayer } from "@/lib/modules/players/types.server";
import {
  findItemByNumber,
  upgradeItem,
} from "@/lib/modules/items/repository.server";
import {
  debitHash,
  debitSparks,
  updatePlayer,
} from "@/lib/modules/players/repository.server";
import { createLog } from "@/lib/modules/logs/repository.server";

/**
 * Cost to upgrade one stat level. Grows exponentially to create sink pressure.
 */
export function statUpgradeCost(stat: string, level: number): number {
  return Math.floor(Math.pow(level, 1.7) * 10);
}

export function itemUpgradeCost(itemLevel: number): number {
  return Math.floor(Math.pow(itemLevel, 1.8) * 50);
}

export async function upgradeStat(
  wallet: string,
  stat: keyof IPlayer["statLevels"],
): Promise<{ ok: boolean; cost?: number; error?: string }> {
  const { findPlayerByWallet } = await import("@/lib/modules/players/repository.server");
  const player = await findPlayerByWallet(wallet);
  if (!player) return { ok: false, error: "Player not found" };

  const nextLevel = player.statLevels[stat] + 1;
  const cost = statUpgradeCost(stat, nextLevel);
  const { ok } = await debitHash(wallet, cost);
  if (!ok) return { ok: false, error: "Not enough HASH" };

  await updatePlayer(wallet, {
    [`statLevels.${stat}`]: nextLevel,
    lastSinkAt: Date.now(),
  } as unknown as Partial<IPlayer>);

  await createLog({
    type: "stat_upgrade",
    wallet,
    amount: -cost,
    data: { stat, from: nextLevel - 1, to: nextLevel },
  });

  return { ok: true, cost };
}

export async function upgradeEquipment(
  wallet: string,
  itemNumber: number,
): Promise<{ ok: boolean; cost?: number; error?: string }> {
  const item = await findItemByNumber(itemNumber);
  if (!item || item.owner !== wallet) return { ok: false, error: "Item not found" };
  const cost = itemUpgradeCost(item.level);
  const { ok } = await debitSparks(wallet, cost);
  if (!ok) return { ok: false, error: "Not enough SPARKS" };

  const result = await upgradeItem(itemNumber, wallet);
  if (!result.ok) return result;

  await createLog({
    type: "upgrade",
    wallet,
    amount: -cost,
    data: { itemNumber, from: item.level, to: item.level + 1 },
  });

  return { ok: true, cost };
}
