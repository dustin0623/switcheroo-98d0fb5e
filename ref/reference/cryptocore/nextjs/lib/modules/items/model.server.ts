// src/lib/modules/items/model.server.ts
import mongoose, { Schema, type Model } from "mongoose";
import type { IItem } from "./types.server";

const StatRollSchema = new Schema(
  {
    hashRate:  { type: Number, default: 0 },
    hackPower: { type: Number, default: 0 },
    security:  { type: Number, default: 0 },
    luck:      { type: Number, default: 0 },
    firewall:  { type: Number, default: 0 },
    exploit:   { type: Number, default: 0 },
  },
  { _id: false }
);

const ItemSchema = new Schema<IItem>(
  {
    itemNumber: { type: Number, required: true, unique: true, index: true },
    owner:      { type: String, default: null, index: true },
    name:       { type: String, required: true },
    slot:       { type: String, required: true },
    rarity:     { type: String, required: true },
    level:      { type: Number, default: 1 },
    stats:      { type: StatRollSchema, default: () => ({}) },
    equipped:   { type: Boolean, default: false },
    salvaged:   { type: Boolean, default: false },
    image:      { type: String, default: "" },
    createdAt:  { type: Number, default: () => Date.now() },
    lastTransfer: { type: Number, default: 0 },
  },
  { collection: "items" }
);

ItemSchema.index({ owner: 1, equipped: 1 });
ItemSchema.index({ rarity: 1, slot: 1 });

export const ItemModel: Model<IItem> =
  mongoose.models["Item"] ?? mongoose.model<IItem>("Item", ItemSchema);
