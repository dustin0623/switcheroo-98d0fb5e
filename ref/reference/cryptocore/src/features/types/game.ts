export type StatKey =
  | "hashRate"
  | "hackPower"
  | "security"
  | "luck"
  | "firewall"
  | "exploit";

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export type SlotKey =
  | "asicMiner"
  | "motherboard"
  | "powerSupply"
  | "coolingSystem"
  | "networkModule"
  | "firmwareChip";

export type StatBlock = Record<StatKey, number>;
export type StatRoll = Partial<Record<StatKey, number>>;

export interface Equipment {
  id: string;
  name: string;
  slot: SlotKey;
  rarity: Rarity;
  stats: StatRoll;
  level: number;
  equipped: boolean;
  createdAt: number;
}

export type ChestKey = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface Rival {
  id: string;
  username: string;
  avatarSeed: string;
  /** Stub Solana wallet address — links out to Solscan on the player card. */
  address: string;
  /** Profile cosmetics — future shop purchases. */
  avatarUrl?: string;
  bannerUrl?: string;
  level: number;
  claims: number;
  attacks: number;
  hashRate: number;
  vault: number;
  security: number;
  firewall: number;
  hackPower: number;
  /** Gear the rival has equipped, shown on their player card. */
  equipped: Equipment[];
  raided: boolean;
  lastRaidedAt: number | null;
}

export interface RaidOutcome {
  success: boolean;
  reason: "success" | "blocked" | "failed" | "outmatched";
  chance: number;
  stealPercent: number;
  stolen: number;
}

export interface ActivityEntry {
  id: string;
  message: string;
  kind: "info" | "success" | "danger" | "loot";
  at: number;
}
