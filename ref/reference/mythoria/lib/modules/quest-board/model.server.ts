import mongoose, { Schema, type Model } from "mongoose";
import type { IQuestBoard } from "./types.server";

const QuestBoardSlotSchema = new Schema(
  {
    template_id:    { type: String, required: true },
    quest_type:     { type: String, required: true },
    tier:           { type: Number, required: true },
    name:           { type: String, required: true },
    flavor:         { type: String, default: "" },
    image_url:      { type: String, default: "" },
    duration_hours: { type: Number, required: true },
    base_rolls:     { type: Number, required: true },
    mgold_cost:     { type: Number, required: true },
  },
  { _id: false }
);

const QuestBoardSchema = new Schema<IQuestBoard>(
  {
    date:         { type: String, required: true, unique: true, index: true },
    slots:        { type: [QuestBoardSlotSchema], default: [] },
    generated_at: { type: Number, default: () => Date.now() },
    multiplier:   { type: Number, default: 1.0 },
    mgold_usd:    { type: Number, default: 0 },
  },
  { collection: "quest-board" }
);

export const QuestBoardModel: Model<IQuestBoard> =
  (mongoose.models["QuestBoard"] as Model<IQuestBoard>) ??
  mongoose.model<IQuestBoard>("QuestBoard", QuestBoardSchema);
