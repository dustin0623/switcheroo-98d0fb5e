/**
 * lib/chain/robinhood/memo.ts
 * Memo helpers for Robinhood EVM chain. SERVER-ONLY.
 */

import { hexlify, toUtf8Bytes } from "ethers";

export function buildWithdrawMemo(ref: string): string {
  return `mythoria:withdraw:${ref}`;
}

export function buildRefundMemo(originalRef: string): string {
  return `mythoria:refund:${originalRef}`;
}

export function encodeMemoHex(memo: string): string {
  return hexlify(toUtf8Bytes(memo));
}
