/**
 * lib/chain/solana/memo.ts
 * SPL Memo program helpers. SERVER-ONLY.
 */

import { PublicKey, TransactionInstruction } from "@solana/web3.js";

export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

export function buildWithdrawMemo(ref: string): string {
  return `mythoria:withdraw:${ref}`;
}

export function buildRefundMemo(originalRef: string): string {
  return `mythoria:refund:${originalRef}`;
}

export function buildMemoInstruction(memo: string): TransactionInstruction {
  return new TransactionInstruction({
    keys:      [],
    programId: MEMO_PROGRAM_ID,
    data:      Buffer.from(memo, "utf8"),
  });
}
