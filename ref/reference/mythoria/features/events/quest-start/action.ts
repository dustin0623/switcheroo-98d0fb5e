/**
 * features/events/quest-start/action.ts
 *
 * Pure event — start a quest from the daily board.
 * Operates on plain state snapshots; no DB calls.
 */

import { now } from "@/lib/clock";
import type { Quest, QuestBoardSlot } from "@/features/types";
import { useGameStore } from "@/features/game-store/game-store";
import {
  canStartQuest,
  QUEST_TYPE_MAP,
  TIER_BASE_ROLLS,
  TIER_DURATION,
} from "@/features/game-store/formulas/quests";

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
    aether_paid: validation.cost!,
    mgold_paid: validation.cost!, // legacy alias
    base_rolls: slot.base_rolls || TIER_BASE_ROLLS[slot.tier as keyof typeof TIER_BASE_ROLLS],
    duration_hours: slot.duration_hours,
    equipped_item_rarity: equipped?.rarity || "common",
    equipped_item_level: equipped?.level || 1,
    effective_primary_stat: 0,
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
        aether: (player.aether || 0) - validation.cost!,
        last_upgrade_time: nowMs,
        version: (player.version || 0) + 1,
      },
    },
    quests: { ...s.quests, [user]: [...(s.quests[user] || []), quest] },
  }));

  return { ok: true, quest };
}
