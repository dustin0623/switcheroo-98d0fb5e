/**
 * server/game-smart-contract/lib/transfers.ts
 *
 * Chain payout adapter used by the worker for withdrawals.
 * SERVER-ONLY — holds the treasury key path.
 */

import { PublicKey } from "@solana/web3.js";
import { sendToken, confirmSignature } from "@/lib/chain/solana/transfer";

export interface SendResult {
  signature: string;
}

/** Terminal error the worker dead-letters immediately. */
export class TerminalTransferError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "TerminalTransferError";
  }
}

/**
 * Sends `amount` of the game token from the treasury to `playerWallet`.
 * `ref` is the queue job's idempotency key — logged for traceability only.
 */
export async function sendOnChain(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<SendResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TerminalTransferError("INVALID_AMOUNT", `Invalid payout amount for ${ref}`);
  }

  let recipient: PublicKey;
  try {
    recipient = new PublicKey(playerWallet);
  } catch {
    throw new TerminalTransferError("INVALID_WALLET", `Not a valid Solana address: ${playerWallet}`);
  }

  const signature = await sendToken(recipient, amount);
  const confirmed = await confirmSignature(signature);
  if (!confirmed) throw new Error(`Payout transaction not confirmed: ${signature}`);

  return { signature };
}
