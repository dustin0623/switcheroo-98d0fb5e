// POST /api/quests/start — start a quest from today's board
import { NextRequest } from "next/server";
import { getWallet } from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { connectDatabase } from "@/lib/config/database";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { getTodaysBoard } from "@/lib/modules/quest-board/repository.server";
import { hasActiveQuestForSlot, insertActiveQuest } from "@/lib/modules/active-quests/repository.server";

// ── quest constants (mirror stores/formulas/quests.ts) ─────────────────────
const QUEST_TYPE_MAP: Record<string, { primary: string; secondary: string | null; item: string }> = {
  combat:   { primary: "damage",      secondary: "crit",  item: "weapon"  },
  salvage:  { primary: "arcane", secondary: null,     item: "artifact" },
  stealth:  { primary: "dodge",       secondary: "luck",   item: "armor"   },
  fortune:  { primary: "luck",        secondary: "crit",   item: "avatar"  },
  defense:  { primary: "guardian",     secondary: null,     item: "mount"    },
  escort:   { primary: "damage",      secondary: "guardian",item: "mount"    },
  gather:   { primary: "arcane", secondary: null,     item: "artifact" },
  explore:  { primary: "dodge",       secondary: "luck",   item: "armor"   },
};

const TIER_LEVEL_REQ   = { 1: 1, 2: 10, 3: 25,  4: 50,  5: 100 } as Record<number, number>;
const TIER_STAT_REQ    = { 1: 10, 2: 50, 3: 100, 4: 200, 5: 500 } as Record<number, number>;
const TIER_STAT_REQ_IT = { 1: 2,  2: 5,  3: 12,  4: 20,  5: 40  } as Record<number, number>;
const TIER_BASE_COST   = { 1: 20, 2: 100, 3: 235, 4: 985, 5: 4010 } as Record<number, number>;
const TIER_DURATION    = { 1: 1,  2: 4,   3: 12,  4: 24,  5: 48   } as Record<number, number>;
const ITEM_ONLY_STATS  = new Set(["luck", "dodge"]);

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json() as { slot_index?: number };
  const { slot_index } = body;
  if (slot_index === undefined || typeof slot_index !== "number") {
    return apiError("slot_index is required", "INVALID_BODY", 400);
  }

  await connectDatabase();

  // 1. Load today's board
  const board = await getTodaysBoard();
  if (!board) return apiError("No quest board for today", "NO_BOARD", 404);

  const slot = board.slots[slot_index];
  if (!slot) return apiError("Invalid slot index", "INVALID_SLOT", 400);

  // 2. Load player (getWallet returns username; findPlayer resolves username-or-wallet)
  const { findPlayer } = await import("@/lib/modules/players/repository.server");
  const player = await findPlayer(wallet);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);
  const playerWallet = player.wallet;

  const mapping = QUEST_TYPE_MAP[slot.quest_type];
  if (!mapping) return apiError("Unknown quest type", "UNKNOWN_QUEST_TYPE", 400);

  // 3. Level check
  if ((player.level ?? 1) < (TIER_LEVEL_REQ[slot.tier] ?? 1)) {
    return apiError("Level too low", "LEVEL_TOO_LOW", 403);
  }

  // 4. Stat check
  const isItemOnly = ITEM_ONLY_STATS.has(mapping.primary);
  const statReq = isItemOnly ? (TIER_STAT_REQ_IT[slot.tier] ?? 2) : (TIER_STAT_REQ[slot.tier] ?? 10);
  const playerRecord = player as unknown as Record<string, unknown>;
  const primaryStatValue = isItemOnly
    ? getEquipmentStat(playerRecord, mapping.item, mapping.primary)
    : getPlayerStat(playerRecord, mapping.primary);

  if (primaryStatValue < statReq) {
    return apiError("Primary stat too low", "STAT_TOO_LOW", 403);
  }

  // 5. Tier ≥ 3 requires the relevant item equipped
  if (slot.tier >= 3) {
    const equippedSlot = (player.items as Record<string, unknown> | undefined)?.[mapping.item];
    if (!equippedSlot) {
      return apiError(`Requires ${mapping.item} equipped`, "ITEM_REQUIRED", 403);
    }
  }

  // 6. Cost check
  const multiplier = board.multiplier ?? 1.0;
  const cost = Math.ceil((TIER_BASE_COST[slot.tier] ?? 20) * multiplier);
  if ((player.aether ?? 0) < cost) {
    return apiError("Insufficient $AETHER", "INSUFFICIENT_FUNDS", 402);
  }

  // 7. One active quest per slot per board date
  const duplicate = await hasActiveQuestForSlot(playerWallet, board.date, slot.quest_type, slot.tier);
  if (duplicate) {
    return apiError("You already have an active quest for this slot", "DUPLICATE_QUEST", 409);
  }

  // 8. Snapshot equipped item data
  const equippedItem = (player.items as Record<string, { rarity?: string; level?: number; attributes?: Record<string, number> } | undefined> | undefined)?.[mapping.item];
  const equippedRarity = (equippedItem?.rarity as "common" | "uncommon" | "rare" | "epic" | "legendary") ?? "common";
  const equippedLevel  = equippedItem?.level ?? 1;

  // Primary stat effective value (item-only vs base + item)
  const secondaryStatValue = mapping.secondary
    ? getPlayerStat(playerRecord, mapping.secondary)
    : 0;

  // Item attribute value for the primary stat (used in affinity bonus)
  const itemAttrValue = equippedItem?.attributes?.[mapping.primary] ?? 0;

  const nowMs = Date.now();
  const durationMs = (slot.duration_hours ?? TIER_DURATION[slot.tier] ?? 1) * 3_600_000;

  // 9. Deduct cost — optimistic update with version check
  const updated = await PlayerModel.findOneAndUpdate(
    { wallet: playerWallet, version: player.version, aether: { $gte: cost } },
    { $inc: { aether: -cost, version: 1 } },
    { new: true }
  );
  if (!updated) {
    return apiError("Concurrent modification or insufficient funds — please retry", "CONFLICT", 409);
  }

  // 10. Insert active-quest document
  const quest = await insertActiveQuest({
    wallet: playerWallet,
    quest_type:             slot.quest_type,
    tier:                   slot.tier,
    name:                   slot.name,
    flavor:                 slot.flavor,
    image_url:              slot.image_url ?? null,
    primary_stat:           mapping.primary,
    required_item_type:     mapping.item,
    aether_paid:            cost,
    base_rolls:             slot.base_rolls,
    duration_hours:         slot.duration_hours ?? null,
    equipped_item_rarity:   equippedRarity,
    equipped_item_level:    equippedLevel,
    effective_primary_stat: primaryStatValue,
    secondary_stat_value:   secondaryStatValue,
    item_attribute_value:   itemAttrValue,
    started_at:             nowMs,
    completes_at:           nowMs + durationMs,
    expires_at:             nowMs + durationMs + 30 * 24 * 3_600_000,
    collected:              false,
    board_date:             board.date,
  } as never);

  // 11. Write quest-log start entry
  const { default: mongoose } = await import("mongoose");
  const db = mongoose.connection.db!;
  await db.collection("quest-log").insertOne({
    wallet: playerWallet,
    action:     "start",
    quest_type: slot.quest_type,
    tier:       slot.tier,
    name:       slot.name,
    board_date: board.date,
    aether_paid: cost,
    time:        new Date(),
  });

  return apiOk({ quest });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getPlayerStat(player: Record<string, unknown>, stat: string): number {
  // Base player stats live at top-level fields
  const baseVal = (player[stat] as number | undefined) ?? 0;
  // Plus item attribute bonuses (all equipped items)
  const items = player.items as Record<string, { attributes?: Record<string, number> } | undefined> | undefined;
  if (!items) return baseVal;
  let bonus = 0;
  for (const slot of Object.values(items)) {
    bonus += slot?.attributes?.[stat] ?? 0;
  }
  return baseVal + bonus;
}

function getEquipmentStat(
  player: Record<string, unknown>,
  itemSlot: string,
  stat: string
): number {
  const items = player.items as Record<string, { attributes?: Record<string, number> } | undefined> | undefined;
  return items?.[itemSlot]?.attributes?.[stat] ?? 0;
}
