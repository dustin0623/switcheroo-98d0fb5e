import mongoose, { Schema, Model } from "mongoose";
import type { IItem } from "./types.server";

const AttributesSchema = new Schema(
  { damage: Number, defense: Number, arcane: Number, dodge: Number, crit: Number, luck: Number },
  { _id: false }
);

const MarketSchema = new Schema(
  { listed: Boolean, price: Number, seller: { type: String, default: null },
    created: Number, expires: Number, sold: Number },
  { _id: false }
);

const ItemSchema = new Schema<IItem>({
  item_number:  { type: Number, required: true, unique: true, index: true },
  name:         { type: String, required: true },
  id:           { type: Number, required: true },
  edition:      { type: String, default: "" },
  print:        { type: Number, default: 1 },
  max_supply:   { type: Number, default: 0 },
  description:  { type: String, default: "" },
  image:        { type: String, default: "" },
  owner:        { type: String, default: null },
  type:         { type: String, required: true,
                  enum: ["avatar","weapon","armor","mount","artifact"] },
  rarity:       { type: String, required: true,
                  enum: ["common","uncommon","rare","epic","legendary"] },
  equiped:      { type: Boolean, default: false },
  salvaged:     { type: Boolean, default: false },
  burnt:        { type: Boolean, default: false },
  attributes:   { type: AttributesSchema, default: () => ({}) },
  market:       { type: MarketSchema,    default: () => ({ listed: false, price: 0, seller: null, created: 0, expires: 0, sold: 0 }) },
  level:        { type: Number, default: 1 },
  version:      { type: Number, default: 0 },
  lastTransfer: { type: Number, default: 0 },
}, { collection: "items" });

ItemSchema.index({ owner: 1 });
ItemSchema.index({ "market.listed": 1, "market.price": 1 });

export const ItemModel: Model<IItem> =
  mongoose.models.Item ?? mongoose.model<IItem>("Item", ItemSchema);
