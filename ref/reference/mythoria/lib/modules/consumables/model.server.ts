import mongoose, { Schema, Model } from "mongoose";
import type { IConsumable } from "./types.server";

const ConsumableMarketSchema = new Schema(
  { listed: Boolean, amount: { type: Number, default: 0 }, price: Number,
    seller: { type: String, default: null }, created: Number, expires: Number, sold: Number },
  { _id: false }
);

const ConsumableSchema = new Schema<IConsumable>({
  wallet:  { type: String, required: true },
  type:    { type: String, required: true },
  amount:  { type: Number, default: 0 },
  version: { type: Number, default: 0 },
  market:  { type: ConsumableMarketSchema, default: () => ({ listed: false, amount: 0, price: 0, seller: null, created: 0, expires: 0, sold: 0 }) },
}, { collection: "consumables" });

ConsumableSchema.index({ wallet: 1, type: 1 }, { unique: true });

export const ConsumableModel: Model<IConsumable> =
  mongoose.models.Consumable ?? mongoose.model<IConsumable>("Consumable", ConsumableSchema);
