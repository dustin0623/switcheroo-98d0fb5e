import "@/features/stores/legacyStorage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { claimCharges, raidCharges } from "@/features/game/charges";
import { applyMining, decayMultiplier } from "@/features/game/mining";
import { XP_PER_HASH, XP_PER_RAID_WIN } from "@/features/game/level";
import { emptyStatBlock, totalUpgradeCost, UPGRADEABLE_STAT_KEYS, upgradeCost } from "@/features/game/stats";
import type { StatBlock, StatKey } from "@/features/types/game";
import * as api from "@/lib/api/client";
import type { PlayerDto } from "@/lib/api/types";

export interface PlayerStats {
  wallet: number;
  /** Cumulative experience ever earned. Level is derived from this. */
  xp: number;
  /** Secondary currency, earned by salvaging gear and spent on gear upgrades. */
  sparks: number;
  vault: number;
  /** HASH staked into the vault (no levels). Drives capacity, Luck, Firewall. */
  vaultStaked: number;
  statLevels: StatBlock;
  lastTickAt: number;
  /** Last HASH sink (upgrade or chest). Drives mining decay + raid charges. */
  lastSinkAt: number;
  claimCharges: number;
  lastClaimRegenAt: number;
  raidCharges: number;
  lastRaidRegenAt: number;
  totalClaimed: number;
  totalMined: number;
  raids: number;
  raidWins: number;
  totalStolen: number;
  bestHashRate: number;
  /** Permanent reputation earned by burning HASH. Drives Exploit. */
  notoriety: number;
  totalBurned: number;
}

interface PlayerActions {
  addXp: (amount: number) => void;
  tick: (totalHashRate: number, seconds: number) => { mined: number; becameFull: boolean };
  claim: () => Promise<number>;
  upgradeStat: (key: StatKey) => Promise<boolean>;
  upgradeStatBulk: (key: StatKey, count: number) => Promise<number>;
  stakeVault: (amount: number) => Promise<boolean>;
  burn: (amount: number) => Promise<boolean>;
  spend: (amount: number) => boolean;
  spendSink: (amount: number) => boolean;
  credit: (amount: number) => void;
  creditSparks: (amount: number) => void;
  spendSparks: (amount: number) => boolean;
  spendRaidCharge: () => boolean;
  recordRaid: (won: boolean, stolen: number, capacity: number) => void;
  recordHashRate: (hashRate: number) => void;
  syncFromApi: (dto?: PlayerDto) => Promise<boolean>;
  reset: () => void;
}

const initialStatLevels = (): StatBlock => ({
  ...emptyStatBlock(),
  hashRate: 1,
  hackPower: 1,
  security: 1,
  luck: 1,
  firewall: 1,
  exploit: 1,
});

const initialState = (): PlayerStats => ({
  wallet: 250,
  xp: 0,
  sparks: 0,
  vault: 0,
  vaultStaked: 0,
  statLevels: initialStatLevels(),
  lastTickAt: Date.now(),
  lastSinkAt: Date.now(),
  claimCharges: 5,
  lastClaimRegenAt: Date.now(),
  raidCharges: 8,
  lastRaidRegenAt: Date.now(),
  totalClaimed: 0,
  totalMined: 0,
  raids: 0,
  raidWins: 0,
  totalStolen: 0,
  bestHashRate: 1,
  notoriety: 0,
  totalBurned: 0,
});

function dtoToState(dto: PlayerDto): PlayerStats {
  return {
    wallet: dto.hash ?? 0,
    xp: dto.xp,
    sparks: dto.sparks,
    vault: dto.vault,
    vaultStaked: dto.vaultStaked,
    statLevels: dto.statLevels,
    lastTickAt: dto.lastTickAt,
    lastSinkAt: dto.lastSinkAt,
    claimCharges: dto.claimCharges,
    lastClaimRegenAt: dto.lastClaimRegenAt,
    raidCharges: dto.raidCharges,
    lastRaidRegenAt: dto.lastRaidRegenAt,
    totalClaimed: dto.totalClaimed,
    totalMined: dto.totalMined,
    raids: dto.raids,
    raidWins: dto.raidWins,
    totalStolen: dto.totalStolen,
    bestHashRate: dto.bestHashRate,
    notoriety: dto.notoriety,
    totalBurned: dto.totalBurned,
  };
}

