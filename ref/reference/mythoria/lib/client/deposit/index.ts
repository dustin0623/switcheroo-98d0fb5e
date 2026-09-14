/**
 * lib/client/deposit/index.ts
 *
 * Re-exports all client deposit helpers and shared types.
 * Import from here instead of individual modules:
 *   import { depositSolana, depositHive, depositRobinhood } from "@/lib/client/deposit";
 */

export type { DepositOptions, DepositResult, DepositFn } from "./types";
export { depositHive }     from "./hive";
export { depositSolana }   from "./solana";
export { depositRobinhood } from "./robinhood";
