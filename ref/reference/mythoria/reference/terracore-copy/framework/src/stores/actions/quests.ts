import { now } from "@/lib/clock";
import type { Quest, QuestBoardSlot } from "@/mock/types";
import { useGameStore } from "@/stores/game-store";
import {
  canStartQuest,
  collectQuestRewards,
  QUEST_TYPE_MAP,
  TIER_BASE_ROLLS,
  TIER_DURATION,
  TIER_XP,
} from "@/stores/formulas/quests";
import { applyXp } from "@/stores/formulas/xp";
import { createSeed } from "@/stores/rng";

const MULTIPLIER = 1.0;

export function startQuest(
  user: string,
  slot: QuestBoardSlot
): { ok: boolean; quest?: Quest; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  if (!player) return { ok: false, reason: "No player" };

  const validation = canStartQuest(player, slot, MULTIPLIER);
  if (!validation.ok) return { ok: false, reason: validation.reason };

  const mapping = QUEST_TYPE_MAP[slot.quest_type];
  const nowMs = now();
  const durationMs = (slot.duration_hours || TIER_DURATION[slot.tier as keyof typeof TIER_DURATION]) * 3600000;
  const completesAt = nowMs + durationMs;
  const equipped = player.items?.[mapping.item as keyof typeof player.items];

  const quest: Quest = {
    _id: `${user}-${slot.quest_type}-${slot.tier}-${nowMs}`,
    username: user,
    quest_type: slot.quest_type,
    tier: slot.tier,
    name: slot.name,
    flavor: slot.flavor,
    image_url: slot.image_url,
    primary_stat: mapping.primary,
    required_item_type: mapping.item,
    scrap_paid: validation.cost!,
    base_rolls: slot.base_rolls || TIER_BASE_ROLLS[slot.tier as keyof typeof TIER_BASE_ROLLS],
    duration_hours: slot.duration_hours,
    equipped_item_rarity: equipped?.rarity || "common",
    equipped_item_level: equipped?.level || 1,
    effective_primary_stat: validation.cost ? 0 : 0,
    started_at: nowMs,
    completes_at: completesAt,
    expires_at: completesAt + 30 * 24 * 3600000,
    collected: false,
    time_remaining_ms: durationMs,
    board_date: state.questBoard?.date || "",
  };

  useGameStore.setState((s) => ({
    players: {
      ...s.players,
      [user]: {
        ...player,
        hiveEngineScrap: (player.hiveEngineScrap || 0) - validation.cost!,
        last_upgrade_time: nowMs,
        version: (player.version || 0) + 1,
      },
    },
    quests: {
      ...s.quests,
      [user]: [...(s.quests[user] || []), quest],
    },
  }));

  return { ok: true, quest };
}

export function collectQuest(
  user: string,
  questId: string
): { ok: boolean; relics?: Partial<Record<string, number>>; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  const quests = state.quests[user] || [];
  if (!player) return { ok: false, reason: "No player" };

  const questIndex = quests.findIndex((q) => q._id === questId);
  if (questIndex === -1) return { ok: false, reason: "Quest not found" };
  const quest = quests[questIndex];
  if (quest.collected) return { ok: false, reason: "Already collected" };

  const nowMs = now();
  if (quest.completes_at > nowMs) return { ok: false, reason: "Quest not complete" };

  const seed = createSeed(nowMs, questId, user);
  const { relics, xp } = collectQuestRewards(quest, player, seed);

  const updatedQuests = quests.map((q, idx) =>
    idx === questIndex ? { ...q, collected: true, time_remaining_ms: 0 } : q
  );
  const xpResult = applyXp({ level: player.level || 1, experience: player.experience || 0 }, xp);

  const relicsInventory = state.inventory[user]?.relics || [];
  const updatedRelics = [...relicsInventory];
  for (const [rarity, amount] of Object.entries(relics)) {
    if (!amount) continue;
    const existing = updatedRelics.find((r) => r.type.toLowerCase() === rarity);
    if (existing) {
      existing.amount += amount;
    } else {
      updatedRelics.push({
        _id: `${user}-${rarity}-${nowMs}`,
        username: user,
        version: 1,
        type: rarity.toUpperCase() as "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY",
        amount,
        market: { listed: false, amount: 0, price: 0, seller: null, created: 0, expires: 0, sold: 0 },
      });
    }
  }

  useGameStore.setState((s) => ({
    players: {
      ...s.players,
      [user]: {
        ...player,
        level: xpResult.level,
        experience: xpResult.experience,
        version: (player.version || 0) + 1,
      },
    },
    quests: { ...s.quests, [user]: updatedQuests },
    inventory: {
      ...s.inventory,
      [user]: { ...s.inventory[user], relics: updatedRelics },
    },
  }));

  return { ok: true, relics };
}
