# Restructure the settlement worker (deposits, withdrawals, marketplace)

## Why

Today `server/game-smart-contract/index.ts` is one 159-line file that mixes polling, on-chain verification, ledger writes and error handling. The boom-miner / mythoria reference splits the same job into four small pieces — entry point, logger, transfers, worker class — with an explicit retry policy per failure type. Marketplace buys currently settle inline in `src/lib/game/market.server.ts` with no ledger row, so there is no single record of value movement.

Two things also block correctness right now, both confirmed by reading the code:

- `src/lib/modules/logs/` does not exist, yet 8 files import `@/lib/modules/logs/repository.server` (the worker, the market/raid/claim/chest/burn/mining/upgrade game logic, and two API routes). Anything touching logs fails.
- There is no Solana deposit verifier. `src/lib/chain/solana/verify.ts` only checks wallet signatures; the worker inspects raw parsed instructions inline and does not check the SPL mint or the amount.

## Target structure

```text
server/game-smart-contract/
  index.ts                        entry: connect DB, log queue depth, start worker, handle SIGTERM/SIGINT
  lib/logger.ts                   timestamped logger, redacts key/secret/private fields
  lib/transfers.ts                sendOnChain(wallet, amount, ref) -> { signature }
  workers/transaction-worker.ts   TransactionWorker class + logQueueDepth()
```

`TransactionWorker` keeps a `draining` guard so cycles never overlap, drains oldest-first, and dispatches by job type. Retry policy copied from the reference: terminal codes (`INSUFFICIENT_HASH`, `VERIFICATION_FAILED`, `NOT_FOUND`, `INVALID_AMOUNT`, `LISTING_GONE`) dead-letter immediately via `failJob(id, msg, 1)`; RPC/network failures retry up to `WORKER_MAX_RETRIES`.

## Job flows

- **deposit** — verify the SPL transfer on-chain (mint, treasury destination, amount, confirmation) -> `claimProcessedTransaction` -> `creditHash` only when claimed -> `completeJob`. Idempotent on the deposit tx signature.
- **withdrawal** — HASH is already debited at enqueue time in `src/lib/transactions/functions.ts`; the worker sends the SPL payout, confirms it, writes the ledger row with the payout signature, completes. If the payout fails terminally, the debited HASH is refunded via `creditHash` before dead-lettering so players are never silently drained.
- **market_purchase** (new) — re-read the listing, debit buyer HASH, credit seller minus the `MARKET_FEE_BPS` fee, transfer item ownership, `markSold`, write one ledger row, complete. Validation of "listing still active / not your own / enough HASH" happens at enqueue so the UI gets instant feedback; the worker re-checks before moving value.

## Changes by file

New:

- `src/lib/modules/logs/{types,model,repository}.server.ts` — the missing module: `createLog`, `createErrorLog`, plus the paginated reads `server/game-api/routes/logs.ts` already expects.
- `src/lib/chain/solana/verify-deposit.ts` — `verifyDepositFromPlayer(txId, wallet, amount)` returning `{ ok, amount?, code?: "NOT_CONFIRMED" | "INVALID", error? }`; checks the parsed SPL transfer targets the treasury token account for the configured mint, from the player's wallet, for at least the claimed amount.
- `server/game-smart-contract/lib/logger.ts`, `lib/transfers.ts`, `workers/transaction-worker.ts`.

Edited:

- `server/game-smart-contract/index.ts` — reduced to the entry point described above.
- `src/lib/modules/transactions-pending/{types,model,repository}.server.ts` — add `market_purchase` to the type union, add `itemNumber` / `itemType` / `price` fields, add `enqueueMarketPurchase`.
- `src/lib/modules/transactions-processed/types.server.ts` — add the `market_purchase` type and its metadata variant.
- `src/lib/game/market.server.ts` — `buyFromMarket` becomes validate-and-enqueue; the settlement body moves into the worker.
- `src/lib/transactions/functions.ts` — withdrawal/deposit input hardening (min amount, wallet format) and a `requestMarketPurchase` server fn.
- `server/game-api/routes/market.ts` — `/buy` returns the queued job id instead of a completed sale.
- `.env.example` — document `WORKER_POLL_MS`, `WORKER_MAX_RETRIES`, `TREASURY_ADDRESS`, `TREASURY_KEY`, `CONTRACT_ADDRESS`, `SOLANA_RPC_URL`, `HELIUS_API_KEY`.

## Notes

- Run exactly one worker instance; sequential oldest-first ordering is the concurrency model.
- Token decimals stay at the current `sendToken` default of 6; say the word if the mint uses 9.
- The wallet UI (`src/components/game/WalletModal.tsx`) is still local-only mock state. Wiring it to the real deposit/withdraw server functions is a separate follow-up, not part of this change  
  
take note: the server/game-smart-contract/index.ts is wrong you need to follow the proper folder structure for it. 
- &nbsp;