/**
 * lib/client/chain.ts
 * Browser-safe chain constant.
 *
 * The active chain is baked in at build time via NEXT_PUBLIC_CHAIN.
 * To switch chains, change the env var and redeploy — there is no runtime
 * chain selection. This is a single-chain app per deployment.
 */
"use client";

import type { SupportedChain } from "@/lib/config/config";
import { getAdapterByChain } from "@/lib/auth/wallet-adapters";

const raw = (process.env.NEXT_PUBLIC_CHAIN ?? "hive").toLowerCase();

/**
 * The chain this deployment is configured for (build-time constant).
 * Change NEXT_PUBLIC_CHAIN and redeploy to switch chains.
 */
export const activeChain: SupportedChain =
  raw === "solana" ? "solana" : raw === "robinhood" ? "robinhood" : "hive";

/**
 * Get the wallet adapter for the active chain.
 */
export function getWalletAdapter() {
  return getAdapterByChain(activeChain);
}

/**
 * Check if the wallet extension for the active chain is installed.
 */
export function isWalletAvailable(): boolean {
  try {
    return getAdapterByChain(activeChain).isAvailable();
  } catch {
    return false;
  }
}
