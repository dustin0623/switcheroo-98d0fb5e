import type {
  ClaimResult,
  ChestResult,
  ItemDto,
  ListingDto,
  LogDto,
  PendingTxDto,
  SettledTxDto,
  PlayerDto,
  RaidResult,
  TickResult,
  UpgradeResult,
} from "./types";

const API_URL = import.meta.env["VITE_SERVER_API_URL"] ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public override message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}


let token: string | null = null;
let demoMode = false;

/**
 * Demo mode plays entirely on local (zustand/localStorage) state: every request
 * short-circuits so the stores fall back to their offline code paths.
 */
export function setDemoMode(value: boolean) {
  demoMode = value;
  if (typeof localStorage !== "undefined") {
    if (value) localStorage.setItem("cryptocore.demo", "1");
    else localStorage.removeItem("cryptocore.demo");
  }
}

export function isDemoMode(): boolean {
  if (!demoMode && typeof localStorage !== "undefined") {
    demoMode = localStorage.getItem("cryptocore.demo") === "1";
  }
  return demoMode;
}

export function setAuthToken(newToken: string | null) {
  token = newToken;
  if (newToken) {
    localStorage.setItem("cryptocore.token", newToken);
  } else {
    localStorage.removeItem("cryptocore.token");
  }
}

export function loadAuthToken(): string | null {
  if (!token) {
    token = localStorage.getItem("cryptocore.token");
  }
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isDemoMode()) throw new ApiError("Demo mode", 0);
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const currentToken = loadAuthToken();
  if (currentToken) {
    headers.set("Authorization", `Bearer ${currentToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message || response.statusText, response.status);
  }

  return (await response.json()) as T;
}

export async function healthCheck(): Promise<{ ok: boolean }> {
  try {
    if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
      const result = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      return { ok: result.ok };
    }
    const result = await fetch(`${API_URL}/api/health`);
    return { ok: result.ok };
  } catch {
    return { ok: false };
  }
}

export async function generateChallenge(wallet: string): Promise<{ ok: boolean; nonce?: string; error?: string }> {
  try {
    return await request<{ ok: boolean; nonce: string }>("/api/auth/challenge", {
      method: "POST",
      body: JSON.stringify({ wallet }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function verifySignature(wallet: string, signature: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    return await request<{ ok: boolean; token: string }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ wallet, signature }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function getMe(): Promise<{ ok: boolean; player?: PlayerDto; error?: string }> {
  try {
    return await request<{ ok: boolean; player: PlayerDto }>("/api/player/me", { method: "GET" });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function updateProfile(username: string): Promise<{ ok: boolean; player?: PlayerDto; error?: string }> {
  try {
    return await request<{ ok: boolean; player: PlayerDto }>("/api/player/me", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function tick(): Promise<TickResult> {
  try {
    return await request<TickResult>("/api/game/tick", { method: "POST" });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function claim(): Promise<ClaimResult> {
  try {
    return await request<ClaimResult>("/api/game/claim", { method: "POST" });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function openChest(chest: string, seed: string): Promise<ChestResult> {
  try {
    return await request<ChestResult>("/api/game/chest", {
      method: "POST",
      body: JSON.stringify({ chest, seed }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function upgradeStat(stat: string): Promise<UpgradeResult> {
  try {
    return await request<UpgradeResult>("/api/game/upgrade/stat", {
      method: "POST",
      body: JSON.stringify({ stat }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function upgradeItem(itemNumber: number): Promise<UpgradeResult> {
  try {
    return await request<UpgradeResult>("/api/game/upgrade/item", {
      method: "POST",
      body: JSON.stringify({ itemNumber }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function burn(amount: number): Promise<UpgradeResult> {
  try {
    return await request<UpgradeResult>("/api/game/burn", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function raid(target: string, seed: string): Promise<RaidResult> {
  try {
    return await request<RaidResult>("/api/game/raid", {
      method: "POST",
      body: JSON.stringify({ target, seed }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function getInventory(): Promise<{ ok: boolean; items?: ItemDto[]; error?: string }> {
  try {
    return await request<{ ok: boolean; items: ItemDto[] }>("/api/items", { method: "GET" });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function equipItem(itemNumber: number): Promise<{ ok: boolean; item?: ItemDto; error?: string }> {
  try {
    return await request<{ ok: boolean; item: ItemDto }>("/api/items/equip", {
      method: "POST",
      body: JSON.stringify({ itemNumber }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function unequipItem(itemNumber: number): Promise<{ ok: boolean; item?: ItemDto; error?: string }> {
  try {
    return await request<{ ok: boolean; item: ItemDto }>("/api/items/unequip", {
      method: "POST",
      body: JSON.stringify({ itemNumber }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function salvageItem(itemNumber: number): Promise<{ ok: boolean; item?: ItemDto; error?: string }> {
  try {
    return await request<{ ok: boolean; item: ItemDto }>("/api/items/salvage", {
      method: "POST",
      body: JSON.stringify({ itemNumber }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

/**
 * Public market listings. Deliberately NOT gated behind demo mode: demo players
 * browse the same real listings, they just cannot buy or sell.
 */
export async function getMarketListings(
  sort: "price_asc" | "price_desc" | "newest" = "newest",
  limit = 50,
  cursor?: number,
): Promise<{ ok: boolean; listings?: ListingDto[]; nextCursor?: number | null; error?: string }> {
  try {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    if (cursor) params.set("cursor", String(cursor));
    const response = await fetch(`${API_URL}/api/market?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      ...(typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? { signal: AbortSignal.timeout(8000) }
        : {}),
    });
    if (!response.ok) {
      return { ok: false, error: `Server error (${response.status})` };
    }
    return (await response.json()) as {
      ok: boolean;
      listings: ListingDto[];
      nextCursor: number | null;
    };
  } catch {
    return { ok: false, error: "Server offline" };
  }
}

