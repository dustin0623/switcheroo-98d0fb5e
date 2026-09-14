import type { IQuestTemplate } from "@/lib/modules/quest-templates/types.server";

// ─── Tier constants (canonical source: hive-engine/lib/quests.js) ────────────
export const TIER_LEVEL_REQ:    Record<number, number> = { 1: 1,   2: 10,  3: 25,  4: 50,  5: 100 };
export const TIER_STAT_REQ:     Record<number, number> = { 1: 10,  2: 50,  3: 100, 4: 200, 5: 500 };
export const TIER_STAT_REQ_ITEM:Record<number, number> = { 1: 2,   2: 5,   3: 12,  4: 20,  5: 40  };
export const TIER_BASE_COST:    Record<number, number> = { 1: 20,  2: 100, 3: 235, 4: 985, 5: 4010 };
export const TIER_DURATION:     Record<number, number> = { 1: 1,   2: 4,   3: 12,  4: 24,  5: 48  };
export const TIER_BASE_ROLLS:   Record<number, number> = { 1: 2,   2: 3,   3: 4,   4: 6,   5: 10  };

// Stats that can only be raised via NFT items (luck, dodge) — item-only thresholds apply
export const ITEM_ONLY_STATS = new Set<string>(["luck", "dodge"]);

// Quest type → primary stat, secondary stat, required item slot
export const QUEST_TYPE_MAP: Record<
  IQuestTemplate["quest_type"],
  { primary: string; secondary: string | null; item: string }
> = {
  combat:  { primary: "damage",      secondary: "crit",  item: "weapon"  },
  gather: { primary: "arcane", secondary: null,     item: "artifact" },
  stealth: { primary: "dodge",       secondary: "luck",  item: "armor"   },
  fortune: { primary: "luck",        secondary: "crit",  item: "avatar"  },
  guardian: { primary: "guardian",     secondary: null,     item: "mount"    },
  escort:  { primary: "guardian",     secondary: "damage", item: "mount"   },
  gather:  { primary: "arcane", secondary: "luck",  item: "artifact" },
  explore: { primary: "dodge",       secondary: null,     item: "armor"   },
};

// ─── Static quest templates ───────────────────────────────────────────────────
// One entry per quest_type × tier combination (5 types × 5 tiers = 25 templates minimum).
// The seed script imports this array and upserts by `name` into the quest-templates collection.
// The quest-board generateBoard() can also import this directly to skip the DB round-trip.

type QuestTemplateInput = Omit<IQuestTemplate, keyof Document>;

