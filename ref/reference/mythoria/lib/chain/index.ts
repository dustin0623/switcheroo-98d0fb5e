// lib/chain/index.ts
// Server-only. Routes all chain calls to the active adapter based on
// config.blockchain.chain. Dynamic imports keep only the active chain's
// dependencies in the bundle.
import { config } from "@/lib/config/config";

export async function verifySignature(
  wallet: string,
  message: string,
  signature: string
): Promise<boolean> {
  const mod = await import(`@/lib/chain/${config.blockchain.chain}/verify`);
  return (mod.verify as (w: string, m: string, s: string) => Promise<boolean>)(
    wallet,
    message,
    signature
  );
}

export async function sendTransfer(
  to: string,
  amount: number,
  memo: string
): Promise<string> {
  const mod = await import(`@/lib/chain/${config.blockchain.chain}/transfer`);
  return (mod.transfer as (t: string, a: number, m: string) => Promise<string>)(
    to,
    amount,
    memo
  );
}

export async function getDepositAddress(): Promise<Record<string, string>> {
  const mod = await import(`@/lib/chain/${config.blockchain.chain}/deposit`);
  return (mod.getDepositAddress as () => Record<string, string>)();
}
