import mongoose, { Schema, Model } from "mongoose";
import type { IItemTemplate } from "./types.server";

const AttributesSchema = new Schema(
  { damage: Number, defense: Number, arcane: Number, dodge: Number, crit: Number, luck: Number },
  { _id: false }
);

const ItemTemplateSchema = new Schema<IItemTemplate>({
  id:            { type: Number, required: true, unique: true, index: true },
  name:          { type: String, required: true },
  type:          { type: String, required: true, enum: ["avatar","weapon","armor","mount","artifact"] },
  rarity:        { type: String, required: true, enum: ["common","uncommon","rare","epic","legendary"] },
  edition:       { type: String, default: "" },
  max_supply:    { type: Number, default: 0 },
  supply_minted: { type: Number, default: 0 },
  image:         { type: String, default: "" },
  description:   { type: String, default: "" },
  attributes:    { type: AttributesSchema, default: () => ({}) },
  market:        { type: new Schema({ listed: Boolean, price: Number }, { _id: false }),
                   default: () => ({ listed: false, price: 0 }) },
}, { collection: "item-templates" });

export const ItemTemplateModel: Model<IItemTemplate> =
  mongoose.models.ItemTemplate ?? mongoose.model<IItemTemplate>("ItemTemplate", ItemTemplateSchema);
