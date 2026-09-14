/**
 * lib/chain/hive/rpc.ts
 *
 * Hive consensus-layer client (dhive) + Hive-Engine layer-2 accessors +
 * treasury account/key accessors.
 *
 * SERVER-ONLY — reads the treasury active key from config. Never import this
 * from a 'use client' file.
 */

import { Client, PrivateKey } from "@hiveio/dhive";
import { config } from "@/lib/config/config";

const hive = config.blockchain.hive;

// ---------------------------------------------------------------------------
// Dynamic Hive node discovery via https://beacon.peakd.com/api/nodes
// ---------------------------------------------------------------------------

const BEACON_URL = "https://beacon.peakd.com/api/nodes";
const BEACON_CACHE_TTL_MS = 60_000;

interface BeaconNode {
  endpoint: string;
  score:    number;
  features: string[];
}

let _cachedNodes: string[] = [];
let _lastFetchAt: number   = 0;

export async function getHiveNodes(): Promise<string[]> {
  const now = Date.now();
  if (_cachedNodes.length > 0 && now - _lastFetchAt < BEACON_CACHE_TTL_MS) {
    return _cachedNodes;
  }
  try {
    const res = await fetch(BEACON_URL, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`beacon status ${res.status}`);
    const nodes = (await res.json()) as BeaconNode[];
    const filtered = nodes
      .filter((n) => n.score >= 80 && Array.isArray(n.features) && n.features.includes("broadcast"))
      .map((n) => n.endpoint);
    if (filtered.length > 0) {
      _cachedNodes = filtered;
      _lastFetchAt = now;
      return _cachedNodes;
    }
  } catch {
    // fall through to config fallback
  }
  return hive.rpcNodes;
}

export async function makeHiveClient(): Promise<Client> {
  const nodes = await getHiveNodes();
  return new Client(nodes, {
    timeout:           15_000,
    failoverThreshold: nodes.length > 1 ? nodes.length - 1 : 0,
    consoleOnFailover: false,
  });
}

let _client: Client | null = null;

export function getHiveClient(): Client {
  if (!_client) {
    _client = new Client(hive.rpcNodes, {
      timeout:           15_000,
      failoverThreshold: hive.rpcNodes.length > 1 ? hive.rpcNodes.length - 1 : 0,
      consoleOnFailover: false,
    });
  }
  return _client;
}

export function getTreasuryAccount(): string {
  const account = config.blockchain.treasuryAddress?.trim();
  if (!account) throw new Error("TREASURY_ADDRESS (Hive account) is not set");
  return account.toLowerCase();
}

let _activeKey: PrivateKey | null = null;

export function getTreasuryActiveKey(): PrivateKey {
  if (!_activeKey) {
    const raw = config.blockchain.treasuryKey?.trim();
    if (!raw) throw new Error("TREASURY_KEY (Hive active key) is not set");
    _activeKey = PrivateKey.fromString(raw);
  }
  return _activeKey;
}

export const ENGINE_RPC_URL = hive.engineRpcUrl;
export const ENGINE_ID      = hive.engineId;

export function getTokenSymbol(): string {
  if (!hive.tokenSymbol) throw new Error("HIVE_TOKEN_SYMBOL (or CONTRACT_ADDRESS) is not set");
  return hive.tokenSymbol.toUpperCase();
}

export async function getTokenPrecision(symbol: string): Promise<number> {
  try {
    const res = await fetch(ENGINE_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "findOne",
        params: { contract: "tokens", table: "tokens", query: { symbol: symbol.toUpperCase() } },
      }),
    });
    if (!res.ok) throw new Error(`RPC error ${res.status}`);
    const json = (await res.json()) as { result?: { precision?: number } | null };
    if (typeof json.result?.precision === "number") return json.result.precision;
  } catch {
    // fall through
  }
  return hive.precision ?? 3;
}

export async function getEngineBalance(account: string, symbol: string): Promise<number> {
  const res = await fetch(ENGINE_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "findOne",
      params: {
        contract: "tokens", table: "balances",
        query: { account: account.toLowerCase(), symbol: symbol.toUpperCase() },
      },
    }),
  });
  if (!res.ok) throw new Error(`Hive-Engine RPC error: ${res.status}`);
  const json = (await res.json()) as { result?: { balance?: string } | null };
  return json.result?.balance ? Number(json.result.balance) : 0;
}
