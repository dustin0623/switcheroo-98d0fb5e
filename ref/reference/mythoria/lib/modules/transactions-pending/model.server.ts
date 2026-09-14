import mongoose, { Schema, Model } from "mongoose";
import type { IInboundTransaction } from "./types.server";

const InboundTransactionSchema = new Schema<IInboundTransaction>({
  type: {
    type: String,
    required: true,
    enum: ["withdrawal", "deposit", "crate_purchase", "market_purchase"],
  },
  signature:     { type: String, required: true, unique: true, index: true },
  walletAddress: { type: String, required: true },

  withdrawAmount: Number,
  depositAmount:  Number,
  depositTxId:    String,
  crateRarity:    String,
  crateCount:     Number,
  itemNumber:     Number,
  itemType:       String,

  status: {
    type: String,
    required: true,
    enum: ["pending", "failed", "dead"],
    default: "pending",
  },
  retryCount: { type: Number, default: 0 },
  lastError:  String,
}, { collection: "transactions_pending", timestamps: true });

InboundTransactionSchema.index({ status: 1, createdAt: 1 });

export const InboundTransactionModel: Model<IInboundTransaction> =
  mongoose.models.InboundTransaction ??
  mongoose.model<IInboundTransaction>("InboundTransaction", InboundTransactionSchema);
