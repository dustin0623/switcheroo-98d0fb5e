import type { Document } from "mongoose";
import type { Rarity } from "@/lib/modules/items/types.server";

export interface ICrateMarket {
  listed:  boolean;
  price:   number;
  seller:  string | null;
  created: number;
  expires: number;
  sold:    number;
}

export interface ICrate extends Document {
  rarity:   Rarity;
  owner:    string;
  acquired: number;
  market:   ICrateMarket;
}
