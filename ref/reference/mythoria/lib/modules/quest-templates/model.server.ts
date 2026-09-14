import mongoose, { Schema, type Model } from "mongoose";
import type { IQuestTemplate } from "./types.server";

const QuestTemplateSchema = new Schema<IQuestTemplate>(
  {
    id:            { type: String, required: true, unique: true, index: true },
    quest_type:    { type: String, required: true,
                     enum: ["combat","gather","stealth","fortune","guardian","escort","gather","explore"] },
    tier:          { type: Number, required: true, min: 1, max: 5 },
    name:          { type: String, required: true },
    flavor:        { type: String, default: "" },
    image_url:     { type: String, default: "" },
    duration_hours:{ type: Number, required: true },
    base_rolls:    { type: Number, required: true },
    aether_cost:   { type: Number, required: true },
    mgold_cost:    { type: Number, required: false }, // legacy alias kept for existing DB docs
    active:        { type: Boolean, default: true, index: true },
  },
  { collection: "quest-templates" }
);

export const QuestTemplateModel: Model<IQuestTemplate> =
  (mongoose.models["QuestTemplate"] as Model<IQuestTemplate>) ??
  mongoose.model<IQuestTemplate>("QuestTemplate", QuestTemplateSchema);
