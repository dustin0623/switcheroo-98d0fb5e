// src/shared/mining.ts
// Shared computation module — re-exports the frontend formula so server and client stay in sync.

export {
  effectiveHashRate,
  vaultCapacity,
  decayMultiplier,
  miningPerSecond,
  vaultFillPercent,
  msUntilNextDecayStep,
  isVaultFull,
  applyMining,
  secondsUntilFull,
  type MiningTickResult,
} from "@/features/game/mining";

export {
  CHEST_LADDERS,
  RARITY_INDEX,
  RARITY_STAT_COUNT,
  CHESTS,
} from "@/features/constants/game";

export type { ChestKey, Rarity, SlotKey, StatKey } from "@/features/types/game";
