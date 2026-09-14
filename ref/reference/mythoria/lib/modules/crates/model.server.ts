import mongoose, { Schema, Model } from "mongoose";
import type { ICrate } from "./types.server";

const CrateMarketSchema = new Schema(
  { listed: Boolean, price: Number, seller: { type: String, default: null },
    created: Number, expires: Number, sold: Number },
  { _id: false }
);

const CrateSchema = new Schema<ICrate>({
  rarity:   { type: String, required: true, enum: ["common","uncommon","rare","epic","legendary"] },
  owner:    { type: String, required: true },
  acquired: { type: Number, default: () => Date.now() },
  market:   { type: CrateMarketSchema, default: () => ({ listed: false, price: 0, seller: null, created: 0, expires: 0, sold: 0 }) },
}, { collection: "crates" });

CrateSchema.index({ owner: 1 });
CrateSchema.index({ "market.listed": 1 });

export const CrateModel: Model<ICrate> =
  mongoose.models.Crate ?? mongoose.model<ICrate>("Crate", CrateSchema);
