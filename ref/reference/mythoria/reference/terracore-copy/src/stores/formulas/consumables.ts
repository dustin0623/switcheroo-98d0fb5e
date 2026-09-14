import type { Player, PlayerConsumables } from "@/mock/types";

export type ConsumableType =
  | "protection"
  | "focus"
  | "attack"
  | "claim"
  | "crit"
  | "damage"
  | "dodge"
  | "rage"
  | "impenetrable"
  | "overload"
  | "rogue"
  | "battle"
  | "fury";

const DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isConsumableActive(player: Player, type: ConsumableType, nowMs: number): boolean {
  const times = player.consumables?.[`${type}_times` as keyof PlayerConsumables] as number[] | undefined;
  if (!times || times.length === 0) return false;
  return nowMs - times[0] < DURATION_MS;
}

export function consumableCount(player: Player, type: ConsumableType): number {
  return (player.consumables?.[type as keyof PlayerConsumables] as number) || 0;
}
