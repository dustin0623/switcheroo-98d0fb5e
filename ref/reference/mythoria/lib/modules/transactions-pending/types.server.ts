import type { Document } from "mongoose";

export type InboundTxStatus  = "pending" | "failed" | "dead";
export type PendingTxType    = "withdrawal" | "deposit" | "crate_purchase" | "market_purchase";

export interface IInboundTransaction extends Document {
  type:          PendingTxType;
  signature:     string;       // idempotency key — UUID for withdrawal, txId for deposit
  walletAddress: string;       // payer / recipient

  // withdrawal fields
  withdrawAmount?: number;

  // deposit fields (deposit = player sends tokens to treasury)
  depositAmount?:  number;
  depositTxId?:    string;

  // crate purchase (off-chain shop)
  crateRarity?:    string;
  crateCount?:     number;

  // market purchase
  itemNumber?:     number;
  itemType?:       string;     // "item" | "crate" | "consumable" | "relic"

  status:          InboundTxStatus;
  retryCount:      number;
  lastError?:      string;
  createdAt:       Date;
  updatedAt:       Date;
}
