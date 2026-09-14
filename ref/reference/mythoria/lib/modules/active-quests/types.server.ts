import type { Document, Types } from "mongoose";
import type { Rarity } from "@/lib/modules/items/types.server";

export interface IActiveQuest extends Document {
  _id: Types.ObjectId;
  wallet: string;
  quest_type: string;
  tier: number;
  name: string;
  flavor: string;
  image_url: string | null;

  /** Snapshotted at start time */
  primary_stat: string;
  required_item_type: string;
  mgold_paid: number;
  /** Alias for mgold_paid used by newer quest starts — whichever is present is the cost paid */
  aether_paid?: number;
  base_rolls: number;
  duration_hours: number | null;
  equipped_item_rarity: Rarity;
  equipped_item_level: number;
  effective_primary_stat: number;
  secondary_stat_value: number;
  item_attribute_value: number;

  started_at: number;
  completes_at: number;
  expires_at: number;

  collected: boolean;
  collected_at?: number;

  board_date: string;
}
