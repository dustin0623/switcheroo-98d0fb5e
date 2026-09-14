/**
 * features/events/quest-collect/action.ts
 *
 * Pure event — collect rewards from a completed quest.
 * Operates on plain state snapshots; no DB calls.
 */

import { now } from "@/lib/clock";
import { useGameStore } from "@/features/game-store/game-store";
import { collectQuestRewards } from "@/features/game-store/formulas/quests";
import { applyXp } from "@/features/game-store/formulas/xp";
import { createSeed } from "@/features/game-store/rng";

export function collectQuest(
  user: string,
  questId: string
): { ok: boolean; relics?: Partial<Record<string, number>>; shards?: Partial<Record<string, number>>; reason?: string } {
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
  const { relics, shards, xp } = collectQuestRewards(quest, player, seed);

  const updatedQuests = quests.map((q, idx) =>
    idx === questIndex ? { ...q, collected: true, time_remaining_ms: 0 } : q
  );
  const xpResult = applyXp({ level: player.level || 1, experience: player.experience || 0 }, xp);

  // Merge shard rewards into player.shards (gather/artifact quests only)
  const updatedShards = shards
    ? Object.fromEntries(
        (["common", "uncommon", "rare", "epic", "legendary"] as const).map((r) => [
          r,
          ((player.shards as Record<string, number> | undefined)?.[r] || 0) + (shards[r] || 0),
        ])
      )
    : player.shards;

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
        shards: updatedShards,
      },
    },
    quests: { ...s.quests, [user]: updatedQuests },
    inventory: { ...s.inventory, [user]: { ...s.inventory[user], relics: updatedRelics } },
  }));

  return { ok: true, relics, shards };
}
