// Types derived from docs/api/*.schema.json
// Kept minimal — only fields the UI touches are strictly typed.

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ItemType = "avatar" | "weapon" | "armor" | "ship" | "special";

export interface Attributes {
  damage: number;
  defense: number;
  engineering: number;
  dodge: number;
  crit: number;
  luck: number;
}

export interface EquippedSlot {
  item_number: number;
  item_id: number;
  item_equipped: boolean;
  attributes: Attributes;
  rarity: Rarity;
  level: number;
}

export interface EquippedSet {
  avatar: EquippedSlot;
  weapon: EquippedSlot;
  armor: EquippedSlot;
  ship: EquippedSlot;
  special: EquippedSlot;
}

export interface PlayerConsumables {
  type: number;
  type_times: number[];
  crit: number;
  damage: number;
  dodge: number;
  protection: number;
  focus: number;
  rage: number;
  impenetrable: number;
  overload: number;
  rogue: number;
  fury: number;
  crit_times: number[];
  damage_times: number[];
  dodge_times: number[];
  protection_times: number[];
  focus_times: number[];
  rage_times: number[];
  impenetrable_times: number[];
  overload_times: number[];
  rogue_times: number[];
  fury_times: number[];
}

export interface BossDatum {
  name: string;
  lastBattle: number;
  level: number;
}

export interface Player {
  username: string;
  favor: number;
  scrap: number;
  health: number;
  damage: number;
  defense: number;
  engineering: number;
  cooldown: number;
  minerate: number;
  attacks: number;
  lastregen: number;
  claims: number;
  lastclaim: number;
  registrationTime: number;
  lastBattle: number;
  experience: number;
  level: number;
  version: number;
  balance: number;
  consumables: PlayerConsumables;
  flux: number;
  hiveEngineScrap: number;
  hiveEngineStake: number;
  items: Partial<EquippedSet>;
  last_upgrade_time: number;
  maxAttacks: number;

  stats: Attributes;
  boss_data: BossDatum[];
  lastPayout: number;
  lastRewardTime: number;
  protection_time?: number;
  last_attack_decrease_time?: number;
  stashsize?: number;
}

export interface ItemMarket {
  listed: boolean;
  price: number;
  seller: string | null;
  created: number;
  expires: number;
  sold: number;
}

export interface Item {
  _id: string;
  name: string;
  id: number;
  edition: string;
  print: number;
  max_supply: number;
  description: string;
  image: string;
  owner: string;
  type: ItemType;
  rarity: Rarity;
  equiped: boolean;
  burnt: boolean;
  attributes: Attributes;
  market: ItemMarket;
  item_number: number;
  level: number;
  version: number;
  lastTransfer: number;
}

export interface RelicEntry {
  _id: string;
  username: string;
  version: number;
  type: Rarity | "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  amount: number;
  market: {
    listed: boolean;
    amount: number;
    price: number;
    seller: string | null;
    created: number;
    expires: number;
    sold: number;
  };
}

export interface ConsumableEntry {
  _id: string;
  username: string;
  version: number;
  type: string;
  amount: number;
  market: {
    listed: boolean;
    amount: number;
    price: string;
    seller: string;
    created: number;
    expires: number;
    sold: number;
  };
}

export interface Crate {
  _id: string;
  rarity: Rarity;
  owner: string;
  acquired: number;
}

export interface InventoryResponse {
  items: Item[];
  crates: Crate[];
  relics: RelicEntry[];
  consumables: ConsumableEntry[];
}


export interface QuestBoardSlot {
  template_id: string;
  quest_type: string;
  tier: number;
  name: string;
  flavor: string;
  image_url: string;
  duration_hours: number;
  base_rolls: number;
  scrap_cost: number;
}

export interface QuestBoard {
  date: string;
  slots: QuestBoardSlot[];
  generated_at: number;
  multiplier: number;
  scrap_usd: number;
}

