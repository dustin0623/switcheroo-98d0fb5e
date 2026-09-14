import type { Document } from "mongoose";

export interface IConsumableMarket {
  listed:  boolean;
  amount:  number;
  price:   number;
  seller:  string | null;
  created: number;
  expires: number;
  sold:    number;
}

export interface IConsumable extends Document {
  wallet:  string;
  type:    string;   // e.g. "crit", "damage", "dodge", "protection", etc.
  amount:  number;
  version: number;
  market:  IConsumableMarket;
}
