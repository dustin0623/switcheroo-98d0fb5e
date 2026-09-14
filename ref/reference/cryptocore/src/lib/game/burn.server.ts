// src/lib/game/burn.server.ts
import type { IPlayer } from "@/lib/modules/players/types.server";
import { debitHash, updatePlayer } from "@/lib/modules/players/repository.server";
import { createLog } from "@/lib/modules/logs/repository.server";

export const BURN_TO_NOTORITY_RATIO = 1; // 1 burned HASH = 1 notoriety
export const BURN_TO_EXPLOIT_RATIO = 0.05; // 5% of burn becomes exploit stat
export const BURN_TO_FIREWALL_RATIO = 0.05; // 5% of burn becomes firewall stat

export async function burnHash(
  wallet: string,
  amount: number,
): Promise<{ ok: boolean; notoriety?: number; error?: string }> {
  if (amount <= 0) return { ok: false, error: "Amount must be positive" };
  const { ok } = await debitHash(wallet, amount);
  if (!ok) return { ok: false, error: "Not enough HASH" };

  const notorietyGain = amount * BURN_TO_NOTORITY_RATIO;
  const exploitGain = amount * BURN_TO_EXPLOIT_RATIO;
  const firewallGain = amount * BURN_TO_FIREWALL_RATIO;

  await updatePlayer(wallet, {
    $inc: {
      notoriety: notorietyGain,
      totalBurned: amount,
      "statLevels.exploit": exploitGain,
      "statLevels.firewall": firewallGain,
    },
    lastSinkAt: Date.now(),
  } as unknown as Partial<IPlayer>);

  await createLog({
    type: "burn",
    wallet,
    amount: -amount,
    data: {
      notorietyGain,
      exploitGain,
      firewallGain,
    },
  });

  return { ok: true, notoriety: notorietyGain };
}
