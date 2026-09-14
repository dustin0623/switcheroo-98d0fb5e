import { now } from "@/lib/clock";
import { useGameStore } from "@/stores/game-store";
import { computeCurrentClaims, computeCurrentScrap } from "@/stores/formulas/mining";

export function claim(user: string): { ok: boolean; qty: number; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  if (!player) return { ok: false, qty: 0, reason: "No player" };
  const nowMs = now();
  const { current: claimsAvail, newLastclaim } = computeCurrentClaims(player, nowMs);
  if (claimsAvail <= 0) return { ok: false, qty: 0, reason: "No claim charges" };
  const qty = computeCurrentScrap(player, nowMs);
  if (qty <= 0) return { ok: false, qty: 0, reason: "Nothing to claim" };

  const updated = {
    ...player,
    scrap: 0,
    cooldown: nowMs,
    lastPayout: nowMs,
    lastclaim: newLastclaim,
    claims: claimsAvail - 1,
    balance: (player.balance || 0) + qty,
    hiveEngineScrap: (player.hiveEngineScrap || 0) + qty,
  };

  useGameStore.setState((s) => ({
    players: { ...s.players, [user]: updated },
    claimLogs: {
      ...s.claimLogs,
      [user]: [
        { username: user, qty: qty.toFixed(3), status: "success", time: nowMs },
        ...(s.claimLogs[user] ?? []),
      ],
    },
  }));

  return { ok: true, qty };
}
