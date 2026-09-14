import { useGameStore } from "@/stores/game-store";

export function stakeScrap(user: string, qty: number): { ok: boolean; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  if (!player) return { ok: false, reason: "No player" };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, reason: "Enter a valid amount" };
  if ((player.hiveEngineScrap || 0) < qty) return { ok: false, reason: "Not enough $MGOLD in Hive Engine balance" };
  useGameStore.setState((s) => ({
    players: {
      ...s.players,
      [user]: {
        ...player,
        hiveEngineScrap: (player.hiveEngineScrap || 0) - qty,
        hiveEngineStake: (player.hiveEngineStake || 0) + qty,
        version: (player.version || 0) + 1,
      },
    },
  }));
  return { ok: true };
}
