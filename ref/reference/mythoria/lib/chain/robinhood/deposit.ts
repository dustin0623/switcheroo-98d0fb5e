// lib/chain/robinhood/deposit.ts
// Server-only. Returns the treasury address for incoming ERC-20 token deposits.
import { config } from "@/lib/config/config";

export function getDepositAddress(): {
  address: string;
  token: string;
} {
  return {
    address: config.blockchain.treasuryAddress,
    token: config.blockchain.contractAddress,
  };
}
