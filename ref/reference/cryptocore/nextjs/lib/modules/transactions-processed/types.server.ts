// src/lib/modules/transactions-processed/types.server.ts
import type { Document } from "mongoose";

export type ProcessedTxType = "withdrawal" | "deposit" | "market_purchase";

export type ProcessedTxMetadata =
  | { type: "withdrawal"; payoutTxHash: string }
  | { type: "deposit"; creditedAmount: number }
  | {
      type: "market_purchase";
      itemNumber: number;
      itemType: string;
      seller: string;
      price: number;
      fee: number;
    };

export interface IProcessedTransaction extends Document {
  txHash:      string;         // unique idempotency key
  wallet:      string;
  type:        ProcessedTxType;
  amount:      number;         // negative for outflows, positive for inflows
  processedAt: number;         // Unix ms
  metadata?:   ProcessedTxMetadata;
}
