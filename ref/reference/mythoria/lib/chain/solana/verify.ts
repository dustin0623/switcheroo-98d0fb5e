// lib/chain/solana/verify.ts
// Server-only. Verifies a Solana wallet signature using nacl + bs58.
// No env vars — all defaults hardcoded.

export async function verify(
  wallet: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const { default: bs58 } = await import("bs58");
    const nacl = await import("tweetnacl");
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = bs58.decode(signature);
    const pubBytes = bs58.decode(wallet);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes);
  } catch {
    return false;
  }
}
