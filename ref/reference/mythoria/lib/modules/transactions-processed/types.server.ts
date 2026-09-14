import type { Document } from "mongoose";

export type ProcessedTxType =
  | "withdrawal"
  | "deposit"
  | "crate_purchase"
  | "market_purchase";

export type ProcessedTxMetadata =
  | { type: "withdrawal";      payoutTxHash: string }
  | { type: "deposit";         creditedAmount: number }
  | { type: "crate_purchase";  crateNumbers: number[]; rarity: string }
  | { type: "market_purchase"; itemNumber: number; itemType: string };

export interface IProcessedTransaction extends Document {
  txHash:      string;         // unique idempotency key
  wallet:      string;
  type:        ProcessedTxType;
  amount:      number;         // negative for withdrawals, positive for deposits
  processedAt: number;         // Unix ms
  metadata?:   ProcessedTxMetadata;
}
