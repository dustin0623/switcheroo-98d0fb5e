import type { Document } from "mongoose";
import type { Rarity, ItemType, IItemAttributes } from "@/lib/modules/items/types.server";

export interface IItemTemplate extends Document {
  id:           number;
  name:         string;
  type:         ItemType;
  rarity:       Rarity;
  edition:      string;
  max_supply:   number;
  supply_minted: number;
  image:        string;
  description:  string;
  attributes:   IItemAttributes;
  market:       { listed: boolean; price: number };
}
