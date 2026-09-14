import "@/features/stores/legacyStorage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  connectPhantom,
  disconnectPhantom,
  generateKeyPair,
  isPhantomInstalled,
  signMessage,
} from "@/lib/wallet";
import {
  generateChallenge,
  verifySignature,
  setAuthToken,
  setDemoMode,
} from "@/lib/api/client";

export function shortAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

export type AuthMode = "wallet" | "demo";

interface AuthState {
  address: string | null;
  username: string | null;
  /** Only set in demo mode — a throwaway local keypair, never a real wallet. */
  secret: string | null;
  mode: AuthMode | null;
  connectedAt: number | null;
  apiConnected: boolean | null;
  connectWallet: () => Promise<string | null>;
  playDemo: () => string;
  setUsername: (username: string) => Promise<void>;
  disconnect: () => void;
}

async function authWithServer(
  address: string,
  sign: (message: string) => Promise<string>,
): Promise<boolean> {
  const challenge = await generateChallenge(address);
  if (!challenge.ok || !challenge.nonce) return false;

  let signature: string;
  try {
    signature = await sign(challenge.nonce);
  } catch {
    return false;
  }

  const verify = await verifySignature(address, signature);
  if (!verify.ok || !verify.token) {
    setAuthToken(null);
    return false;
  }

  setAuthToken(verify.token);
  return true;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      address: null,
      username: null,
      secret: null,
      mode: null,
      connectedAt: null,
      apiConnected: null,

      connectWallet: async () => {
        if (!isPhantomInstalled()) {
          throw new Error("Phantom wallet not found");
        }

        setDemoMode(false);
        const wallet = await connectPhantom();
        const apiConnected = await authWithServer(wallet.address, wallet.signMessage);

        if (!apiConnected) {
          setAuthToken(null);
          set({ apiConnected: false });
          throw new Error("Could not verify your wallet with the server");
        }

        set({
          address: wallet.address,
          secret: null,
          mode: "wallet",
          connectedAt: Date.now(),
          apiConnected: true,
        });
        return wallet.address;
      },

      playDemo: () => {
        const pair = generateKeyPair();
        setAuthToken(null);
        setDemoMode(true);
        set({
          address: pair.address,
          secret: pair.secret,
          mode: "demo",
          connectedAt: Date.now(),
          apiConnected: false,
        });
        return pair.address;
      },

      setUsername: async (username) => {
        const trimmed = username.trim();
        if (!trimmed) return;
        set({ username: trimmed });

        if (get().mode === "wallet" && get().apiConnected) {
          const result = await import("@/lib/api/client").then((m) => m.updateProfile(trimmed));
          if (!result.ok) set({ apiConnected: false });
        }
      },

      disconnect: () => {
        setAuthToken(null);
        setDemoMode(false);
        void disconnectPhantom();
        set({
          address: null,
          username: null,
          secret: null,
          mode: null,
          connectedAt: null,
          apiConnected: null,
        });
      },
    }),
    {
      name: "cryptocore-auth",
      version: 4,
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (state.mode === "demo" && state.address) {
          setDemoMode(true);
          state.apiConnected = false;
          return;
        }

        setDemoMode(false);
        if (state.mode === "wallet" && state.address) {
          // Re-establish the server session with a fresh wallet signature.
          void (async () => {
            try {
              const wallet = await connectPhantom();
              if (wallet.address !== state.address) {
                useAuthStore.getState().disconnect();
                return;
              }
              const ok = await authWithServer(wallet.address, wallet.signMessage);
              useAuthStore.setState({ apiConnected: ok });
              if (!ok) setAuthToken(null);
            } catch {
              useAuthStore.setState({ apiConnected: false });
              setAuthToken(null);
            }
          })();
        } else {
          state.apiConnected = false;
        }
      },
    },
  ),
);
