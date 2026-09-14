/**
 * lib/client/deposit/types.ts
 *
 * Shared client-side types for all deposit helpers.
 * Safe to import in browser code.
 */

export interface DepositResult {
  /** Chain-specific transaction id / signature / hash. */
  txId: string;
}

export interface DepositOptions {
  /** Token amount to send (in the token's display unit, e.g. 1.5). */
  amount: number;
  /** Treasury wallet address tokens should be sent to. */
  treasuryAddress: string;
  /**
   * Chain-specific: Hive requires a memo string on the transfer.
   * Other chains encode it in a separate memo instruction / tx.data field.
   */
  memo?: string;
}

export type DepositFn = (opts: DepositOptions) => Promise<DepositResult>;
