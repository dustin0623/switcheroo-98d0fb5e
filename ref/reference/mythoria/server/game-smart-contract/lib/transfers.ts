/**
 * server/game-smart-contract/lib/transfers.ts
 *
 * Routes sendOnChain to the active chain's transfer module.
 * SERVER-ONLY.
 */

import { config } from "@/lib/config/config";

export async function sendOnChain(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<{ signature: string }> {
  const chain = config.blockchain.chain;

  if (chain === "hive") {
    const { sendHiveTransfer } = await import("@/lib/chain/hive/transfer");
    return sendHiveTransfer(playerWallet, amount, ref);
  }
  if (chain === "robinhood") {
    const { sendRobinhoodTransfer } = await import("@/lib/chain/robinhood/transfer");
    return sendRobinhoodTransfer(playerWallet, amount, ref);
  }
  const { sendSolanaTransfer } = await import("@/lib/chain/solana/transfer");
  return sendSolanaTransfer(playerWallet, amount, ref);
}
