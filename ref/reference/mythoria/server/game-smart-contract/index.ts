/**
 * server/game-smart-contract/index.ts
 *
 * Entry point for the smart-contract worker process.
 * Start: `tsx server/game-smart-contract/index.ts`
 * SERVER-ONLY — never imported by Next.js pages or API routes.
 */

import { config }              from "@/lib/config/config";
import { TransactionWorker, logQueueDepth } from "./workers/transaction-worker";
import { sendOnChain }         from "./lib/transfers";
import { logger }              from "./lib/logger";

function shutdown(worker: TransactionWorker): void {
  logger.info("shutting down…");
  worker.stop();
  process.exit(0);
}

async function main(): Promise<void> {
  logger.info(`starting on chain=${config.blockchain.chain}`);

  await logQueueDepth().catch((e: unknown) => {
    logger.warn("could not log queue depth (MongoDB not yet ready?)", {
      error: e instanceof Error ? e.message : String(e),
    });
  });

  const worker = new TransactionWorker(sendOnChain);

  process.on("SIGTERM", () => shutdown(worker));
  process.on("SIGINT",  () => shutdown(worker));

  worker.start();
}

main().catch((err: unknown) => {
  logger.error("fatal error", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
