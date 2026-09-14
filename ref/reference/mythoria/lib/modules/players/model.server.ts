// lib/modules/players/model.server.ts
// Server-only. Mongoose model for the `players` collection.
import mongoose, { Schema, type Model } from "mongoose";
import type { IPlayer } from "./types.server";

const EquippedItemSchema = new Schema(
  {
    item_number: Number,
    item_id: String,
    item_equipped: Boolean,
    rarity: String,
    level: { type: Number, default: 1 },
    attributes: {
      damage:  Number,
      defense: Number,
      arcane:  Number,
      speed:   Number,
      crit:    Number,
      luck:    Number,
    },
  },
  { _id: false }
);

const PlayerSchema = new Schema<IPlayer>(
  {
    wallet:   { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, index: true },
    registrationTime: { type: Number, default: () => Date.now() },

    // Base stat levels (stored as level × 10 for damage/defense)
    arcane:  { type: Number, default: 0 },
    damage:  { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    favor:   { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    level:   { type: Number, default: 1 },

    // Economy — $AETHER only
    aether:          { type: Number, default: 0 }, // claimed / liquid balance
    unclaimedAether: { type: Number, default: 0 }, // accumulated since last claim
    staked:          { type: Number, default: 0 },
    stashsize:       { type: Number, default: 1 },
    essence:         { type: Number, default: 0 }, // crafting currency (was flux)

    // Equipment slots — 5 canonical slots
    items: {
      avatar:    { type: EquippedItemSchema },
      weapon:    { type: EquippedItemSchema },
      armor:     { type: EquippedItemSchema },
      mount:     { type: EquippedItemSchema },
      accessory: { type: EquippedItemSchema },
    },

    boss_data: [{ name: String, level: Number, lastBattle: Number }],

    last_upgrade_time: { type: Number, default: 0 },
    lastRewardTime:    { type: Number, default: 0 },
    lastBattle:        { type: Number, default: 0 },
    lastclaim:         { type: Number, default: 0 },
    cooldown:          { type: Number, default: 0 },

    withdrawnToday:  { type: Number, default: 0 },
    lastWithdrawnAt: { type: Number, default: 0 },
    protection_time: { type: Number, default: 0 },
    attacks:         { type: Number, default: 0 },
    claims:          { type: Number, default: 0 },

    // Computed / cached per-player stats
    stats: {
      arcane:  { type: Number, default: 0 },
      damage:  { type: Number, default: 0 },
      defense: { type: Number, default: 0 },
      speed:   { type: Number, default: 0 },
      crit:    { type: Number, default: 0 },
      luck:    { type: Number, default: 0 },
    },

    version: { type: Number, default: 0 },
  },
  { collection: "players", timestamps: true }
);

export const PlayerModel: Model<IPlayer> =
  (mongoose.models.Player as Model<IPlayer>) ??
  mongoose.model<IPlayer>("Player", PlayerSchema);
