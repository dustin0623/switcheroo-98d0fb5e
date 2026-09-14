// lib/modules/players/types.server.ts
// Server-only. Player document shape stored in the `players` collection.
import type { Document } from "mongoose";

export interface EquippedItem {
  item_number: number;
  item_id: string;
  item_equipped: boolean;
  rarity: string;
  level: number;
  attributes: {
    damage:  number;
    defense: number;
    arcane:  number;
    speed:   number;
    crit:    number;
    luck:    number;
  };
}

export interface IPlayer extends Document {
  wallet:   string; // primary key — on Hive equals username
  username: string; // always set; on Hive === wallet
  registrationTime: number;

  // Base stat levels
  arcane:  number;
  damage:  number;
  defense: number;
  favor:   number;
  experience: number;
  level:   number;

  // Economy — $AETHER only (no coins, mgold, flux, scrap)
  aether:          number; // claimed / liquid $AETHER balance
  unclaimedAether: number; // accumulated generation since last claim
  staked:          number;
  stashsize:       number;
  essence:         number; // crafting currency (renamed from flux)

  // Equipment slots (5 canonical: avatar, weapon, armor, mount, accessory)
  items: {
    avatar?:    EquippedItem;
    weapon?:    EquippedItem;
    armor?:     EquippedItem;
    mount?:     EquippedItem;
    accessory?: EquippedItem; // artifact slot shown in UI
  };

  // Boss data per planet
  boss_data: Array<{ name: string; level: number; lastBattle: number }>;

  // Timing
  last_upgrade_time: number;
  lastRewardTime:    number;
  lastBattle:        number;
  lastclaim:         number;
  cooldown:          number;

  // Withdrawal tracking
  withdrawnToday:  number;
  lastWithdrawnAt: number;

  // Combat / activity
  protection_time: number;
  attacks: number;
  claims:  number;

  // Cached aggregate stats
  stats: {
    arcane:  number;
    damage:  number;
    defense: number;
    speed:   number;
    crit:    number;
    luck:    number;
  };

  version: number;
  createdAt: Date;
  updatedAt: Date;
}
