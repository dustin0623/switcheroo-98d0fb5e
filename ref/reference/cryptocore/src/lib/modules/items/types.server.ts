import type { Document } from "mongoose";
import type { Rarity, SlotKey, StatRoll } from "@/features/types/game";

export interface IItemBase {
  itemNumber: number;      // unique global serial
  owner: string | null;    // wallet address
  name: string;
  slot: SlotKey;
  rarity: Rarity;
  level: number;
  stats: StatRoll;
  equipped: boolean;
  salvaged: boolean;
  image: string;
  createdAt: number;
  lastTransfer: number;
}

export interface IItem extends IItemBase, Document {}

export type ItemInput = IItemBase;
