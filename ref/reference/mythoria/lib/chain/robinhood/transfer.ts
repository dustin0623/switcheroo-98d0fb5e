/**
 * lib/chain/robinhood/transfer.ts
 *
 * Treasury → player ERC-20 payout (withdrawal) on Robinhood Chain.
 * Pure chain operation — does NOT touch MongoDB.
 * SERVER-ONLY.
 */

import { parseUnits, formatUnits } from "ethers";
import { getTreasuryWallet, getTokenContract, getTokenDecimals, resetProvider } from "./rpc";
import { buildWithdrawMemo, encodeMemoHex } from "./memo";

export interface RobinhoodTransferResult {
  signature:    string;
  memoTxHash?:  string;
}

export async function sendTokens(
  recipientWallet: string,
  amount: number,
  memo: string,
): Promise<RobinhoodTransferResult> {
  const token    = getTokenContract();
  const treasury = getTreasuryWallet();
  const decimals = await getTokenDecimals();
  const rawAmount = parseUnits(String(amount), decimals);

  let treasuryBalance: bigint;
  try {
    treasuryBalance = await token.balanceOf(treasury.address) as bigint;
  } catch (err) {
    resetProvider();
    throw err;
  }
  if (treasuryBalance < rawAmount) {
    throw Object.assign(
      new Error(`Treasury balance insufficient: has ${formatUnits(treasuryBalance, decimals)}, needs ${amount}`),
      { code: "TREASURY_INSUFFICIENT" },
    );
  }

  let tx: Awaited<ReturnType<typeof token.transfer>>;
  try {
    tx = await token.transfer(recipientWallet, rawAmount, { gasLimit: 100_000n });
  } catch (err) {
    resetProvider();
    throw err;
  }
  const receipt = await tx.wait(1) as { hash: string; status: number } | null;
  if (!receipt || receipt.status !== 1) {
    throw Object.assign(new Error(`Transfer reverted: ${tx.hash}`), { code: "TX_REVERTED", txHash: tx.hash });
  }

  const result: RobinhoodTransferResult = { signature: receipt.hash };

  try {
    const memoTx = await treasury.sendTransaction({
      to: recipientWallet, value: 0n,
      data: encodeMemoHex(memo), gasLimit: 50_000n,
    });
    const memoReceipt = await memoTx.wait(1) as { hash?: string } | null;
    if (memoReceipt?.hash) result.memoTxHash = memoReceipt.hash;
  } catch { /* memo is non-critical */ }

  return result;
}

export async function sendWithdrawal(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<RobinhoodTransferResult> {
  return sendTokens(playerWallet, amount, buildWithdrawMemo(ref));
}

/** Used by chain/index.ts sendTransfer. */
export async function transfer(to: string, amount: number, memo: string): Promise<string> {
  const result = await sendTokens(to, amount, memo);
  return result.signature;
}

/** Used by the smart-contract worker. */
export async function sendRobinhoodTransfer(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<{ signature: string }> {
  return sendWithdrawal(playerWallet, amount, ref);
}
