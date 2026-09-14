/**
 * features/events/consumable-use/action.ts
 *
 * Pure event — activate a consumable from a player's inventory.
 * Operates on plain state snapshots; no DB calls.
 */

import { now } from "@/lib/clock";
import type { ConsumableType } from "@/features/game-store/formulas/consumables";
import { useGameStore } from "@/features/game-store/game-store";

export function useConsumable(
  user: string,
  type: ConsumableType
): { ok: boolean; reason?: string } {
  const state = useGameStore.getState();
  const inventory = state.inventory[user];
  const player = state.players[user];
  if (!inventory || !player) return { ok: false, reason: "No player" };

  const existing = inventory.consumables.find((c) => c.type === type);
  if (!existing || existing.amount <= 0) return { ok: false, reason: "No consumable" };

  const nowMs = now();
  const updatedConsumables = inventory.consumables.map((c) =>
    c.type === type ? { ...c, amount: c.amount - 1 } : c
  );

  const key = `${type}_times` as keyof typeof player.consumables;
  const times = [...((player.consumables?.[key] as number[] | undefined) || []), nowMs];

  useGameStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      [user]: { ...inventory, consumables: updatedConsumables },
    },
    players: {
      ...s.players,
      [user]: {
        ...player,
        consumables: {
          ...player.consumables,
          [type]: ((player.consumables?.[type as keyof typeof player.consumables] as number | undefined) || 0) + 1,
          [key]: times,
        },
      },
    },
  }));

  return { ok: true };
}
