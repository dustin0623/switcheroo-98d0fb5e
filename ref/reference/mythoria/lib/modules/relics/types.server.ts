import type { Document } from "mongoose";
import type { Rarity } from "@/lib/modules/items/types.server";

export interface IRelicMarket {
  listed:  boolean;
  amount:  number;
  price:   number;
  seller:  string | null;
  created: number;
  expires: number;
  sold:    number;
}

export interface IRelic extends Document {
  wallet:  string;
  type:    Rarity;   // relic type maps to rarity tier
  amount:  number;
  version: number;
  market:  IRelicMarket;
}
