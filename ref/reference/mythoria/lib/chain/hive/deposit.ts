// lib/chain/hive/deposit.ts
// Server-only. Returns deposit instructions for Hive Engine token transfers.
import { config } from "@/lib/config/config";

export function getDepositAddress(): {
  address: string;
  memo: string;
  symbol: string;
} {
  return {
    address: config.blockchain.treasuryAddress,
    memo: "deposit",       // callers should append the player's wallet as memo
    symbol: config.blockchain.contractAddress,
  };
}
