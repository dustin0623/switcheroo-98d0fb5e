/**
 * lib/chain/hive/memo.ts
 * Memo helpers for Hive-Engine token transfers. SERVER-ONLY.
 */

export function buildWithdrawMemo(ref: string): string {
  return `mythoria:withdraw:${ref}`;
}

export function buildRefundMemo(originalRef: string): string {
  return `mythoria:refund:${originalRef}`;
}