export interface Quest {
  _id: string;
  username: string;
  quest_type: string;
  tier: number;
  name: string;
  flavor: string;
  image_url: string | null;
  primary_stat: string;
  required_item_type: string;
  scrap_paid: number;
  base_rolls: number;
  duration_hours: number | null;
  equipped_item_rarity: Rarity;
  equipped_item_level: number;
  effective_primary_stat: number;
  started_at: number;
  completes_at: number;
  expires_at: number;
  collected: boolean;
  time_remaining_ms: number;
  board_date: string;
}

export interface NftLog {
  item_id: number;
  item_number: number;
  rarity: Rarity;
  owner: string;
  type: ItemType;
  attributes: Attributes;
  edition: string;
  seed: string;
  roll: number;
  timestamp: number;
}

export interface ForgeLog {
  username: string;
  item: Item;
  flux: string;
  time: string;
}

export interface SalvageLog {
  username: string;
  item_number: number;
  value: number;
  time: number;
}

export interface ClaimLog {
  username: string;
  qty: string;
  status: string;
  time: number;
}

export interface BattlePlayer extends Player {
  _id: string;
}

export interface MarketplaceListingItem {
  name: string;
  id: number;
  edition: string;
  item_number: number;
  print: number;
  max_supply: number;
  description: string;
  image: string;
  owner: string;
  type: ItemType;
  rarity: Rarity;
  equiped: boolean;
  attributes: Attributes;
  market: {
    listed: boolean;
    seller: string;
    price: string;
    sold: number;
    created: number;
  };
  version: number;
  lastTransfer: number;
  burnt: boolean;
  level: number;
}

export interface MarketLogEntry {
  action: string;
  id: string;
  item_number: string;
  buyer: string;
  seller: string;
  price: number;
  marketplace: string;
  rarity: Rarity | null;
  qty: number;
  created: number;
}

export interface MarketLogsResponse {
  totalPages: number;
  data: MarketLogEntry[];
}

export interface UserMarketLogEntry {
  action: "purchase" | "transfer" | "cancel";
  id: string | number;
  item_number: string | number;
  buyer: string | null;
  seller: string | null;
  price: number | null;
  marketplace: string | null;
  rarity: string | null;
  qty: number;
  created: number;
}

export interface LeaderboardEntry {
  username: string;
  favor: number;
  scrap: number;
  attacks: number;
  claims: number;
  experience: number;
  level: number;
  hiveEngineScrap: number;
  hiveEngineStake: number;
  items: Partial<EquippedSet>;
  stats: Attributes;
  reward: number;
}


export interface ItemTemplate {
  id: number;
  item_number: number;
  name: string;
  type: ItemType;
  rarity: Rarity;
  edition: string;
  max_supply: number;
  supply_minted: number;
  image: string;
  description: string;
  attributes: Attributes;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  cumulative?: number;
}
export interface SalvagePoint {
  date: string;
  items: number;
  generatedFlux: number;
  burntFlux: number;
  spentFlux: number;
}
export interface ActivityPoint {
  date: string;
  battles: number;
  quests: number;
}
export interface BossPoint {
  date: string;
  wins: number;
  losses: number;
}

export interface StatsResponse {
  totals: {
    players: number;
    liquidScrap: number;
    liquidFlux: number;
    stakedScrap: number;
    burnedScrap: number;
    burnedFlux: number;
  };
  series: {
    players: TimeSeriesPoint[];
    salvagedItems: SalvagePoint[];
    dailyActivity: ActivityPoint[];
    bossBattles: BossPoint[];
    scrapStaked: TimeSeriesPoint[];
    scrapBurned: TimeSeriesPoint[];
    marketVolume: TimeSeriesPoint[];
    marketTransactions: TimeSeriesPoint[];
  };
}

export interface RichlistEntry {
  rank: number;
  username: string;
  staked: number;
  liquid: number;
  stash: number;
  flux: number;
  total: number;
}

export const CITIZENS = Array.from({ length: 10 }, (_, i) => `citizen${i + 1}`);
