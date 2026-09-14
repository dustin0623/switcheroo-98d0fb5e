/**
 * lib/chain/hive/transfer.ts
 *
 * Treasury → player Hive-Engine token payout (withdrawal).
 * Broadcasts a custom_json op with id = ENGINE_ID carrying a tokens.transfer payload.
 * SERVER-ONLY.
 */

import {
  makeHiveClient,
  getTreasuryAccount,
  getTreasuryActiveKey,
  getTokenSymbol,
  getEngineBalance,
  getTokenPrecision,
  ENGINE_ID,
} from "./rpc";
import { buildWithdrawMemo } from "./memo";

export interface HiveTransferResult {
  /** Hive consensus-layer transaction id. */
  signature: string;
}

function formatQuantity(amount: number, precision: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid transfer amount: ${amount}`);
  }
  return amount.toFixed(precision);
}

export async function sendTokens(
  recipientAccount: string,
  amount: number,
  memo: string,
): Promise<HiveTransferResult> {
  const client    = await makeHiveClient();
  const treasury  = getTreasuryAccount();
  const symbol    = getTokenSymbol();
  const precision = await getTokenPrecision(symbol);
  const to        = recipientAccount.trim().toLowerCase();
  const quantity  = formatQuantity(amount, precision);

  const balance = await getEngineBalance(treasury, symbol);
  if (balance < amount) {
    throw Object.assign(
      new Error(`Treasury token balance insufficient: has ${balance} ${symbol}, needs ${amount}`),
      { code: "TREASURY_INSUFFICIENT" },
    );
  }

  const result = await client.broadcast.json(
    {
      id:   ENGINE_ID,
      json: JSON.stringify({
        contractName:    "tokens",
        contractAction:  "transfer",
        contractPayload: { symbol: symbol.toUpperCase(), to, quantity, memo },
      }),
      required_auths:         [treasury],
      required_posting_auths: [],
    },
    getTreasuryActiveKey(),
  );

  return { signature: result.id };
}

export async function sendWithdrawal(
  playerAccount: string,
  amount: number,
  ref: string,
): Promise<HiveTransferResult> {
  return sendTokens(playerAccount, amount, buildWithdrawMemo(ref));
}

/** Legacy adapter: sendHiveTransfer(wallet, amount, ref) → { signature } */
export async function sendHiveTransfer(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<{ signature: string }> {
  return sendWithdrawal(playerWallet, amount, ref);
}
