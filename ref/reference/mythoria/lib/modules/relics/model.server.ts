import mongoose, { Schema, Model } from "mongoose";
import type { IRelic } from "./types.server";

const RelicMarketSchema = new Schema(
  { listed: Boolean, amount: { type: Number, default: 0 }, price: Number,
    seller: { type: String, default: null }, created: Number, expires: Number, sold: Number },
  { _id: false }
);

const RelicSchema = new Schema<IRelic>({
  wallet:  { type: String, required: true },
  type:    { type: String, required: true, enum: ["common","uncommon","rare","epic","legendary"] },
  amount:  { type: Number, default: 0 },
  version: { type: Number, default: 0 },
  market:  { type: RelicMarketSchema, default: () => ({ listed: false, amount: 0, price: 0, seller: null, created: 0, expires: 0, sold: 0 }) },
}, { collection: "relics" });

RelicSchema.index({ wallet: 1, type: 1 }, { unique: true });

export const RelicModel: Model<IRelic> =
  mongoose.models.Relic ?? mongoose.model<IRelic>("Relic", RelicSchema);
