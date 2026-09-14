// src/lib/chain/solana/client.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "@/lib/config/config";

export function getSolanaConnection(): Connection {
  return new Connection(config.blockchain.solana.rpcUrl, "confirmed");
}

export function getTreasuryPublicKey(): PublicKey {
  if (!config.blockchain.treasuryAddress) {
    throw new Error("TREASURY_ADDRESS is not set");
  }
  return new PublicKey(config.blockchain.treasuryAddress);
}

export function getMintPublicKey(): PublicKey {
  if (!config.blockchain.solana.mint) {
    throw new Error("CONTRACT_ADDRESS (mint) is not set");
  }
  return new PublicKey(config.blockchain.solana.mint);
}