export const QUEST_TEMPLATES: QuestTemplateInput[] = [
  // ── COMBAT ──────────────────────────────────────────────────────────────
  {
    id: "combat-1", quest_type: "combat", tier: 1,
    name: "Skirmish Protocol",
    flavor: "A routine patrol turns hostile. Neutralize threats before they multiply.",
    image_url: "",
    duration_hours: TIER_DURATION[1], base_rolls: TIER_BASE_ROLLS[1], aether_cost: TIER_BASE_COST[1],
    active: true,
  },
  {
    id: "combat-2", quest_type: "combat", tier: 2,
    name: "Breach and Clear",
    flavor: "Enemy units have fortified an abandoned station. Storm the corridors.",
    image_url: "",
    duration_hours: TIER_DURATION[2], base_rolls: TIER_BASE_ROLLS[2], aether_cost: TIER_BASE_COST[2],
    active: true,
  },
  {
    id: "combat-3", quest_type: "combat", tier: 3,
    name: "Iron Barrage",
    flavor: "A coordinated assault force is pushing through the outer belt. Hold the line.",
    image_url: "",
    duration_hours: TIER_DURATION[3], base_rolls: TIER_BASE_ROLLS[3], aether_cost: TIER_BASE_COST[3],
    active: true,
  },
  {
    id: "combat-4", quest_type: "combat", tier: 4,
    name: "Siege of Kethara",
    flavor: "A warlord's armada bears down on a key mining colony. Your firepower is all that stands between them and annihilation.",
    image_url: "",
    duration_hours: TIER_DURATION[4], base_rolls: TIER_BASE_ROLLS[4], aether_cost: TIER_BASE_COST[4],
    active: true,
  },
  {
    id: "combat-5", quest_type: "combat", tier: 5,
    name: "Apex Predator",
    flavor: "The most dangerous weapons platform ever fielded has gone rogue. Hunt it down.",
    image_url: "",
    duration_hours: TIER_DURATION[5], base_rolls: TIER_BASE_ROLLS[5], aether_cost: TIER_BASE_COST[5],
    active: true,
  },

  // ── SALVAGE ──────────────────────────────────────────────────────────────
  {
    id: "gather-1", quest_type: "gather", tier: 1,
    name: "Debris Field Survey",
    flavor: "Loose components drift through the wreckage of last week's skirmish. Collect before scavengers do.",
    image_url: "",
    duration_hours: TIER_DURATION[1], base_rolls: TIER_BASE_ROLLS[1], aether_cost: TIER_BASE_COST[1],
    active: true,
  },
  {
    id: "gather-2", quest_type: "gather", tier: 2,
    name: "Hull Extraction",
    flavor: "A derelict freighter carries rare alloys in its reinforced hull panels. Cut them free.",
    image_url: "",
    duration_hours: TIER_DURATION[2], base_rolls: TIER_BASE_ROLLS[2], aether_cost: TIER_BASE_COST[2],
    active: true,
  },
  {
    id: "gather-3", quest_type: "gather", tier: 3,
    name: "Deep Wreck Recovery",
    flavor: "A capital ship sank into the asteroid field decades ago. Its reactor core alone is worth a fortune.",
    image_url: "",
    duration_hours: TIER_DURATION[3], base_rolls: TIER_BASE_ROLLS[3], aether_cost: TIER_BASE_COST[3],
    active: true,
  },
  {
    id: "gather-4", quest_type: "gather", tier: 4,
    name: "Station Teardown",
    flavor: "Decommission an entire orbital platform and strip it for every usable part.",
    image_url: "",
    duration_hours: TIER_DURATION[4], base_rolls: TIER_BASE_ROLLS[4], aether_cost: TIER_BASE_COST[4],
    active: true,
  },
  {
    id: "gather-5", quest_type: "gather", tier: 5,
    name: "Colossus Gather",
    flavor: "The remains of a dreadnought class vessel — kilometers of exotic-grade metal waiting to be reclaimed.",
    image_url: "",
    duration_hours: TIER_DURATION[5], base_rolls: TIER_BASE_ROLLS[5], aether_cost: TIER_BASE_COST[5],
    active: true,
  },

  // ── STEALTH ──────────────────────────────────────────────────────────────
  {
    id: "stealth-1", quest_type: "stealth", tier: 1,
    name: "Silent Crossing",
    flavor: "Slip through a patrol checkpoint without raising an alert.",
    image_url: "",
    duration_hours: TIER_DURATION[1], base_rolls: TIER_BASE_ROLLS[1], aether_cost: TIER_BASE_COST[1],
    active: true,
  },
  {
    id: "stealth-2", quest_type: "stealth", tier: 2,
    name: "Ghost Protocol",
    flavor: "Infiltrate a rival corporation's logistics hub and walk out with their shipping manifests.",
    image_url: "",
    duration_hours: TIER_DURATION[2], base_rolls: TIER_BASE_ROLLS[2], aether_cost: TIER_BASE_COST[2],
    active: true,
  },
  {
    id: "stealth-3", quest_type: "stealth", tier: 3,
    name: "Shadow Extraction",
    flavor: "Extract a deep-cover operative from a heavily surveilled outpost.",
    image_url: "",
    duration_hours: TIER_DURATION[3], base_rolls: TIER_BASE_ROLLS[3], aether_cost: TIER_BASE_COST[3],
    active: true,
  },
  {
    id: "stealth-4", quest_type: "stealth", tier: 4,
    name: "Blacksite Infiltration",
    flavor: "A classified research installation holds data that could shift the balance of power. Get in, copy it, vanish.",
    image_url: "",
    duration_hours: TIER_DURATION[4], base_rolls: TIER_BASE_ROLLS[4], aether_cost: TIER_BASE_COST[4],
    active: true,
  },
  {
    id: "stealth-5", quest_type: "stealth", tier: 5,
    name: "Phantom Directive",
    flavor: "An assassination order from the highest authority. Leave no trace — not even a rumor.",
    image_url: "",
    duration_hours: TIER_DURATION[5], base_rolls: TIER_BASE_ROLLS[5], aether_cost: TIER_BASE_COST[5],
    active: true,
  },

  // ── FORTUNE ──────────────────────────────────────────────────────────────
  {
    id: "fortune-1", quest_type: "fortune", tier: 1,
    name: "Essence Lottery",
    flavor: "A derelict cache with randomized contents. Could be junk. Could be gold.",
    image_url: "",
    duration_hours: TIER_DURATION[1], base_rolls: TIER_BASE_ROLLS[1], aether_cost: TIER_BASE_COST[1],
    active: true,
  },
  {
    id: "fortune-2", quest_type: "fortune", tier: 2,
    name: "Merchant's Gambit",
    flavor: "Back a risky cargo run at the fringe market. The returns are unpredictable but potentially enormous.",
    image_url: "",
    duration_hours: TIER_DURATION[2], base_rolls: TIER_BASE_ROLLS[2], aether_cost: TIER_BASE_COST[2],
    active: true,
  },
  {
    id: "fortune-3", quest_type: "fortune", tier: 3,
    name: "Anomaly Hunt",
    flavor: "Probe readings indicate a high-density relic cluster inside an unstable nebula. Enter if you dare.",
    image_url: "",
    duration_hours: TIER_DURATION[3], base_rolls: TIER_BASE_ROLLS[3], aether_cost: TIER_BASE_COST[3],
    active: true,
  },
  {
    id: "fortune-4", quest_type: "fortune", tier: 4,
    name: "Void Prospector",
    flavor: "Chart and exploit a newly discovered void rift. No charts, no guarantees — only opportunity.",
    image_url: "",
    duration_hours: TIER_DURATION[4], base_rolls: TIER_BASE_ROLLS[4], aether_cost: TIER_BASE_COST[4],
    active: true,
  },
  {
    id: "fortune-5", quest_type: "fortune", tier: 5,
    name: "Grand Jackpot",
    flavor: "An ancient stellar vault rumored to hold the largest concentration of relics ever catalogued.",
    image_url: "",
    duration_hours: TIER_DURATION[5], base_rolls: TIER_BASE_ROLLS[5], aether_cost: TIER_BASE_COST[5],
    active: true,
  },

  // ── DEFENSE ──────────────────────────────────────────────────────────────
  {
    id: "guardian-1", quest_type: "guardian", tier: 1,
    name: "Perimeter Watch",
    flavor: "Hold a small outpost through a night cycle. Standard rotations, standard risks.",
    image_url: "",
    duration_hours: TIER_DURATION[1], base_rolls: TIER_BASE_ROLLS[1], aether_cost: TIER_BASE_COST[1],
    active: true,
  },
  {
    id: "guardian-2", quest_type: "guardian", tier: 2,
    name: "Bulwark Protocol",
    flavor: "Reinforce a supply convoy route against repeated raider incursions.",
    image_url: "",
    duration_hours: TIER_DURATION[2], base_rolls: TIER_BASE_ROLLS[2], aether_cost: TIER_BASE_COST[2],
    active: true,
  },
  {
    id: "guardian-3", quest_type: "guardian", tier: 3,
    name: "Citadel Guardian",
    flavor: "A mining colony under sustained siege. Coordinate the shields and hold until reinforcements arrive.",
    image_url: "",
    duration_hours: TIER_DURATION[3], base_rolls: TIER_BASE_ROLLS[3], aether_cost: TIER_BASE_COST[3],
    active: true,
  },
  {
    id: "guardian-4", quest_type: "guardian", tier: 4,
    name: "Iron Fortress",
    flavor: "An armored dreadnought is testing the limits of your defensive grid. Do not yield an inch.",
    image_url: "",
    duration_hours: TIER_DURATION[4], base_rolls: TIER_BASE_ROLLS[4], aether_cost: TIER_BASE_COST[4],
    active: true,
  },
  {
    id: "guardian-5", quest_type: "guardian", tier: 5,
    name: "Last Bastion",
    flavor: "The final defensive line before the core worlds. Every ship in the fleet is counting on you.",
    image_url: "",
    duration_hours: TIER_DURATION[5], base_rolls: TIER_BASE_ROLLS[5], aether_cost: TIER_BASE_COST[5],
    active: true,
  },

  // ── ESCORT ───────────────────────────────────────────────────────────────
  {
    id: "escort-1", quest_type: "escort", tier: 1,
    name: "Safe Passage",
    flavor: "Guide a civilian transport through a low-risk lane. Keep them calm and moving.",
    image_url: "",
    duration_hours: TIER_DURATION[1], base_rolls: TIER_BASE_ROLLS[1], aether_cost: TIER_BASE_COST[1],
    active: true,
  },
  {
    id: "escort-2", quest_type: "escort", tier: 2,
    name: "Convoy Shield",
    flavor: "A merchant convoy is moving through contested space. Fly flank and deter opportunists.",
    image_url: "",
    duration_hours: TIER_DURATION[2], base_rolls: TIER_BASE_ROLLS[2], aether_cost: TIER_BASE_COST[2],
    active: true,
  },
  {
    id: "escort-3", quest_type: "escort", tier: 3,
    name: "VIP Transfer",
    flavor: "A high-value asset needs to reach the neutral station alive. The enemy knows the route.",
    image_url: "",
    duration_hours: TIER_DURATION[3], base_rolls: TIER_BASE_ROLLS[3], aether_cost: TIER_BASE_COST[3],
    active: true,
  },
  {
    id: "escort-4", quest_type: "escort", tier: 4,
    name: "Flagship Guard",
    flavor: "A diplomatic flagship is crossing hostile territory on a mission that could end the war — or start a worse one.",
    image_url: "",
    duration_hours: TIER_DURATION[4], base_rolls: TIER_BASE_ROLLS[4], aether_cost: TIER_BASE_COST[4],
    active: true,
  },
  {
    id: "escort-5", quest_type: "escort", tier: 5,
    name: "Sovereign Run",
    flavor: "Escort the faction leader across the most dangerous corridor in known space. Failure is not an option.",
    image_url: "",
    duration_hours: TIER_DURATION[5], base_rolls: TIER_BASE_ROLLS[5], aether_cost: TIER_BASE_COST[5],
    active: true,
  },

  // ── GATHER ───────────────────────────────────────────────────────────────
  {
    id: "gather-1", quest_type: "gather", tier: 1,
    name: "Mineral Run",
    flavor: "Harvest a small cluster of raw ore deposits before the claim expires.",
    image_url: "",
    duration_hours: TIER_DURATION[1], base_rolls: TIER_BASE_ROLLS[1], aether_cost: TIER_BASE_COST[1],
    active: true,
  },
  {
    id: "gather-2", quest_type: "gather", tier: 2,
    name: "Resource Sweep",
    flavor: "Collect scattered resource nodes across a wide sector before rival fleets arrive.",
    image_url: "",
    duration_hours: TIER_DURATION[2], base_rolls: TIER_BASE_ROLLS[2], aether_cost: TIER_BASE_COST[2],
    active: true,
  },
  {
    id: "gather-3", quest_type: "gather", tier: 3,
    name: "Rare Element Extraction",
    flavor: "Deep seam extraction of exotic materials — heavy equipment required, heavy rewards expected.",
    image_url: "",
    duration_hours: TIER_DURATION[3], base_rolls: TIER_BASE_ROLLS[3], aether_cost: TIER_BASE_COST[3],
    active: true,
  },
  {
    id: "gather-4", quest_type: "gather", tier: 4,
    name: "Asteroid Core Drill",
    flavor: "Bore through kilometers of dense rock to tap the pure-grade metallic core beneath.",
    image_url: "",
    duration_hours: TIER_DURATION[4], base_rolls: TIER_BASE_ROLLS[4], aether_cost: TIER_BASE_COST[4],
    active: true,
  },
  {
    id: "gather-5", quest_type: "gather", tier: 5,
    name: "Singularity Harvest",
    flavor: "Extract exotic matter from the accretion disk of a micro black hole. The yields are staggering — so is the danger.",
    image_url: "",
    duration_hours: TIER_DURATION[5], base_rolls: TIER_BASE_ROLLS[5], aether_cost: TIER_BASE_COST[5],
    active: true,
  },

  // ── EXPLORE ──────────────────────────────────────────────────────────────
  {
    id: "explore-1", quest_type: "explore", tier: 1,
    name: "Uncharted Passage",
    flavor: "Map a newly flagged lane in the outer system. Sensors only, no engagement expected.",
    image_url: "",
    duration_hours: TIER_DURATION[1], base_rolls: TIER_BASE_ROLLS[1], aether_cost: TIER_BASE_COST[1],
    active: true,
  },
  {
    id: "explore-2", quest_type: "explore", tier: 2,
    name: "Deep Survey",
    flavor: "Chart three unexplored asteroid clusters and report back anomalous readings.",
    image_url: "",
    duration_hours: TIER_DURATION[2], base_rolls: TIER_BASE_ROLLS[2], aether_cost: TIER_BASE_COST[2],
    active: true,
  },
  {
    id: "explore-3", quest_type: "explore", tier: 3,
    name: "Frontier Expedition",
    flavor: "Push beyond the established boundary markers into a region with no prior survey data.",
    image_url: "",
    duration_hours: TIER_DURATION[3], base_rolls: TIER_BASE_ROLLS[3], aether_cost: TIER_BASE_COST[3],
    active: true,
  },
  {
    id: "explore-4", quest_type: "explore", tier: 4,
    name: "Dark Corridor Traverse",
    flavor: "Navigate a sensor-dead corridor where seven ships have gone missing. Find out why.",
    image_url: "",
    duration_hours: TIER_DURATION[4], base_rolls: TIER_BASE_ROLLS[4], aether_cost: TIER_BASE_COST[4],
    active: true,
  },
  {
    id: "explore-5", quest_type: "explore", tier: 5,
    name: "Event Horizon Probe",
    flavor: "The deepest unmapped region of known space. Whatever is out there has never been seen by human eyes.",
    image_url: "",
    duration_hours: TIER_DURATION[5], base_rolls: TIER_BASE_ROLLS[5], aether_cost: TIER_BASE_COST[5],
    active: true,
  },
];
