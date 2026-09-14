import type { Player } from "@/features/types";
import seedrandom from "seedrandom";


const MAX_ATTACKS = 8;
const ATTACK_REGEN_HOURS = 4;
const DECAY_DAYS = 5;

export function computeCurrentAttacks(user: Player, nowMs: number) {
  const stored = user.attacks || 0;
  const effectiveMax = MAX_ATTACKS;

  const hoursSince = Math.floor((nowMs - (user.lastregen || 0)) / 3600000);
  const regenAmount = Math.floor(hoursSince / ATTACK_REGEN_HOURS);
  const current = Math.min(stored + regenAmount, effectiveMax);
  const newLastregen =
    regenAmount > 0
      ? (user.lastregen || 0) + regenAmount * ATTACK_REGEN_HOURS * 3600000
      : user.lastregen || 0;
  return { current, newLastregen, effectiveMax };
}


export function checkDodge(target: Player, seed: string): boolean {
  const rng = seedrandom(seed + "-dodge");
  const roll = Math.floor(rng() * 100) + 1;
  return roll <= (target.stats?.speed || 0);
}

export function rollAttack(player: Player, seed: string): number {
  const rng = seedrandom(seed);
  const roll = rng();
  const crit = player.stats?.crit || 0;
  let steal = roll * (100 - crit + 1) + crit;
  if (steal > 100) steal = 100;
  return steal;
}

export function isProtected(player: Player, nowMs: number): boolean {
  return (
    player.consumables?.protection > 0 &&
    nowMs - (player.consumables.protection_times?.[0] || 0) < 86400000
  );
}

export function canAttack(
  attacker: Player,
  target: Player,
  nowMs: number
): { ok: boolean; reason?: string } {
  if (attacker.username === target.username) return { ok: false, reason: "Cannot attack yourself" };
  const { current } = computeCurrentAttacks(attacker, nowMs);
  if (current <= 0) return { ok: false, reason: "No attack charges" };
  if (nowMs - target.registrationTime < 86400000)
    return { ok: false, reason: "Target is under new-user protection" };
  if (isProtected(target, nowMs)) return { ok: false, reason: "Target is protected" };
  if (nowMs - target.lastBattle < 60000)
    return { ok: false, reason: "Target was attacked recently" };
  const focusActive = (attacker.consumables?.focus || 0) > 0;
  if (!focusActive && (attacker.stats?.damage || 0) <= (target.stats?.defense || 0)) {
    return { ok: false, reason: "Attack too low to pierce defense" };
  }
  return { ok: true };
}
