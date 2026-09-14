import { create } from "zustand";

import { applyRaidToRival, generateRivals } from "@/features/game/raid";
import type { RaidOutcome, Rival } from "@/features/types/game";

interface RaidState {
  rivals: Rival[];
  /** Player Hack Power the current pool was generated for. */
  scaledFor: number;
  lastOutcome: (RaidOutcome & { rivalId: string; username: string }) | null;
  refreshRivals: (playerHackPower: number) => void;
  applyOutcome: (rivalId: string, outcome: RaidOutcome, username: string) => void;
  clearOutcome: () => void;
  reset: () => void;
}

/** Not persisted on purpose: a fresh rival pool is generated every reload. */
export const useRaidStore = create<RaidState>()((set) => ({
  rivals: generateRivals(1),
  scaledFor: 1,
  lastOutcome: null,
  refreshRivals: (playerHackPower) =>
    set({ rivals: generateRivals(playerHackPower), scaledFor: playerHackPower, lastOutcome: null }),
  applyOutcome: (rivalId, outcome, username) =>
    set((state) => ({
      rivals: state.rivals.map((rival) =>
        rival.id === rivalId ? applyRaidToRival(rival, outcome) : rival,
      ),
      lastOutcome: { ...outcome, rivalId, username },
    })),
  clearOutcome: () => set({ lastOutcome: null }),
  reset: () => set({ rivals: generateRivals(1), scaledFor: 1, lastOutcome: null }),
}));
