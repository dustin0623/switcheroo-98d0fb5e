// Deterministic mock dataset for citizen1..citizen10.
// Shapes mirror docs/api/*.schema.json. Pure functions — safe to run per-request.

import { seedFromString, mulberry32 } from "@/components/logs";
import type {
  Attributes,
  BattlePlayer,
  ConsumableEntry,
  EquippedSet,
  ForgeLog,
  InventoryResponse,
  Item,
  ItemTemplate,
  LeaderboardEntry,
  MarketLogEntry,
  UserMarketLogEntry,
  MarketplaceListingItem,
  NftLog,
  Player,
  Quest,
  QuestBoard,
  RelicEntry,
  RichlistEntry,
  SalvageLog,
  StatsResponse,
  TimeSeriesPoint,
  SalvagePoint,
  ActivityPoint,
  BossPoint,
  ClaimLog,
} from "./types";
import { CITIZENS } from "./types";

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
const ITEM_TYPES = ["avatar", "weapon", "armor", "ship", "special"] as const;
const NAMES: Record<(typeof ITEM_TYPES)[number], readonly string[]> = {
  avatar: ["Deep Adventurer", "Signal Runner", "Exterior Welder", "Nomad Scout"],
  weapon: ["Ion Lance", "Omega Destroyer", "Power Hammer", "Vengeance Seeker"],
  armor: ["Hazmat Suit", "Void Cloak", "Sentinel Plate", "Bulwark"],
  ship: ["Fury", "Vanguard", "Warden", "Nomad"],
  special: ["Kinetic Core", "Chrono Sink", "Nano Forge", "Aegis Node"],
};
const QUEST_TYPES = ["gather", "explore", "combat", "escort", "sabotage"] as const;
const CONSUMABLE_TYPES = [
  "crit",
  "damage",
  "dodge",
  "protection",
  "focus",
  "rage",
  "impenetrable",
  "overload",
  "rogue",
  "fury",
] as const;

const NOW = 1_732_000_000_000;

function pickIdx(rand: () => number, len: number) {
  return Math.floor(rand() * len);
}
function attrs(rand: () => number, boost = 1): Attributes {
  return {
    damage: +(rand() * 60 * boost).toFixed(4),
    defense: +(rand() * 60 * boost).toFixed(4),
    engineering: +(rand() * 60 * boost).toFixed(4),
    dodge: +(rand() * 20 * boost).toFixed(4),
    crit: +(rand() * 20 * boost).toFixed(4),
    luck: +(rand() * 20 * boost).toFixed(4),
  };
}

// Per-GDD item attribute rolling (see docs/TERRACORE_GAME_MECHANICS.md §12).
// - Attribute counts by rarity: common=1, uncommon=2, rare=3, epic=4 or 5, legendary=6
// - weapon → first attribute is always damage; armor → always defense
// - ship / special / avatar → first attribute is random from all six
// - Additional attributes drawn without repeats from remaining pool
// - Roll ∈ [0.1*ri, ri]; damage/defense stored ×10, others as-is
type ItemType = (typeof ITEM_TYPES)[number];
type RarityKey = (typeof RARITIES)[number];
const ALL_ATTR_KEYS = ["damage", "defense", "engineering", "dodge", "crit", "luck"] as const;
const RARITY_INDEX: Record<RarityKey, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 6,
};
const ATTR_COUNT: Record<RarityKey, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 6,
};

