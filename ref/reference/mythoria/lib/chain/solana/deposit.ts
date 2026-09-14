// lib/chain/solana/deposit.ts
// Server-only. Returns the treasury address for incoming SPL token deposits.
import { config } from "@/lib/config/config";

export function getDepositAddress(): {
  address: string;
  mint: string;
} {
  return {
    address: config.blockchain.treasuryAddress,
    mint: config.blockchain.contractAddress,
  };
}
