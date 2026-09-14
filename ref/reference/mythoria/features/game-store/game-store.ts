'use client';

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {

  ClaimLog,
  ConsumableEntry,
  ForgeLog,
  InventoryResponse,
  LeaderboardEntry,
  MarketLogsResponse,
  MarketplaceListingItem,
  NftLog,
  Player,
  Quest,
  QuestBoard,
  RelicEntry,
  SalvageLog,
  UserMarketLogEntry,
} from "@/features/types";
import { CITIZENS } from "@/features/types";

const BASE      = "/api/mock"; // unmigrated mock routes
const REAL_BASE = "/api";     // real DB-backed routes (Phase 2+)

type ByUser<T> = Record<string, T>;

interface GameState {
  activeUser: string;
  citizens: string[];
  isLoggedIn: boolean;

  /** Called after a successful /api/auth/login — stores token and sets user. */
  login: (token: string, username: string) => void;
  /** Clears local auth state and calls the logout API to clear the cookie. */
  logout: () => Promise<void>;

  players: ByUser<Player>;
  inventory: ByUser<InventoryResponse>;
  quests: ByUser<Quest[]>;
  forgeLogs: ByUser<ForgeLog[]>;
  salvageLogs: ByUser<SalvageLog[]>;
  nftLogs: ByUser<NftLog[]>;
  claimLogs: ByUser<ClaimLog[]>;
  userMarketLogs: ByUser<UserMarketLogEntry[]>;

  questBoard: QuestBoard | null;
  leaderboard: LeaderboardEntry[];
  marketItems: MarketplaceListingItem[];
  marketRelics: RelicEntry[];
  marketConsumables: ConsumableEntry[];
  marketLogs: MarketLogsResponse | null;

  loading: Record<string, boolean>;

  setActiveUser: (u: string) => void;
  fetchPlayer: (u: string) => Promise<Player | null>;
  fetchInventory: (u: string) => Promise<InventoryResponse | null>;
  fetchQuests: (u: string) => Promise<Quest[]>;
  fetchForgeLogs: (u: string) => Promise<ForgeLog[]>;
  fetchSalvageLogs: (u: string) => Promise<SalvageLog[]>;
  fetchNftLogs: (u: string) => Promise<NftLog[]>;
  fetchClaimLogs: (u: string) => Promise<ClaimLog[]>;
  fetchQuestBoard: () => Promise<QuestBoard | null>;
  fetchLeaderboard: () => Promise<LeaderboardEntry[]>;
  fetchMarketItems: () => Promise<MarketplaceListingItem[]>;
  fetchMarketRelics: () => Promise<RelicEntry[]>;
  fetchMarketConsumables: () => Promise<ConsumableEntry[]>;
  fetchMarketLogs: () => Promise<MarketLogsResponse | null>;
  fetchUserMarketLogs: (u: string) => Promise<UserMarketLogEntry[]>;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeUser: CITIZENS[0]!,
      citizens: CITIZENS,
      isLoggedIn: false,

