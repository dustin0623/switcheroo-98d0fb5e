/**
 * features/events/scrap-stake/action.ts
 *
 * Pure event — stake liquid $AETHER to increase stash size.
 * Operates on plain state snapshots; no DB calls.
 */

import { useGameStore } from "@/features/game-store/game-store";

export function stakeScrap(user: string, qty: number): { ok: boolean; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  if (!player) return { ok: false, reason: "No player" };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, reason: "Enter a valid amount" };
  if ((player.aether || 0) < qty) return { ok: false, reason: "Not enough $AETHER in balance" };

  useGameStore.setState((s) => ({
    players: {
      ...s.players,
      [user]: {
        ...player,
        aether: (player.aether || 0) - qty,
        staked: (player.staked || 0) + qty,
        version: (player.version || 0) + 1,
      },
    },
  }));
  return { ok: true };
}
