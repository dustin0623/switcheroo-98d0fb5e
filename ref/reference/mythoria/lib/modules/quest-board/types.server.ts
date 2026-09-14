import type { Document } from "mongoose";

export interface IQuestBoardSlot {
  template_id: string;
  quest_type: string;
  tier: number;
  name: string;
  flavor: string;
  image_url: string;
  duration_hours: number;
  base_rolls: number;
  mgold_cost: number;
}

export interface IQuestBoard extends Document {
  /** ISO date string "YYYY-MM-DD" — unique per day */
  date: string;
  slots: IQuestBoardSlot[];
  generated_at: number;
  multiplier: number;
  mgold_usd: number;
}
