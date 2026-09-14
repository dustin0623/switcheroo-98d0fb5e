/**
 * lib/auth/wallet-adapters.ts
 *
 * Multi-chain wallet adapter definitions. Each adapter specifies:
 * - How to request a signature from the wallet
 * - How to format the signing message
 * - Display metadata (name, icon, description)
 *
 * Supports: Hive (Keychain), Solana (Phantom), Robinhood (Metamask)
 * Start with Hive; others can be added by extending this config.
 */

import { SupportedChain } from "@/lib/config/config";

export interface WalletAdapter {
  chain: SupportedChain;
  name: string;
  label: string;
  description: string;
  icon: string; // emoji or URL
  isAvailable: () => boolean;
  requestSignature: (
    username: string,
    message: string
  ) => Promise<{ signature: string; publicKey?: string }>;
}

/**
 * Hive Keychain adapter — signs with the Posting key.
 * Window.hive_keychain is globally available when users have the extension.
 */
export const hiveKeychainAdapter: WalletAdapter = {
  chain: "hive",
  name: "Hive Keychain",
  label: "Hive",
  description: "Sign in with Hive Keychain",
  icon: "🔐",

  isAvailable: () => {
    return typeof window !== "undefined" && !!window.hive_keychain;
  },

  requestSignature: (username: string, message: string) => {
    return new Promise((resolve, reject) => {
      if (!window.hive_keychain) {
        reject(new Error("Hive Keychain not found"));
        return;
      }

      window.hive_keychain.requestSignBuffer(
        username,
        message,
        "Posting",
        (response: any) => {
          if (response.success) {
            resolve({
              signature: response.result,
              publicKey: response.publicKey,
            });
          } else {
            reject(
              new Error(response.message || "Signature request denied")
            );
          }
        }
      );
    });
  },
};

/**
 * Solana Phantom adapter — for future support.
 * Placeholder; implement when Solana integration is needed.
 */
export const solanaPhantomAdapter: WalletAdapter = {
  chain: "solana",
  name: "Phantom",
  label: "Solana",
  description: "Sign in with Phantom",
  icon: "👻",

  isAvailable: () => {
    return typeof window !== "undefined" && !!(window as any).solana;
  },

  requestSignature: async (username: string, message: string) => {
    throw new Error("Solana adapter not yet implemented");
  },
};

/**
 * Robinhood (EVM) MetaMask adapter — for future support.
 * Placeholder; implement when Robinhood integration is needed.
 */
export const robinhoodMetaMaskAdapter: WalletAdapter = {
  chain: "robinhood",
  name: "MetaMask",
  label: "Robinhood",
  description: "Sign in with MetaMask",
  icon: "🦊",

  isAvailable: () => {
    return typeof window !== "undefined" && !!(window as any).ethereum;
  },

  requestSignature: async (username: string, message: string) => {
    throw new Error("Robinhood adapter not yet implemented");
  },
};

/**
 * All available adapters.
 * Returned in order of preference; UI can list them or auto-select the first available.
 */
export const ALL_ADAPTERS: WalletAdapter[] = [
  hiveKeychainAdapter,
  solanaPhantomAdapter,
  robinhoodMetaMaskAdapter,
];

/**
 * Get the wallet adapter for a given chain.
 */
export function getAdapterByChain(chain: SupportedChain): WalletAdapter {
  const adapter = ALL_ADAPTERS.find((a) => a.chain === chain);
  if (!adapter) {
    throw new Error(`No adapter found for chain: ${chain}`);
  }
  return adapter;
}

/**
 * Get the first available adapter (for single-chain or "auto-detect" login).
 */
export function getFirstAvailableAdapter(): WalletAdapter | null {
  for (const adapter of ALL_ADAPTERS) {
    if (adapter.isAvailable()) {
      return adapter;
    }
  }
  return null;
}
