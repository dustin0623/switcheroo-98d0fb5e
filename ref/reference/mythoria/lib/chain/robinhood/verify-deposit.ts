/**
 * lib/chain/robinhood/verify-deposit.ts
 *
 * Verifies a player → treasury ERC-20 transfer on Robinhood Chain.
 * SERVER-ONLY.
 */

import { Interface, parseUnits } from "ethers";
import { getProvider, resetProvider, ERC20_ABI, getTokenDecimals } from "./rpc";
import { config } from "@/lib/config/config";

export interface DepositVerification {
  ok:      boolean;
  amount?: number;
  error?:  string;
  code?:   "NOT_CONFIRMED" | "INVALID";
}

const erc20Interface = new Interface(ERC20_ABI as unknown as string[]);

export async function verifyDepositFromPlayer(
  txHash:               string,
  expectedPlayerWallet: string,
  expectedAmount:       number,
  opts: { maxTries?: number; delayMs?: number } = {},
): Promise<DepositVerification> {
  if (!txHash || typeof txHash !== "string") {
    return { ok: false, code: "INVALID", error: "Missing transaction hash" };
  }

  const tokenAddress = config.blockchain.robinhood.tokenAddress;
  if (!tokenAddress) return { ok: false, code: "INVALID", error: "ROBINHOOD_TOKEN_ADDRESS not configured" };

  const treasury = config.blockchain.treasuryAddress;
  if (!treasury)    return { ok: false, code: "INVALID", error: "TREASURY_ADDRESS not configured" };

  const provider    = getProvider();
  const decimals    = await getTokenDecimals();
  const expectedRaw = parseUnits(String(expectedAmount), decimals);

  const MAX_TRIES = opts.maxTries ?? 12;
  const DELAY_MS  = opts.delayMs  ?? 2000;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    let receipt;
    try {
      receipt = await provider.getTransactionReceipt(txHash);
    } catch (err) {
      resetProvider();
      if (attempt < MAX_TRIES - 1) {
        await new Promise<void>((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      return { ok: false, code: "NOT_CONFIRMED", error: err instanceof Error ? err.message : String(err) };
    }

    if (!receipt) {
      if (attempt < MAX_TRIES - 1) {
        await new Promise<void>((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      return { ok: false, code: "NOT_CONFIRMED", error: "Transaction not found or not yet confirmed" };
    }

    if (receipt.status !== 1) return { ok: false, code: "INVALID", error: "Transaction reverted on-chain" };

    if (receipt.from.toLowerCase() !== expectedPlayerWallet.toLowerCase()) {
      return { ok: false, code: "INVALID", error: "Signed by wrong address" };
    }

    let totalReceived = 0n;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue;
      let parsed;
      try {
        parsed = erc20Interface.parseLog({ topics: [...log.topics], data: log.data });
      } catch { continue; }
      if (!parsed || parsed.name !== "Transfer") continue;
      const to: string = parsed.args[1] as string;
      if (to.toLowerCase() !== treasury.toLowerCase()) continue;
      totalReceived += parsed.args[2] as bigint;
    }

    if (totalReceived < expectedRaw) {
      return { ok: false, code: "INVALID", error: `Treasury received ${totalReceived} base units, expected ${expectedRaw}` };
    }

    return { ok: true, amount: expectedAmount };
  }

  return { ok: false, code: "NOT_CONFIRMED", error: "Transaction not confirmed after max retries" };
}
