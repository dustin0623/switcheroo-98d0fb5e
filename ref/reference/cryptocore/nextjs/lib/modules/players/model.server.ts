// src/lib/modules/players/model.server.ts
import mongoose, { Schema, type Model } from "mongoose";
import type { IPlayer } from "./types.server";

const StatBlockSchema = new Schema(
  {
    hashRate:  { type: Number, default: 0 },
    hackPower: { type: Number, default: 0 },
    security:  { type: Number, default: 0 },
    luck:      { type: Number, default: 0 },
    firewall:  { type: Number, default: 0 },
    exploit:   { type: Number, default: 0 },
  },
  { _id: false }
);

const PlayerSchema = new Schema<IPlayer>(
  {
    wallet:   { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    registrationTime: { type: Number, default: () => Date.now() },

    xp:    { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    hash:        { type: Number, default: 250 },
    sparks:      { type: Number, default: 0 },
    vault:       { type: Number, default: 0 },
    vaultStaked: { type: Number, default: 0 },
    notoriety:   { type: Number, default: 0 },
    totalBurned: { type: Number, default: 0 },

    statLevels: { type: StatBlockSchema, default: () => ({
      hashRate: 1,
      hackPower: 1,
      security: 1,
      luck: 1,
      firewall: 1,
      exploit: 1,
    }) },

    lastTickAt:      { type: Number, default: () => Date.now() },
    lastSinkAt:      { type: Number, default: () => Date.now() },
    claimCharges:    { type: Number, default: 5 },
    lastClaimRegenAt:{ type: Number, default: () => Date.now() },
    raidCharges:     { type: Number, default: 8 },
    lastRaidRegenAt: { type: Number, default: () => Date.now() },

    totalClaimed: { type: Number, default: 0 },
    totalMined:   { type: Number, default: 0 },
    raids:        { type: Number, default: 0 },
    raidWins:     { type: Number, default: 0 },
    totalStolen:  { type: Number, default: 0 },
    bestHashRate: { type: Number, default: 1 },

    protectionUntil: { type: Number, default: 0 },
  },
  { collection: "players", timestamps: true }
);

export const PlayerModel: Model<IPlayer> =
  (mongoose.models["Player"] as Model<IPlayer>) ??
  mongoose.model<IPlayer>("Player", PlayerSchema);
