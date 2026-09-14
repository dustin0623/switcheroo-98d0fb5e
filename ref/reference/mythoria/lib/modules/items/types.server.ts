import type { Document } from "mongoose";

export type Rarity   = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ItemType = "avatar" | "weapon" | "armor" | "mount" | "artifact";

export interface IItemAttributes {
  damage:      number;
  defense:     number;
  arcane: number;
  dodge:       number;
  crit:        number;
  luck:        number;
}

export interface IItemMarket {
  listed:  boolean;
  price:   number;
  seller:  string | null;
  created: number;
  expires: number;
  sold:    number;
}

export interface IItem extends Document {
  item_number:  number;
  name:         string;
  id:           number;
  edition:      string;
  print:        number;
  max_supply:   number;
  description:  string;
  image:        string;
  owner:        string | null;
  type:         ItemType;
  rarity:       Rarity;
  equiped:      boolean;    // intentional spelling from original contract
  salvaged:     boolean;
  burnt:        boolean;
  attributes:   IItemAttributes;
  market:       IItemMarket;
  level:        number;
  version:      number;
  lastTransfer: number;
}
