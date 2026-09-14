// src/lib/modules/players/types.server.ts
import type { Document } from "mongoose";
import type { StatBlock } from "@/features/types/game";

export interface IPlayer extends Document {
  wallet: string;            // primary key — Solana address
  username: string;            // unique display name
  registrationTime: number;

  xp: number;
  level: number;

  hash: number;              // claimed / liquid HASH balance
  sparks: number;            // secondary crafting currency
  vault: number;             // unclaimed mined HASH
  vaultStaked: number;       // HASH staked for Luck / Firewall
  notoriety: number;         // permanently burned HASH → Exploit
  totalBurned: number;

  statLevels: StatBlock;

  lastTickAt: number;
  lastSinkAt: number;

  claimCharges: number;
  lastClaimRegenAt: number;
  raidCharges: number;
  lastRaidRegenAt: number;

  totalClaimed: number;
  totalMined: number;
  raids: number;
  raidWins: number;
  totalStolen: number;
  bestHashRate: number;

  protectionUntil: number;     // opt-out shield after being raided

  createdAt: Date;
  updatedAt: Date;
}
