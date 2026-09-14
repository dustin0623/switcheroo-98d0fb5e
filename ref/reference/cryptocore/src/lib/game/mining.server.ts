// src/lib/game/mining.server.ts
import type { IPlayer } from "@/lib/modules/players/types.server";
import {
  effectiveHashRate,
  miningPerSecond,
  vaultCapacity,
  decayMultiplier,
} from "@/features/game/mining";
import { createLog } from "@/lib/modules/logs/repository.server";

export function tickPlayer(player: IPlayer): {
  player: IPlayer;
  mined:  number;
} {
  const now = Date.now();
  const timeSinceTick = Math.max(0, now - player.lastTickAt) / 1000;
  const vaultBefore = player.vault;

  const totalHashRate = effectiveHashRate(player.statLevels.hashRate);
  const decay = decayMultiplier(player.lastSinkAt, now);
  const rawMined = Math.max(0, miningPerSecond(totalHashRate, decay) * timeSinceTick);
  const capacity = vaultCapacity(player.vaultStaked, totalHashRate);

  player.vault = Number(Math.min(capacity, player.vault + rawMined).toFixed(6));
  player.lastTickAt = now;
  player.totalMined = Number((player.totalMined + player.vault - vaultBefore).toFixed(6));

  if (player.vault > player.bestHashRate) {
    player.bestHashRate = player.vault;
  }

  return { player, mined: player.vault - vaultBefore };
}

export async function logTick(wallet: string, mined: number) {
  await createLog({
    type: "vault",
    wallet,
    amount: mined,
    data: { event: "tick", mined },
  });
}
