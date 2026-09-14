import { now } from "@/lib/clock";
import { useGameStore } from "@/stores/game-store";
import { damageCost, defenseCost, engineeringCost } from "@/stores/formulas/upgrades";
import { applyXp } from "@/stores/formulas/xp";
import type { Player } from "@/mock/types";

type Kind = "engineering" | "damage" | "defense";

function applyUpgrade(player: Player, kind: Kind, cost: number, nowMs: number): Player {
  const xp = applyXp({ level: player.level || 1, experience: player.experience || 0 }, cost);
  const base: Player = {
    ...player,
    balance: (player.balance || 0) - cost,
    hiveEngineScrap: Math.max(0, (player.hiveEngineScrap || 0) - cost),
    last_upgrade_time: nowMs,
    level: xp.level,
    experience: xp.experience,
    version: (player.version || 0) + 1,
  };

  if (kind === "engineering") {
    const newLevel = (player.stats?.engineering ?? 0) + 1;
    return {
      ...base,
      engineering: (player.engineering || 0) + 1,
      stats: { ...player.stats, engineering: newLevel },
    };
  }
  if (kind === "damage") {
    return { ...base, damage: (player.damage || 0) + 10 };
  }
  return { ...base, defense: (player.defense || 0) + 10 };
}

export function upgrade(user: string, kind: Kind): { ok: boolean; cost: number; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  if (!player) return { ok: false, cost: 0, reason: "No player" };
  const cost =
    kind === "engineering"
      ? engineeringCost(player.stats?.engineering ?? player.engineering ?? 0)
      : kind === "damage"
      ? damageCost(player.damage ?? 0)
      : defenseCost(player.defense ?? 0);
  if ((player.hiveEngineScrap || 0) < cost) {
    return { ok: false, cost, reason: "Not enough $MGOLD (unclaimed balance)" };
  }
  const nowMs = now();
  const updated = applyUpgrade(player, kind, cost, nowMs);
  useGameStore.setState((s) => ({ players: { ...s.players, [user]: updated } }));
  return { ok: true, cost };
}

export function contributeFavor(user: string, qty: number): { ok: boolean; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  if (!player) return { ok: false, reason: "No player" };
  if ((player.hiveEngineScrap || 0) < qty) return { ok: false, reason: "Not enough $MGOLD" };
  const nowMs = now();
  const xp = applyXp({ level: player.level || 1, experience: player.experience || 0 }, qty);
  useGameStore.setState((s) => ({
    players: {
      ...s.players,
      [user]: {
        ...player,
        favor: (player.favor || 0) + qty,
        hiveEngineScrap: (player.hiveEngineScrap || 0) - qty,
        last_upgrade_time: nowMs,
        level: xp.level,
        experience: xp.experience,
      },
    },
  }));
  return { ok: true };
}
