// src/lib/game/claim.server.ts
import type { IPlayer } from "@/lib/modules/players/types.server";
import { findPlayerByWallet, updatePlayer } from "@/lib/modules/players/repository.server";
import { createLog } from "@/lib/modules/logs/repository.server";

export async function claimVault(wallet: string): Promise<{ ok: boolean; claimed?: number; error?: string }> {
  const player = await findPlayerByWallet(wallet);
  if (!player) return { ok: false, error: "Player not found" };
  if (player.claimCharges <= 0) return { ok: false, error: "No claim charges" };
  if (player.vault <= 0) return { ok: false, error: "Vault is empty" };

  const claimable = player.vault;
  await updatePlayer(wallet, {
    $inc: {
      hash: claimable,
      totalClaimed: claimable,
      claimCharges: -1,
    },
    $set: {
      vault: 0,
      lastSinkAt: Date.now(),
    },
  } as unknown as Partial<IPlayer>);

  await createLog({
    type: "claim",
    wallet,
    amount: claimable,
    data: { chargesRemaining: player.claimCharges - 1 },
  });

  return { ok: true, claimed: claimable };
}