export async function listItem(itemNumber: number, price: number): Promise<{ ok: boolean; error?: string }> {
  try {
    return await request<{ ok: boolean }>("/api/market/list", {
      method: "POST",
      body: JSON.stringify({ itemNumber, price }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function buyItem(
  itemNumber: number,
  paymentTxId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    return await request<{ ok: boolean }>("/api/market/buy", {
      method: "POST",
      body: JSON.stringify({ itemNumber, paymentTxId }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

export async function cancelListing(itemNumber: number): Promise<{ ok: boolean; error?: string }> {
  try {
    return await request<{ ok: boolean }>("/api/market/cancel", {
      method: "POST",
      body: JSON.stringify({ itemNumber }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

type LogsResponse = { ok: boolean; logs?: LogDto[]; error?: string };

async function fetchLogs(path: string): Promise<LogsResponse> {
  try {
    return await request<{ ok: boolean; logs: LogDto[] }>(path, { method: "GET" });
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}

/** The signed-in player's gameplay activity feed (claims, chests, raids, upgrades). */
export function getActivityLogs(limit = 50): Promise<LogsResponse> {
  return fetchLogs(`/api/logs?limit=${limit}`);
}

/** The signed-in player's marketplace trades (bought / sold / listed / cancelled). */
export function getMyMarketLogs(limit = 50): Promise<LogsResponse> {
  return fetchLogs(`/api/logs/market?limit=${limit}`);
}

/** Public history of completed marketplace sales. */
export function getMarketSales(limit = 50): Promise<LogsResponse> {
  return fetchLogs(`/api/logs/market/sales?limit=${limit}`);
}

export async function getTransactions(limit = 25): Promise<{
  ok: boolean;
  pending?: PendingTxDto[];
  history?: SettledTxDto[];
  error?: string;
}> {
  try {
    return await request<{ ok: boolean; pending: PendingTxDto[]; history: SettledTxDto[] }>(
      `/api/transactions?limit=${limit}`,
      { method: "GET" },
    );
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : "Network error" };
  }
}
