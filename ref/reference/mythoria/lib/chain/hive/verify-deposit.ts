/**
 * lib/chain/hive/verify-deposit.ts
 *
 * Verifies a player → treasury Hive-Engine token transfer.
 * SERVER-ONLY. Never import from a 'use client' file.
 */

import { ENGINE_RPC_URL, getTreasuryAccount, getTokenSymbol, getTokenPrecision } from "./rpc";

const ENGINE_BLOCKCHAIN_NODES = [
  "https://api.hive-engine.com/rpc/blockchain",
  "https://engine.rishipanthee.com/rpc/blockchain",
  "https://herpc.dtools.dev/rpc/blockchain",
  ENGINE_RPC_URL.replace(/\/rpc\/?$/, "/rpc/blockchain").replace(/\/$/, ""),
];

interface HiveEngineTx {
  transactionId: string;
  sender:        string;
  contract:      string;
  action:        string;
  payload:       string;
  logs:          string;
}

async function getHiveEngineTransaction(trxId: string): Promise<HiveEngineTx | null> {
  const nodes = [...new Set(ENGINE_BLOCKCHAIN_NODES)];
  let lastErr = "unknown error";

  for (const nodeUrl of nodes) {
    try {
      const res = await fetch(nodeUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "getTransactionInfo",
          params: { txid: trxId },
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) { lastErr = `HTTP ${res.status} from ${nodeUrl}`; continue; }
      const json = (await res.json()) as { result?: HiveEngineTx | null };
      return json.result ?? null;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`Hive-Engine getTransactionInfo failed on all nodes: ${lastErr}`);
}

export interface DepositVerification {
  ok:      boolean;
  amount?: number;
  error?:  string;
  code?:   "NOT_CONFIRMED" | "INVALID";
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function verifyDepositFromPlayer(
  trxId:                 string,
  expectedPlayerAccount: string,
  expectedAmount:        number,
  opts: { maxTries?: number; delayMs?: number } = {},
): Promise<DepositVerification> {
  if (!trxId || typeof trxId !== "string") {
    return { ok: false, code: "INVALID", error: "Missing transaction id" };
  }

  let treasury: string, symbol: string, precision: number;
  try {
    treasury  = getTreasuryAccount();
    symbol    = getTokenSymbol();
    precision = await getTokenPrecision(symbol);
  } catch (err) {
    return { ok: false, code: "INVALID", error: err instanceof Error ? err.message : String(err) };
  }

  const tolerance = 0.5 * Math.pow(10, -precision);
  const MAX_TRIES = opts.maxTries ?? 5;
  const DELAY_MS  = opts.delayMs  ?? 3000;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    let tx: HiveEngineTx | null = null;
    try {
      tx = await getHiveEngineTransaction(trxId);
    } catch (err) {
      return { ok: false, code: "NOT_CONFIRMED", error: err instanceof Error ? err.message : String(err) };
    }

    if (!tx) {
      if (attempt < MAX_TRIES - 1) { await delay(DELAY_MS); continue; }
      return { ok: false, code: "NOT_CONFIRMED", error: "Transaction not yet visible on Hive-Engine" };
    }

    if (tx.contract !== "tokens" || tx.action !== "transfer") {
      return { ok: false, code: "INVALID", error: `Expected tokens.transfer, got ${tx.contract}.${tx.action}` };
    }

    let payload: { symbol?: string; to?: string; quantity?: string; memo?: string };
    try { payload = JSON.parse(tx.payload); }
    catch { return { ok: false, code: "INVALID", error: "Could not parse transaction payload" }; }

    let logs: { errors?: string[] } = {};
    try { logs = JSON.parse(tx.logs); } catch { /* non-fatal */ }
    if (Array.isArray(logs.errors) && logs.errors.length > 0) {
      return { ok: false, code: "INVALID", error: `Contract execution failed: ${logs.errors.join(", ")}` };
    }

    if (tx.sender.toLowerCase() !== expectedPlayerAccount.toLowerCase()) {
      return { ok: false, code: "INVALID", error: `Sender mismatch: got ${tx.sender}, expected ${expectedPlayerAccount}` };
    }

    if ((payload.to ?? "").toLowerCase() !== treasury.toLowerCase()) {
      return { ok: false, code: "INVALID", error: `Recipient mismatch: got ${payload.to}, expected ${treasury}` };
    }

    if ((payload.symbol ?? "").toUpperCase() !== symbol.toUpperCase()) {
      return { ok: false, code: "INVALID", error: `Symbol mismatch: got ${payload.symbol}, expected ${symbol}` };
    }

    const receivedQty = parseFloat(payload.quantity ?? "0");
    if (Math.abs(receivedQty - expectedAmount) > tolerance) {
      return { ok: false, code: "INVALID", error: `Quantity mismatch: received ${payload.quantity}, expected ${expectedAmount} ${symbol}` };
    }

    return { ok: true, amount: receivedQty };
  }

  return { ok: false, code: "NOT_CONFIRMED", error: "Transaction not confirmed after max retries" };
}
