/**
 * lib/chain/solana/transfer.ts
 *
 * Treasury → player Token-2022 SPL token payout (withdrawal).
 * Pure chain operation — does NOT touch MongoDB.
 * SERVER-ONLY.
 */

import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getConnection, getTreasuryKeypair, getMintPublicKey, getMintDecimals } from "./rpc";
import { buildMemoInstruction, buildWithdrawMemo } from "./memo";

export interface SolanaTransferResult {
  /** Transaction signature (base58). */
  signature: string;
}

function toBaseUnits(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid transfer amount: ${amount}`);
  }
  const [whole, frac = ""] = String(amount).split(".");
  const paddedFrac = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole + paddedFrac);
}

export async function sendTokens(
  recipientWallet: string,
  amount: number,
  memo: string,
): Promise<SolanaTransferResult> {
  const connection = getConnection();
  const treasury   = getTreasuryKeypair();
  const mint       = getMintPublicKey();
  const recipient  = new PublicKey(recipientWallet);
  const decimals   = await getMintDecimals();
  const rawAmount  = toBaseUnits(amount, decimals);

  const treasuryAta = await getOrCreateAssociatedTokenAccount(
    connection, treasury, mint, treasury.publicKey,
    false, "confirmed", undefined, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const treasuryAccount = await getAccount(
    connection, treasuryAta.address, "confirmed", TOKEN_2022_PROGRAM_ID,
  );
  if (treasuryAccount.amount < rawAmount) {
    throw Object.assign(
      new Error(`Treasury token balance insufficient: has ${treasuryAccount.amount}, needs ${rawAmount}`),
      { code: "TREASURY_INSUFFICIENT" },
    );
  }

  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection, treasury, mint, recipient,
    false, "confirmed", undefined, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const tx = new Transaction().add(
    createTransferCheckedInstruction(
      treasuryAta.address, mint, recipientAta.address,
      treasury.publicKey, rawAmount, decimals, [],
      TOKEN_2022_PROGRAM_ID,
    ),
    buildMemoInstruction(memo),
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [treasury], {
    commitment: "confirmed",
  });

  return { signature };
}

export async function sendWithdrawal(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<SolanaTransferResult> {
  return sendTokens(playerWallet, amount, buildWithdrawMemo(ref));
}

/** Used by chain/index.ts sendTransfer. */
export async function transfer(to: string, amount: number, memo: string): Promise<string> {
  const result = await sendTokens(to, amount, memo);
  return result.signature;
}

/** Used by the smart-contract worker. */
export async function sendSolanaTransfer(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<{ signature: string }> {
  return sendWithdrawal(playerWallet, amount, ref);
}
