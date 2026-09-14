/**
 * lib/chain/verify.ts
 *
 * Chain-agnostic deposit verifier. Routes to the active chain's
 * verify-deposit module via dynamic import so only the active chain's
 * dependencies are bundled.
 *
 * SERVER-ONLY.
 */

import { config } from "@/lib/config/config";

export interface DepositVerification {
  ok:      boolean;
  amount?: number;
  error?:  string;
  code?:   "NOT_CONFIRMED" | "INVALID";
}

export async function verifyDepositFromPlayer(
  txId:           string,
  expectedWallet: string,
  expectedAmount: number,
): Promise<DepositVerification> {
  const chain = config.blockchain.chain;

  if (chain === "hive") {
    const { verifyDepositFromPlayer: verify } = await import("./hive/verify-deposit");
    return verify(txId, expectedWallet, expectedAmount);
  }
  if (chain === "robinhood") {
    const { verifyDepositFromPlayer: verify } = await import("./robinhood/verify-deposit");
    return verify(txId, expectedWallet, expectedAmount);
  }
  const { verifyDepositFromPlayer: verify } = await import("./solana/verify-deposit");
  return verify(txId, expectedWallet, expectedAmount);
}
