/**
 * features/events/battle/action.ts
 *
 * Pure event — player-vs-player attack.
 * Operates on plain state snapshots; no DB calls.
 */

import { now } from "@/lib/clock";
import type { Player } from "@/features/types";
import { useGameStore } from "@/features/game-store/game-store";
import { canAttack, checkDodge, computeCurrentAttacks, rollAttack } from "@/features/game-store/formulas/combat";
import { computeCurrentScrap } from "@/features/game-store/formulas/mining";

export function attackPlayer(
  attackerName: string,
  targetName: string
): { ok: boolean; scrap?: number; reason?: string; dodged?: boolean } {
  const state = useGameStore.getState();
  const attacker = state.players[attackerName];
  const target = state.players[targetName];
  if (!attacker || !target) return { ok: false, reason: "Missing player" };

  const nowMs = now();
  const prereq = canAttack(attacker, target, nowMs);
  if (!prereq.ok) return { ok: false, reason: prereq.reason };

  const seed = `${nowMs}@${attackerName}->${targetName}`;
  const focusActive = (attacker.consumables?.focus || 0) > 0;

  if (!focusActive && checkDodge(target, seed)) {
    const attacks = computeCurrentAttacks(attacker, nowMs);
    const updatedAttacker: Player = {
      ...attacker,
      attacks: attacks.current - 1,
      lastregen: attacks.newLastregen,
      lastBattle: nowMs,
    };
    useGameStore.setState((s) => ({
      players: { ...s.players, [attackerName]: updatedAttacker },
    }));
    return { ok: true, scrap: 0, dodged: true };
  }

  const targetScrap = computeCurrentScrap(target, nowMs);
  const attackerScrap = computeCurrentScrap(attacker, nowMs);
  const stashSize = (attacker.staked || 0) + 1;
  let scrapToSteal = (rollAttack(attacker, seed) / 100) * targetScrap;
  if (scrapToSteal > targetScrap) scrapToSteal = targetScrap;
  if (attackerScrap + scrapToSteal > stashSize) {
    scrapToSteal = Math.max(0, stashSize - attackerScrap);
  }

  const attacks = computeCurrentAttacks(attacker, nowMs);
  const updatedAttacker: Player = {
    ...attacker,
    unclaimedAether: attackerScrap + scrapToSteal,
    attacks: attacks.current - 1,
    lastregen: attacks.newLastregen,
    lastBattle: nowMs,
    cooldown: nowMs,
  };
  const updatedTarget: Player = {
    ...target,
    unclaimedAether: Math.max(0, targetScrap - scrapToSteal),
    lastBattle: nowMs,
    cooldown: nowMs,
  };

  useGameStore.setState((s) => ({
    players: {
      ...s.players,
      [attackerName]: updatedAttacker,
      [targetName]: updatedTarget,
    },
  }));

  return { ok: true, scrap: scrapToSteal };
}