      login: (token: string, username: string) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("mythoria_token", token);
        }
        set({ activeUser: username, isLoggedIn: true });
      },

      logout: async () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("mythoria_token");
        }
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch { /* best-effort */ }
        set({ activeUser: CITIZENS[0]!, isLoggedIn: false, players: {} });
      },

      players: {},
      inventory: {},
      quests: {},
      forgeLogs: {},
      salvageLogs: {},
      nftLogs: {},
      claimLogs: {},
      userMarketLogs: {},

      questBoard: null,
      leaderboard: [],
      marketItems: [],
      marketRelics: [],
      marketConsumables: [],
      marketLogs: null,

      loading: {},

      setActiveUser: (u) => set({ activeUser: u }),

      fetchPlayer: async (u) => {
        if (get().players[u]) return get().players[u]!;
        // Use authenticated endpoint for the active user, public endpoint for others.
        const token = typeof window !== "undefined"
          ? localStorage.getItem("mythoria_token")
          : null;
        const isActiveUser = u === get().activeUser;
        let p: Player | null = null;
        if (isActiveUser && token) {
          const res = await fetch(`${REAL_BASE}/player/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json() as { player: Player };
            p = data.player;
          }
        } else {
          const res = await fetch(`${REAL_BASE}/player/${u}`);
          if (res.ok) {
            const data = await res.json() as { player: Player };
            p = data.player;
          }
        }
        if (p) set((s) => ({ players: { ...s.players, [u]: p! } }));
        return p;
      },
      fetchInventory: async (u) => {
        if (get().inventory[u]) return get().inventory[u]!;
        const inv = await getJson<InventoryResponse>(`${BASE}/items/${u}`);
        if (inv) set((s) => ({ inventory: { ...s.inventory, [u]: inv } }));
        return inv;
      },
      fetchQuests: async (u) => {
        if (get().quests[u]) return get().quests[u]!;
        const q = (await getJson<Quest[]>(`${BASE}/quests/${u}`)) ?? [];
        set((s) => ({ quests: { ...s.quests, [u]: q } }));
        return q;
      },
      fetchForgeLogs: async (u) => {
        if (get().forgeLogs[u]) return get().forgeLogs[u]!;
        const r = (await getJson<ForgeLog[]>(`${BASE}/forge_logs/${u}`)) ?? [];
        set((s) => ({ forgeLogs: { ...s.forgeLogs, [u]: r } }));
        return r;
      },
      fetchSalvageLogs: async (u) => {
        if (get().salvageLogs[u]) return get().salvageLogs[u]!;
        const r = (await getJson<SalvageLog[]>(`${BASE}/salvage_logs/${u}`)) ?? [];
        set((s) => ({ salvageLogs: { ...s.salvageLogs, [u]: r } }));
        return r;
      },
      fetchNftLogs: async (u) => {
        if (get().nftLogs[u]) return get().nftLogs[u]!;
        const r = (await getJson<NftLog[]>(`${BASE}/nft_logs/${u}`)) ?? [];
        set((s) => ({ nftLogs: { ...s.nftLogs, [u]: r } }));
        return r;
      },
      fetchClaimLogs: async (u) => {
        if (get().claimLogs[u]) return get().claimLogs[u]!;
        const r = (await getJson<ClaimLog[]>(`${BASE}/claim_logs/${u}`)) ?? [];
        set((s) => ({ claimLogs: { ...s.claimLogs, [u]: r } }));
        return r;
      },

      fetchQuestBoard: async () => {
        if (get().questBoard) return get().questBoard!;
        const q = await getJson<QuestBoard>(`${BASE}/quest_board`);
        if (q) set({ questBoard: q });
        return q;
      },
      fetchLeaderboard: async () => {
        if (get().leaderboard.length) return get().leaderboard;
        const data = await getJson<{ players: LeaderboardEntry[] }>(
          `${REAL_BASE}/leaderboard?limit=200&offset=0`
        );
        const r = data?.players ?? [];
        set({ leaderboard: r });
        return r;
      },
      fetchMarketItems: async () => {
        if (get().marketItems.length) return get().marketItems;
        const r = (await getJson<MarketplaceListingItem[]>(`${BASE}/marketplace/listings/items`)) ?? [];
        set({ marketItems: r });
        return r;
      },
      fetchMarketRelics: async () => {
        if (get().marketRelics.length) return get().marketRelics;
        const r = (await getJson<RelicEntry[]>(`${BASE}/marketplace/listings/relics`)) ?? [];
        set({ marketRelics: r });
        return r;
      },
      fetchMarketConsumables: async () => {
        if (get().marketConsumables.length) return get().marketConsumables;
        const r = (await getJson<ConsumableEntry[]>(`${BASE}/marketplace/listings/consumables`)) ?? [];
        set({ marketConsumables: r });
        return r;
      },
      fetchMarketLogs: async () => {
        if (get().marketLogs) return get().marketLogs;
        const r = await getJson<MarketLogsResponse>(`${BASE}/marketplace_logs?action=purchase&limit=200&offset=0`);
        if (r) set({ marketLogs: r });
        return r;
      },
      fetchUserMarketLogs: async (u) => {
        if (get().userMarketLogs[u]) return get().userMarketLogs[u]!;
        const r = (await getJson<UserMarketLogEntry[]>(`${BASE}/marketplace_logs/${u}`)) ?? [];
        set((s) => ({ userMarketLogs: { ...s.userMarketLogs, [u]: r } }));
        return r;
      },
    }),
    { name: "mythoria-game-store" }
  )
);


// Convenience hooks
export function usePlayer(user: string) {
  return useGameStore((s) => s.players[user] ?? null);
}
export function useInventory(user: string) {
  return useGameStore((s) => s.inventory[user] ?? null);
}
