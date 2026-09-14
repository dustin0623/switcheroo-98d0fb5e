// src/lib/modules/market-listings/model.server.ts
import mongoose, { Schema, Model } from "mongoose";
import type { IMarketListing } from "./types.server";

const MarketListingSchema = new Schema<IMarketListing>({
  seller:     { type: String, required: true, index: true },
  itemNumber: { type: Number, required: true, unique: true, index: true },
  price:      { type: Number, required: true, min: 1 },
  status: {
    type: String,
    required: true,
    enum: ["active", "sold", "cancelled"],
    default: "active",
    index: true,
  },
  soldTo:     String,
  soldAt:     Number,
  listedAt:   { type: Number, default: () => Date.now() },
}, { collection: "market-listings", timestamps: true });

MarketListingSchema.index({ status: 1, price: 1 });
MarketListingSchema.index({ status: 1, listedAt: -1 });

export const MarketListingModel: Model<IMarketListing> =
  mongoose.models["MarketListing"] ??
  mongoose.model<IMarketListing>("MarketListing", MarketListingSchema);
