import nacl from "tweetnacl";
import bs58 from "bs58";

export interface KeyPair {
  address: string;
  secret: string;
}

export function generateKeyPair(): KeyPair {
  const pair = nacl.sign.keyPair();
  return {
    address: bs58.encode(pair.publicKey),
    secret: bs58.encode(pair.secretKey),
  };
}

export function keyPairFromSecret(secret: string): KeyPair {
  const secretKey = bs58.decode(secret);
  const pair = nacl.sign.keyPair.fromSecretKey(secretKey);
  return {
    address: bs58.encode(pair.publicKey),
    secret,
  };
}

export function signMessage(secret: string, message: string): string {
  const secretKey = bs58.decode(secret);
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return bs58.encode(signature);
}

export function isValidAddress(address: string): boolean {
  try {
    const bytes = bs58.decode(address);
    return bytes.length === 32;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------------------
 * Browser wallet (Phantom) adapter
 * ------------------------------------------------------------------------- */

interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array }>;
}

export function getPhantomProvider(): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  const anyWindow = window as unknown as {
    phantom?: { solana?: SolanaProvider };
    solana?: SolanaProvider;
  };
  const provider = anyWindow.phantom?.solana ?? anyWindow.solana;
  return provider?.isPhantom ? provider : null;
}

export function isPhantomInstalled(): boolean {
  return getPhantomProvider() !== null;
}

export const PHANTOM_INSTALL_URL = "https://phantom.app/download";

export interface ConnectedWallet {
  address: string;
  signMessage: (message: string) => Promise<string>;
}

export async function connectPhantom(): Promise<ConnectedWallet> {
  const provider = getPhantomProvider();
  if (!provider) throw new Error("Phantom wallet not found");

  const { publicKey } = await provider.connect();
  const address = publicKey.toString();

  return {
    address,
    signMessage: async (message: string) => {
      const encoded = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encoded, "utf8");
      return bs58.encode(signature);
    },
  };
}

export async function disconnectPhantom(): Promise<void> {
  try {
    await getPhantomProvider()?.disconnect();
  } catch {
    /* ignore */
  }
}
