// lib/chain/robinhood/verify.ts
// Server-only. Verifies an EVM (Robinhood) wallet signature using ethers.
// No env vars — all defaults hardcoded.

export async function verify(
  wallet: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const { ethers } = await import("ethers");
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === wallet.toLowerCase();
  } catch {
    return false;
  }
}
