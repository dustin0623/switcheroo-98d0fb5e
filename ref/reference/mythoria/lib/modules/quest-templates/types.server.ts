import type { Document } from "mongoose";

export interface IQuestTemplate extends Document {
  /** Unique slug, e.g. "combat-1" */
  id: string;
  quest_type: "combat" | "gather" | "stealth" | "fortune" | "guardian" | "escort" | "gather" | "explore";
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  flavor: string;
  image_url: string;
  duration_hours: number;
  base_rolls: number;
  aether_cost: number;
  mgold_cost?: number; // legacy alias
  active: boolean;
}