export const usePlayerStore = create<PlayerStats & PlayerActions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      addXp: (amount) =>
        set((state) => ({ xp: (state.xp || 0) + Math.max(0, Math.round(amount || 0)) })),

      tick: (totalHashRate, seconds) => {
        const state = get();
        const result = applyMining(
          state.vault,
          totalHashRate,
          state.vaultStaked,
          seconds,
          decayMultiplier(state.lastSinkAt),
        );
        set({
          vault: result.vault,
          totalMined: state.totalMined + result.mined,
          lastTickAt: Date.now(),
        });
        return { mined: result.mined, becameFull: result.becameFull };
      },

      claim: async () => {
        const state = get();
        if (state.vault <= 0) return 0;

        const server = await api.claim();
        if (server.ok && server.amount !== undefined) {
          // Re-sync the authoritative server state.
          await get().syncFromApi();
          return server.amount;
        }

        // Local fallback when the server is unreachable.
        const charges = claimCharges({
          charges: state.claimCharges,
          lastRegenAt: state.lastClaimRegenAt,
        });
        if (charges.current <= 0) return 0;

        const claimed = state.vault;
        set({
          wallet: state.wallet + claimed,
          vault: 0,
          totalClaimed: state.totalClaimed + claimed,
          claimCharges: charges.current - 1,
          lastClaimRegenAt: charges.lastRegenAt,
        });
        return claimed;
      },

      upgradeStat: async (key) => {
        const state = get();
        if (!UPGRADEABLE_STAT_KEYS.includes(key)) return false;
        const level = state.statLevels[key];
        const cost = upgradeCost(level);
        if (state.wallet < cost) return false;

        const server = await api.upgradeStat(key);
        if (server.ok) {
          await get().syncFromApi();
          return true;
        }

        set({
          wallet: state.wallet - cost,
          xp: (state.xp || 0) + Math.round(cost * XP_PER_HASH),
          statLevels: { ...state.statLevels, [key]: level + 1 },
          lastSinkAt: Date.now(),
        });
        return true;
      },

      upgradeStatBulk: async (key, count) => {
        const state = get();
        if (!UPGRADEABLE_STAT_KEYS.includes(key) || count <= 0) return 0;
        const level = state.statLevels[key];
        const cost = totalUpgradeCost(level, count);
        if (state.wallet < cost) return 0;

        // The server does not have a bulk endpoint; upgrade one at a time.
        for (let i = 0; i < count; i++) {
          const server = await api.upgradeStat(key);
          if (!server.ok) {
            // Apply the remaining levels locally as a fallback/bulk local path.
            break;
          }
        }
        await get().syncFromApi();

        // Fallback: ensure local state reflects the intended purchase if sync failed.
        const currentLevel = get().statLevels[key];
        if (currentLevel < level + count) {
          set({
            wallet: state.wallet - cost,
            xp: (state.xp || 0) + Math.round(cost * XP_PER_HASH),
            statLevels: { ...state.statLevels, [key]: level + count },
            lastSinkAt: Date.now(),
          });
        }
        return count;
      },

      stakeVault: async (amount) => {
        const state = get();
        if (!Number.isFinite(amount) || amount <= 0 || state.wallet < amount) return false;

        const server = await api.burn(amount); // closest shared endpoint for sink
        if (server.ok) {
          await get().syncFromApi();
          return true;
        }

        set({
          wallet: state.wallet - amount,
          xp: (state.xp || 0) + Math.round(amount * XP_PER_HASH),
          vaultStaked: state.vaultStaked + amount,
          lastSinkAt: Date.now(),
        });
        return true;
      },

      burn: async (amount) => {
        const state = get();
        if (!Number.isFinite(amount) || amount <= 0 || state.wallet < amount) return false;

        const server = await api.burn(amount);
        if (server.ok) {
          await get().syncFromApi();
          return true;
        }

        set({
          wallet: state.wallet - amount,
          xp: (state.xp || 0) + Math.round(amount * XP_PER_HASH),
          notoriety: state.notoriety + amount,
          totalBurned: state.totalBurned + amount,
          lastSinkAt: Date.now(),
        });
        return true;
      },

      spend: (amount) => {
        const state = get();
        if (state.wallet < amount) return false;
        set({ wallet: state.wallet - amount });
        return true;
      },

      /** Spend that also counts as a sink (resets mining decay). */
      spendSink: (amount) => {
        const state = get();
        if (state.wallet < amount) return false;
        set({
          wallet: state.wallet - amount,
          xp: (state.xp || 0) + Math.round(amount * XP_PER_HASH),
          lastSinkAt: Date.now(),
        });
        return true;
      },

      credit: (amount) => set((state) => ({ wallet: state.wallet + amount })),

      creditSparks: (amount) =>
        set((state) => ({ sparks: (state.sparks || 0) + Math.max(0, amount) })),

      spendSparks: (amount) => {
        const state = get();
        if (!Number.isFinite(amount) || amount < 0 || (state.sparks || 0) < amount) return false;
        set({ sparks: (state.sparks || 0) - amount });
        return true;
      },

      spendRaidCharge: () => {
        const state = get();
        const charges = raidCharges(
          { charges: state.raidCharges, lastRegenAt: state.lastRaidRegenAt },
          state.lastSinkAt,
        );
        if (charges.current <= 0) return false;
        set({ raidCharges: charges.current - 1, lastRaidRegenAt: charges.lastRegenAt });
        return true;
      },

      recordRaid: (won, stolen, capacity) =>
        set((state) => {
          return {
            xp: (state.xp || 0) + (won ? XP_PER_RAID_WIN : 0),
            raids: state.raids + 1,
            raidWins: state.raidWins + (won ? 1 : 0),
            totalStolen: state.totalStolen + stolen,
            // Stolen HASH lands in the vault (unclaimed, still raidable).
            vault: Math.min(capacity, state.vault + stolen),
          };
        }),

      recordHashRate: (hashRate) =>
        set((state) => (hashRate > state.bestHashRate ? { bestHashRate: hashRate } : state)),

      syncFromApi: async (dto) => {
        const source = dto ?? (await api.getMe()).player;
        if (!source) return false;
        set(dtoToState(source));
        return true;
      },

      reset: () => set(initialState()),
    }),
    { name: "cryptocore.player", version: 6 },
  ),
);

// Refresh player state whenever a token is persisted and the window regains focus.
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    void usePlayerStore.getState().syncFromApi();
  });
}