function rollItemAttributes(rand: () => number, type: ItemType, rarity: RarityKey): Attributes {
  const out: Attributes = { damage: 0, defense: 0, engineering: 0, dodge: 0, crit: 0, luck: 0 };
  let ri = RARITY_INDEX[rarity];
  let count = ATTR_COUNT[rarity];
  if (rarity === "epic") {
    // Epic rolls between 4 or 5 attributes; ri becomes 4 or 5 accordingly
    if (rand() * 100 <= 50) { count = 4; ri = 4; } else { count = 5; ri = 5; }
  }

  const pool = [...ALL_ATTR_KEYS] as (keyof Attributes)[];
  const chosen: (keyof Attributes)[] = [];
  if (type === "weapon") {
    chosen.push("damage");
    pool.splice(pool.indexOf("damage"), 1);
  } else if (type === "armor") {
    chosen.push("defense");
    pool.splice(pool.indexOf("defense"), 1);
  } else {
    const idx = Math.floor(rand() * pool.length);
    chosen.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  while (chosen.length < count && pool.length) {
    const idx = Math.floor(rand() * pool.length);
    chosen.push(pool[idx]!);
    pool.splice(idx, 1);
  }

  for (const key of chosen) {
    const roll = rand() * (ri - 0.1 * ri) + 0.1 * ri; // [0.1*ri, ri]
    const scaled = key === "damage" || key === "defense" ? roll * 10 : roll;
    out[key] = +scaled.toFixed(4);
  }
  return out;
}
function equippedSet(rand: () => number, username: string): EquippedSet {
  const build = (slot: ItemType): EquippedSet[keyof EquippedSet] => {
    const rarity = RARITIES[pickIdx(rand, RARITIES.length)]!;
    return {
      item_number: 1 + pickIdx(rand, 15000),
      item_id: 1 + pickIdx(rand, 15000),
      item_equipped: true,
      attributes: rollItemAttributes(rand, slot, rarity),
      rarity,
      level: 1 + pickIdx(rand, 12),
    };
  };
  void username;
  return {
    avatar: build("avatar"),
    weapon: build("weapon"),
    armor: build("armor"),
    ship: build("ship"),
    special: build("special"),
  };
}

function sumStats(set: EquippedSet): Attributes {
  const acc: Attributes = { damage: 0, defense: 0, engineering: 0, dodge: 0, crit: 0, luck: 0 };
  for (const k of ["avatar", "weapon", "armor", "ship", "special"] as const) {
    const a = set[k].attributes;
    acc.damage += a.damage;
    acc.defense += a.defense;
    acc.engineering += a.engineering;
    acc.dodge += a.dodge;
    acc.crit += a.crit;
    acc.luck += a.luck;
  }
  return {
    damage: +acc.damage.toFixed(4),
    defense: +acc.defense.toFixed(4),
    engineering: +acc.engineering.toFixed(4),
    dodge: +acc.dodge.toFixed(4),
    crit: +acc.crit.toFixed(4),
    luck: +acc.luck.toFixed(4),
  };
}

function buildPlayer(username: string): Player {
  const rand = mulberry32(seedFromString(`${username}-player-v1`));
  const items = equippedSet(rand, username);
  const stats = sumStats(items);
  const level = 5 + pickIdx(rand, 50);
  return {
    username,
    favor: pickIdx(rand, 1000),
    scrap: +(rand() * 5000).toFixed(3),
    health: 100,
    // Base combat levels are independent of equipment. Damage / defense are
    // stored as level × 10 (matching the on-chain SC field), so a display of
    // `player.damage + equipped.damage` reads out the effective attack, and
    // the pure base level is `player.damage / 10`. Engineering stores the raw
    // integer level. All base levels start at 1 — there is no level 0.
    damage: (1 + pickIdx(rand, 10)) * 10,
    defense: (1 + pickIdx(rand, 10)) * 10,
    engineering: 1 + pickIdx(rand, 12),
    cooldown: 300,
    minerate: +(rand() * 2 + 0.1).toFixed(4),
    attacks: pickIdx(rand, 10),
    lastregen: NOW - pickIdx(rand, 3600 * 1000),
    claims: pickIdx(rand, 500),
    lastclaim: NOW - pickIdx(rand, 3600 * 1000),
    registrationTime: NOW - (30 + pickIdx(rand, 700)) * 86_400_000,
    lastBattle: NOW - pickIdx(rand, 86_400_000),
    experience: level * 1000 + pickIdx(rand, 999),
    level,
    version: 3,
    balance: +(rand() * 200).toFixed(3),
    consumables: {
      type: 0,
      type_times: [],
      crit: pickIdx(rand, 5),
      damage: pickIdx(rand, 5),
      dodge: pickIdx(rand, 5),
      protection: pickIdx(rand, 5),
      focus: pickIdx(rand, 5),
      rage: pickIdx(rand, 5),
      impenetrable: pickIdx(rand, 5),
      overload: pickIdx(rand, 5),
      rogue: pickIdx(rand, 5),
      fury: pickIdx(rand, 5),
      crit_times: [],
      damage_times: [],
      dodge_times: [],
      protection_times: [],
      focus_times: [],
      rage_times: [],
      impenetrable_times: [],
      overload_times: [],
      rogue_times: [],
      fury_times: [],
    },
    flux: +(rand() * 500).toFixed(4),
    hiveEngineScrap: +(rand() * 10_000).toFixed(3),
    hiveEngineStake: Math.floor(rand() * 100_000),
    items,
    last_upgrade_time: NOW - pickIdx(rand, 86_400_000),
    maxAttacks: 10,
    stats,
    boss_data: [
      { name: "Terracore", lastBattle: NOW - pickIdx(rand, 86_400_000), level: 1 },
      { name: "Oceana", lastBattle: NOW - pickIdx(rand, 86_400_000), level: 10 },
      { name: "Celestia", lastBattle: NOW - pickIdx(rand, 86_400_000), level: 25 },
      { name: "Arborealis", lastBattle: NOW - pickIdx(rand, 86_400_000), level: 40 },
      { name: "Neptolith", lastBattle: NOW - pickIdx(rand, 86_400_000), level: 60 },
      { name: "Solisar", lastBattle: NOW - pickIdx(rand, 86_400_000), level: 80 },
    ],
    lastPayout: NOW - pickIdx(rand, 86_400_000),
    lastRewardTime: NOW - pickIdx(rand, 86_400_000),
    protection_time: 0,
    last_attack_decrease_time: NOW - pickIdx(rand, 86_400_000),
    stashsize: +(rand() * 5000 + 500).toFixed(3),
  };
}

function buildItem(username: string, i: number, rand: () => number): Item {
  const type = ITEM_TYPES[pickIdx(rand, ITEM_TYPES.length)]!;
  const rarity = RARITIES[pickIdx(rand, RARITIES.length)]!;
  const name = NAMES[type][pickIdx(rand, NAMES[type].length)]!;
  const itemNumber = 1 + i + pickIdx(rand, 500);
  const listed = rand() > 0.75;
  const price = listed ? +(rand() * 4000 + 100).toFixed(3) : 0;
  return {
    _id: `${username}-item-${i}`,
    name,
    id: 100 + pickIdx(rand, 500),
    edition: "beta",
    print: 1 + pickIdx(rand, 9999),
    max_supply: 10000,
    description: `${rarity} ${type}`,
    image: "",
    owner: username,
    type,
    rarity,
    equiped: i < 5,
    burnt: false,
    attributes: rollItemAttributes(rand, type, rarity),
    market: {
      listed,
      price,
      seller: listed ? username : null,
      created: listed ? NOW - pickIdx(rand, 86_400_000) : 0,
      expires: listed ? NOW + 7 * 86_400_000 : 0,
      sold: 0,
    },
    item_number: itemNumber,
    level: 1 + pickIdx(rand, 12),
    version: 3,
    lastTransfer: NOW - pickIdx(rand, 86_400_000),
  };
}

function buildInventory(username: string): InventoryResponse {
  const rand = mulberry32(seedFromString(`${username}-inv-v1`));
  const items = Array.from({ length: 24 }, (_, i) => buildItem(username, i, rand));
  const relics: RelicEntry[] = RARITIES.map((r, i) => ({
    _id: `${username}-relic-${r}`,
    username,
    version: 3,
    type: r.toUpperCase() as RelicEntry["type"],
    amount: +(rand() * 100 + 5).toFixed(3),
    market: {
      listed: false,
      amount: 0,
      price: 0,
      seller: null,
      created: 0,
      expires: 0,
      sold: 0,
    },
  })).map((e) => e);
  const consumables: ConsumableEntry[] = CONSUMABLE_TYPES.map((t) => ({
    _id: `${username}-cons-${t}`,
    username,
    version: 3,
    type: t,
    amount: pickIdx(rand, 20),
    market: {
      listed: false,
      amount: 0,
      price: "0",
      seller: "",
      created: 0,
      expires: 0,
      sold: 0,
    },
  }));
  const crates = Array.from({ length: 6 }, (_, i) => {
    const rarity = RARITIES[pickIdx(rand, RARITIES.length)]!;
    return {
      _id: `${username}-crate-${i}`,
      rarity,
      owner: username,
      acquired: NOW - Math.floor(rand() * 1000 * 60 * 60 * 24 * 14),
    };
  });
  return { items, crates, relics, consumables };
}


function buildQuestBoard(): QuestBoard {
  const rand = mulberry32(seedFromString("global-quest-board"));
  const slots = Array.from({ length: 6 }, (_, i) => {
    const qt = QUEST_TYPES[pickIdx(rand, QUEST_TYPES.length)]!;
    return {
      template_id: `tpl-${i}-${qt}`,
      quest_type: qt,
      tier: 1 + pickIdx(rand, 5),
      name: `${qt[0]!.toUpperCase() + qt.slice(1)} Run ${i + 1}`,
      flavor: "A remnant signal calls from the outer wastes.",
      image_url: "",
      duration_hours: 1 + pickIdx(rand, 12),
      base_rolls: 1 + pickIdx(rand, 5),
      scrap_cost: 50 + pickIdx(rand, 500),
    };
  });
  return {
    date: new Date(NOW).toISOString().slice(0, 10),
    slots,
    generated_at: NOW,
    multiplier: 1.0,
    scrap_usd: 0.0021,
  };
}

function buildQuests(username: string): Quest[] {
  const rand = mulberry32(seedFromString(`${username}-quests-v1`));
  return Array.from({ length: 3 }, (_, i) => {
    const qt = QUEST_TYPES[pickIdx(rand, QUEST_TYPES.length)]!;
    const started = NOW - pickIdx(rand, 6 * 3600 * 1000);
    const duration = (1 + pickIdx(rand, 8)) * 3600 * 1000;
    return {
      _id: `${username}-quest-${i}`,
      username,
      quest_type: qt,
      tier: 1 + pickIdx(rand, 5),
      name: `${qt} run ${i + 1}`,
      flavor: "Contract acquired.",
      image_url: null,
      primary_stat: "engineering",
      required_item_type: "ship",
      scrap_paid: 50 + pickIdx(rand, 500),
      base_rolls: 1 + pickIdx(rand, 4),
      duration_hours: null,
      equipped_item_rarity: RARITIES[pickIdx(rand, RARITIES.length)]!,
      equipped_item_level: 1 + pickIdx(rand, 12),
      effective_primary_stat: +(rand() * 100).toFixed(3),
      started_at: started,
      completes_at: started + duration,
      expires_at: started + duration + 6 * 3600 * 1000,
      collected: false,
      time_remaining_ms: Math.max(0, started + duration - NOW),
      board_date: new Date(NOW).toISOString().slice(0, 10),
    };
  });
}

function buildForgeLogs(username: string): ForgeLog[] {
  const rand = mulberry32(seedFromString(`${username}-forge-v1`));
  return Array.from({ length: 40 }, (_, i) => {
    const item = buildItem(username, i, rand);
    return {
      username,
      item,
      flux: (rand() * 50).toFixed(5),
      time: new Date(NOW - i * 3600_000 * 6).toISOString(),
    };
  });
}

function buildSalvageLogs(username: string): SalvageLog[] {
  const rand = mulberry32(seedFromString(`${username}-salvage-v1`));
  return Array.from({ length: 60 }, (_, i) => ({
    username,
    item_number: 14000 - i - pickIdx(rand, 5),
    value: +(rand() * 25 + 1).toFixed(5),
    time: NOW - i * 3600_000 * 3,
  }));
}

function buildClaimLogs(username: string): ClaimLog[] {
  const rand = mulberry32(seedFromString(`${username}-claim-v1`));
  return Array.from({ length: 80 }, (_, i) => ({
    username,
    qty: (1500 + rand() * 1500).toFixed(8),
    status: "success",
    time: NOW - i * (14000_000 + Math.floor(rand() * 2000_000)),
  }));
}

function buildNftLogs(username: string): NftLog[] {
  const rand = mulberry32(seedFromString(`${username}-nft-v1`));
  return Array.from({ length: 40 }, (_, i) => ({
    item_id: 100 + pickIdx(rand, 500),
    item_number: 1 + i + pickIdx(rand, 500),
    rarity: RARITIES[pickIdx(rand, RARITIES.length)]!,
    owner: username,
    type: ITEM_TYPES[pickIdx(rand, ITEM_TYPES.length)]!,
    attributes: rollItemAttributes(rand, ITEM_TYPES[pickIdx(rand, ITEM_TYPES.length)]!, RARITIES[pickIdx(rand, RARITIES.length)]!),
    edition: "beta",
    seed: `${username}-seed-${i}`,
    roll: pickIdx(rand, 10000),
    timestamp: NOW - i * 3600_000 * 2,
  }));
}

function buildBattle(): { players: BattlePlayer[] } {
  const players: BattlePlayer[] = CITIZENS.map((u, i) => {
    const p = buildPlayer(u);
    return { ...p, _id: `battle-${i}` };
  });
  return { players };
}

function buildLeaderboard(): LeaderboardEntry[] {
  return CITIZENS.map((u) => {
    const p = buildPlayer(u);
    return {
      username: u,
      favor: p.favor,
      scrap: Math.floor(p.scrap),
      attacks: p.attacks,
      claims: p.claims,
      experience: p.experience,
      level: p.level,
      hiveEngineScrap: p.hiveEngineScrap,
      hiveEngineStake: p.hiveEngineStake,
      items: p.items,
      stats: p.stats,
      reward: +(Math.random() * 0 + p.level * 0.1).toFixed(3),
    };
  }).sort((a, b) => b.experience - a.experience);
}

function buildMarketplaceItems(): MarketplaceListingItem[] {
  const rand = mulberry32(seedFromString("marketplace-items-v1"));
  return Array.from({ length: 60 }, (_, i) => {
    const owner = CITIZENS[pickIdx(rand, CITIZENS.length)]!;
    const type = ITEM_TYPES[pickIdx(rand, ITEM_TYPES.length)]!;
    const rarity = RARITIES[pickIdx(rand, RARITIES.length)]!;
    const name = NAMES[type][pickIdx(rand, NAMES[type].length)]!;
    const price = (rand() * 4000 + 50).toFixed(3);
    return {
      name,
      id: 100 + pickIdx(rand, 500),
      edition: "beta",
      item_number: 1 + i + pickIdx(rand, 500),
      print: 1 + pickIdx(rand, 9999),
      max_supply: 10000,
      description: `${rarity} ${type}`,
      image: "",
      owner,
      type,
      rarity,
      equiped: false,
      attributes: rollItemAttributes(rand, type, rarity),
      market: {
        listed: true,
        seller: owner,
        price,
        sold: 0,
        created: NOW - pickIdx(rand, 86_400_000),
      },
      version: 3,
      lastTransfer: NOW - pickIdx(rand, 86_400_000),
      burnt: false,
      level: 1 + pickIdx(rand, 12),
    };
  });
}

function buildMarketplaceRelics(): RelicEntry[] {
  const rand = mulberry32(seedFromString("marketplace-relics-v1"));
  return Array.from({ length: 30 }, (_, i) => {
    const seller = CITIZENS[pickIdx(rand, CITIZENS.length)]!;
    const r = RARITIES[pickIdx(rand, RARITIES.length)]!;
    return {
      _id: `mkt-relic-${i}`,
      username: seller,
      version: 3,
      type: r.toUpperCase() as RelicEntry["type"],
      amount: +(rand() * 50 + 1).toFixed(3),
      market: {
        listed: true,
        amount: Math.ceil(rand() * 20),
        price: Math.ceil(rand() * 500 + 10),
        seller,
        created: NOW - pickIdx(rand, 86_400_000),
        expires: NOW + 7 * 86_400_000,
        sold: 0,
      },
    };
  });
}

function buildMarketplaceConsumables(): ConsumableEntry[] {
  const rand = mulberry32(seedFromString("marketplace-consumables-v1"));
  return Array.from({ length: 30 }, (_, i) => {
    const seller = CITIZENS[pickIdx(rand, CITIZENS.length)]!;
    const t = CONSUMABLE_TYPES[pickIdx(rand, CONSUMABLE_TYPES.length)]!;
    return {
      _id: `mkt-cons-${i}`,
      username: seller,
      version: 3,
      type: t,
      amount: 1 + pickIdx(rand, 20),
      market: {
        listed: true,
        amount: 1 + pickIdx(rand, 20),
        price: (rand() * 200 + 5).toFixed(3),
        seller,
        created: NOW - pickIdx(rand, 86_400_000),
        expires: NOW + 7 * 86_400_000,
        sold: 0,
      },
    };
  });
}

function buildMarketLogs(): MarketLogEntry[] {
  const rand = mulberry32(seedFromString("marketplace-logs-v1"));
  return Array.from({ length: 200 }, (_, i) => {
    const buyer = CITIZENS[pickIdx(rand, CITIZENS.length)]!;
    let seller = CITIZENS[pickIdx(rand, CITIZENS.length)]!;
    if (seller === buyer) seller = CITIZENS[(pickIdx(rand, CITIZENS.length) + 1) % CITIZENS.length]!;
    const rarity = RARITIES[pickIdx(rand, RARITIES.length)]!;
    return {
      action: "purchase",
      id: `log-${i}`,
      item_number: String(1 + pickIdx(rand, 15000)),
      buyer,
      seller,
      price: +(rand() * 4000 + 20).toFixed(3),
      marketplace: "items",
      rarity,
      qty: 1 + pickIdx(rand, 5),
      created: NOW - i * 3600_000,
    };
  });
}

function buildUserMarketLogs(username: string, all: MarketLogEntry[]): UserMarketLogEntry[] {
  const rand = mulberry32(seedFromString(`${username}-user-market-logs-v1`));
  const out: UserMarketLogEntry[] = [];
  // Purchases involving this user (buyer or seller) — reuse the global feed.
  for (const l of all) {
    if (l.buyer !== username && l.seller !== username) continue;
    out.push({
      action: "purchase",
      id: `${l.rarity ?? "relic"}_relics`,
      item_number: `${l.rarity ?? "relic"}_relics`,
      buyer: l.buyer,
      seller: l.seller,
      price: l.price,
      marketplace: "mythoria.market",
      rarity: null,
      qty: +(rand() * 20 + 0.05).toFixed(6),
      created: l.created,
    });
  }
  // A handful of transfer/cancel events on real item numbers so the page mirrors
  // the upstream shape (which mixes actions).
  for (let i = 0; i < 12; i++) {
    const otherIdx = pickIdx(rand, CITIZENS.length);
    const other = CITIZENS[otherIdx] === username
      ? CITIZENS[(otherIdx + 1) % CITIZENS.length]!
      : CITIZENS[otherIdx]!;
    const isTransfer = rand() > 0.4;
    const rarity = RARITIES[pickIdx(rand, RARITIES.length)]!;
    out.push({
      action: isTransfer ? "transfer" : "cancel",
      id: 3000 + i,
      item_number: 14000 + pickIdx(rand, 900),
      buyer: isTransfer ? other : null,
      seller: username,
      price: isTransfer ? null : 0,
      marketplace: null,
      rarity,
      qty: 1,
      created: NOW - (i + 1) * 3600_000 * 5,
    });
  }
  out.sort((a, b) => b.created - a.created);
  return out;
}

function buildItemsArchive(): ItemTemplate[] {
  const rand = mulberry32(seedFromString("items-archive-v1"));
  const out: ItemTemplate[] = [];
  for (let i = 0; i < 120; i++) {
    const type = ITEM_TYPES[i % ITEM_TYPES.length]!;
    const rarity = RARITIES[Math.min(4, Math.floor(rand() * 5))]!;
    const name = `${NAMES[type][pickIdx(rand, NAMES[type].length)]!} #${i}`;
    const maxSupply = 10000;
    out.push({
      id: 1000 + i,
      item_number: i,
      name,
      type,
      rarity,
      edition: "beta",
      max_supply: maxSupply,
      supply_minted: Math.floor(rand() * maxSupply),
      image: "",
      description: `${rarity} ${type} template.`,
      attributes: rollItemAttributes(rand, type, rarity),
    });
  }
  return out;
}

function buildRichlist(players: Record<string, Player>): RichlistEntry[] {
  const rows: RichlistEntry[] = CITIZENS.map((u) => {
    const p = players[u]!;
    const stash = p.scrap || 0;
    const total = (p.hiveEngineStake || 0) + (p.hiveEngineScrap || 0) + stash;
    return {
      rank: 0,
      username: u,
      staked: p.hiveEngineStake || 0,
      liquid: p.hiveEngineScrap || 0,
      stash,
      flux: p.flux || 0,
      total,
    };
  });
  rows.sort((a, b) => b.total - a.total);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

function buildStats(players: Record<string, Player>): StatsResponse {
  const pl = Object.values(players);
  const liquidScrap = pl.reduce((s, p) => s + (p.hiveEngineScrap || 0), 0);
  const stakedScrap = pl.reduce((s, p) => s + (p.hiveEngineStake || 0), 0);
  const liquidFlux = pl.reduce((s, p) => s + (p.flux || 0), 0);
  const rand = mulberry32(seedFromString("stats-v1"));
  const days = 30;
  const players_series: TimeSeriesPoint[] = [];
  const salvaged: SalvagePoint[] = [];
  const activity: ActivityPoint[] = [];
  const boss: BossPoint[] = [];
  const staked: TimeSeriesPoint[] = [];
  const burned: TimeSeriesPoint[] = [];
  const vol: TimeSeriesPoint[] = [];
  const tx: TimeSeriesPoint[] = [];
  let cumPlayers = pl.length - Math.floor(days * 0.4);
  let cumStake = Math.floor(stakedScrap * 0.5);
  let cumBurn = 0;
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(NOW - d * 86_400_000).toISOString().slice(0, 10);
    const newP = Math.floor(rand() * 2);
    cumPlayers += newP;
    players_series.push({ date, value: newP, cumulative: cumPlayers });
    salvaged.push({
      date,
      items: Math.floor(rand() * 20),
      generatedFlux: +(rand() * 100).toFixed(2),
      burntFlux: +(rand() * 60).toFixed(2),
      spentFlux: +(rand() * 40).toFixed(2),
    });
    activity.push({
      date,
      battles: 2000 + Math.floor(rand() * 2000),
      quests: 200 + Math.floor(rand() * 800),
    });
    boss.push({
      date,
      wins: Math.floor(rand() * 20),
      losses: Math.floor(rand() * 20),
    });
    const stakeDelta = Math.floor(rand() * 20000);
    cumStake += stakeDelta;
    staked.push({ date, value: stakeDelta, cumulative: cumStake });
    const burnDelta = Math.floor(rand() * 15000);
    cumBurn += burnDelta;
    burned.push({ date, value: burnDelta, cumulative: cumBurn });
    vol.push({ date, value: +(rand() * 500).toFixed(2) });
    tx.push({ date, value: Math.floor(rand() * 80) });
  }
  return {
    totals: {
      players: cumPlayers,
      liquidScrap,
      liquidFlux,
      stakedScrap,
      burnedScrap: cumBurn,
      burnedFlux: +(liquidFlux * 0.8).toFixed(2),
    },
    series: {
      players: players_series,
      salvagedItems: salvaged,
      dailyActivity: activity,
      bossBattles: boss,
      scrapStaked: staked,
      scrapBurned: burned,
      marketVolume: vol,
      marketTransactions: tx,
    },
  };
}

// --- Public API ---

let _cache: {
  players: Record<string, Player>;
  inventory: Record<string, InventoryResponse>;
  quests: Record<string, Quest[]>;
  forgeLogs: Record<string, ForgeLog[]>;
  salvageLogs: Record<string, SalvageLog[]>;
  nftLogs: Record<string, NftLog[]>;
  claimLogs: Record<string, ClaimLog[]>;
  questBoard: QuestBoard;
  battle: { players: BattlePlayer[] };
  leaderboard: LeaderboardEntry[];
  marketItems: MarketplaceListingItem[];
  marketRelics: RelicEntry[];
  marketConsumables: ConsumableEntry[];
  marketLogs: MarketLogEntry[];
  userMarketLogs: Record<string, UserMarketLogEntry[]>;
  itemsArchive: ItemTemplate[];
  richlist: RichlistEntry[];
  stats: StatsResponse;
} | null = null;

function build() {
  const players: Record<string, Player> = {};
  const inventory: Record<string, InventoryResponse> = {};
  const quests: Record<string, Quest[]> = {};
  const forgeLogs: Record<string, ForgeLog[]> = {};
  const salvageLogs: Record<string, SalvageLog[]> = {};
  const nftLogs: Record<string, NftLog[]> = {};
  const claimLogs: Record<string, ClaimLog[]> = {};
  for (const u of CITIZENS) {
    players[u] = buildPlayer(u);
    inventory[u] = buildInventory(u);
    quests[u] = buildQuests(u);
    forgeLogs[u] = buildForgeLogs(u);
    salvageLogs[u] = buildSalvageLogs(u);
    nftLogs[u] = buildNftLogs(u);
    claimLogs[u] = buildClaimLogs(u);
  }
  const marketLogs = buildMarketLogs();
  const userMarketLogs: Record<string, UserMarketLogEntry[]> = {};
  for (const u of CITIZENS) userMarketLogs[u] = buildUserMarketLogs(u, marketLogs);
  return {
    players,
    inventory,
    quests,
    forgeLogs,
    salvageLogs,
    nftLogs,
    claimLogs,
    questBoard: buildQuestBoard(),
    battle: buildBattle(),
    leaderboard: buildLeaderboard(),
    marketItems: buildMarketplaceItems(),
    marketRelics: buildMarketplaceRelics(),
    marketConsumables: buildMarketplaceConsumables(),
    marketLogs,
    userMarketLogs,
    itemsArchive: buildItemsArchive(),
    richlist: buildRichlist(players),
    stats: buildStats(players),
  };
}

export function getDataset() {
  if (!_cache) _cache = build();
  return _cache;
}
