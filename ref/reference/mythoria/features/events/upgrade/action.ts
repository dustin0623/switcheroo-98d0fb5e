/**
 * features/events/upgrade/action.ts
 *
 * Pure events — upgrade stats or contribute favor with $AETHER.
 * Operates on plain state snapshots; no DB calls.
 */

import { now } from "@/lib/clock";
import { useGameStore } from "@/features/game-store/game-store";
import { damageCost, defenseCost, arcaneCost } from "@/features/game-store/formulas/upgrades";
import { applyXp } from "@/features/game-store/formulas/xp";
import type { Player } from "@/features/types";

type Kind = "arcane" | "damage" | "guardian";

function applyUpgrade(player: Player, kind: Kind, cost: number, nowMs: number): Player {
  const xp = applyXp({ level: player.level || 1, experience: player.experience || 0 }, cost);
  const base: Player = {
    ...player,
    balance: (player.balance || 0) - cost,
    aether: Math.max(0, (player.aether || 0) - cost),
    last_upgrade_time: nowMs,
    level: xp.level,
    experience: xp.experience,
    version: (player.version || 0) + 1,
  };

  if (kind === "arcane") {
    const currentArcane = player.arcane ?? 0;
    const newLevel = currentArcane + 1;
    return { ...base, arcane: newLevel, stats: { ...player.stats, arcane: newLevel } };
  }
  if (kind === "damage") return { ...base, damage: (player.damage || 0) + 10 };
  return { ...base, defense: (player.defense || 0) + 10 };
}

export function upgrade(user: string, kind: Kind): { ok: boolean; cost: number; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  if (!player) return { ok: false, cost: 0, reason: "No player" };

  const cost =
    kind === "arcane" ? arcaneCost(player.arcane ?? player.stats?.arcane ?? 0)
    : kind === "damage" ? damageCost(player.damage ?? 0)
    :                     defenseCost(player.defense ?? 0);

  if ((player.aether || 0) < cost) {
    return { ok: false, cost, reason: "Not enough $AETHER" };
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
  if ((player.aether || 0) < qty) return { ok: false, reason: "Not enough $AETHER" };

  const nowMs = now();
  const xp = applyXp({ level: player.level || 1, experience: player.experience || 0 }, qty);
  useGameStore.setState((s) => ({
    players: {
      ...s.players,
      [user]: {
        ...player,
        favor:  (player.favor  || 0) + qty,
        aether: (player.aether || 0) - qty,
        last_upgrade_time: nowMs,
        level: xp.level,
        experience: xp.experience,
      },
    },
  }));
  return { ok: true };
}
