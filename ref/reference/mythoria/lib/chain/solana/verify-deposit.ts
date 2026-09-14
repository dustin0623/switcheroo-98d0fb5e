/**
 * lib/chain/solana/verify-deposit.ts
 *
 * Verifies a player → treasury Token-2022 SPL deposit that was signed
 * and submitted in the browser.
 * SERVER-ONLY.
 */

import { config } from "@/lib/config/config";
import { getConnection, getMintDecimals } from "./rpc";

export interface DepositVerification {
  ok:      boolean;
  amount?: number;
  error?:  string;
  code?:   "NOT_CONFIRMED" | "INVALID";
}

function toBaseUnits(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Invalid amount: ${amount}`);
  const [whole, frac = ""] = String(amount).split(".");
  const paddedFrac = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole + paddedFrac);
}

function sumOwnerBalance(
  balances: Array<{ mint: string; owner?: string; uiTokenAmount: { amount: string } }> | null | undefined,
  owner: string,
  mint: string,
): bigint {
  if (!balances) return 0n;
  let total = 0n;
  for (const b of balances) {
    if (b.mint === mint && b.owner === owner) total += BigInt(b.uiTokenAmount.amount);
  }
  return total;
}

export async function verifyDepositFromPlayer(
  signature:            string,
  expectedPlayerWallet: string,
  expectedAmount:       number,
  opts: { maxTries?: number; delayMs?: number } = {},
): Promise<DepositVerification> {
  if (!signature || typeof signature !== "string") {
    return { ok: false, code: "INVALID", error: "Missing transaction signature" };
  }
  const mint = config.blockchain.solana.mint;
  if (!mint) return { ok: false, code: "INVALID", error: "SERVER: CONTRACT_ADDRESS (mint) not set" };

  const connection = getConnection();
  const treasury   = config.blockchain.treasuryAddress;
  const decimals   = await getMintDecimals();
  const expectedRaw = toBaseUnits(expectedAmount, decimals);

  const MAX_TRIES = opts.maxTries ?? 12;
  const DELAY_MS  = opts.delayMs  ?? 2000;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    let tx;
    try {
      tx = await connection.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
    } catch (err) {
      return { ok: false, code: "NOT_CONFIRMED", error: err instanceof Error ? err.message : String(err) };
    }

    if (!tx) {
      if (attempt < MAX_TRIES - 1) {
        await new Promise<void>((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      return { ok: false, code: "NOT_CONFIRMED", error: "Transaction not found or not yet confirmed" };
    }

    if (tx.meta?.err) return { ok: false, code: "INVALID", error: "Transaction failed on-chain" };

    const signedByPlayer = tx.transaction.message.accountKeys.some(
      (k: { signer: boolean; pubkey: { toString(): string } }) =>
        k.signer && k.pubkey.toString() === expectedPlayerWallet,
    );
    if (!signedByPlayer) {
      return { ok: false, code: "INVALID", error: "Transaction was not signed by the authenticated wallet" };
    }

    const treasuryPre  = sumOwnerBalance(tx.meta?.preTokenBalances,  treasury, mint);
    const treasuryPost = sumOwnerBalance(tx.meta?.postTokenBalances, treasury, mint);
    const delta        = treasuryPost - treasuryPre;

    if (delta !== expectedRaw) {
      return { ok: false, code: "INVALID", error: `Treasury received ${delta} base units, expected ${expectedRaw}` };
    }

    return { ok: true, amount: expectedAmount };
  }

  return { ok: false, code: "NOT_CONFIRMED", error: "Transaction not confirmed after max retries" };
}
