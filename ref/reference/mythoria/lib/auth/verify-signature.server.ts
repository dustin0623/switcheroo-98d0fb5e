// lib/auth/verify-signature.server.ts
// Server-only. Routes to the active chain's verify adapter via dynamic import.
import { config } from "@/lib/config/config";

export function getActiveChain() {
  return config.blockchain.chain;
}

export async function verifyWalletSignature(opts: {
  wallet: string;
  message: string;
  signature: string;
}): Promise<boolean> {
  // Dynamic import so only the active chain's deps are bundled at runtime.
  const mod = await import(`@/lib/chain/${config.blockchain.chain}/verify`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return (mod.verify as (w: string, m: string, s: string) => Promise<boolean>)(
    opts.wallet,
    opts.message,
    opts.signature
  );
}
