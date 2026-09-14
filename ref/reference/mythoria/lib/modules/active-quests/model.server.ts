import mongoose, { Schema, type Model } from "mongoose";
import type { IActiveQuest } from "./types.server";

const ActiveQuestSchema = new Schema<IActiveQuest>(
  {
    wallet:                 { type: String, required: true, index: true },
    quest_type:             { type: String, required: true },
    tier:                   { type: Number, required: true },
    name:                   { type: String, required: true },
    flavor:                 { type: String, default: "" },
    image_url:              { type: String, default: null },

    primary_stat:           { type: String, required: true },
    required_item_type:     { type: String, required: true },
    mgold_paid:             { type: Number, required: true },
    base_rolls:             { type: Number, required: true },
    duration_hours:         { type: Number, default: null },
    equipped_item_rarity:   { type: String, default: "common" },
    equipped_item_level:    { type: Number, default: 1 },
    effective_primary_stat: { type: Number, default: 0 },
    secondary_stat_value:   { type: Number, default: 0 },
    item_attribute_value:   { type: Number, default: 0 },

    started_at:             { type: Number, required: true },
    completes_at:           { type: Number, required: true },
    expires_at:             { type: Number, required: true },

    collected:              { type: Boolean, default: false },
    collected_at:           { type: Number },

    board_date:             { type: String, required: true },
  },
  { collection: "active-quests" }
);

ActiveQuestSchema.index({ wallet: 1, collected: 1 });
ActiveQuestSchema.index({ wallet: 1, board_date: 1 });

export const ActiveQuestModel: Model<IActiveQuest> =
  (mongoose.models["ActiveQuest"] as Model<IActiveQuest>) ??
  mongoose.model<IActiveQuest>("ActiveQuest", ActiveQuestSchema);
