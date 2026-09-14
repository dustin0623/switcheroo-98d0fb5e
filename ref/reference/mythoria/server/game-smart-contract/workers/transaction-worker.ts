/**
 * server/game-smart-contract/workers/transaction-worker.ts
 *
 * Drains the transactions_pending queue and settles each job type on-chain.
 *
 * Job flow:
 *   withdrawal:      sendOnChain → deductCoins → insertProcessedTransaction → completeJob
 *   deposit:         verifyDepositFromPlayer → claimProcessedTransaction → addCoins → completeJob
 *   crate_purchase:  deductCoins → mint crates (Phase 4) → insertProcessedTransaction → completeJob
 *   market_purchase: deductCoins → transfer ownership (Phase 4) → insertProcessedTransaction → completeJob
 *
 * Retry policy:
 *   Terminal codes (INSUFFICIENT_COINS, VERIFICATION_FAILED, NOT_FOUND):
 *     failJob(id, msg, 1) — dead-lettered immediately
 *   Transient (RPC / network):
 *     failJob(id, msg, maxRetries) — retried until maxRetries, then dead
 *
 * Run exactly ONE instance to preserve sequential, oldest-first ordering.
 * SERVER-ONLY.
 */

import {
  listPendingOldestFirst,
  completeJob,
  failJob,
  countJobsByStatus,
} from "@/lib/modules/transactions-pending/repository.server";
import type { IInboundTransaction } from "@/lib/modules/transactions-pending/types.server";
import {
  insertProcessedTransaction,
  claimProcessedTransaction,
} from "@/lib/modules/transactions-processed/repository.server";
import {
  addCoins,
  deductCoins,
} from "@/lib/modules/players/repository.server";
import { verifyDepositFromPlayer } from "@/lib/chain/verify";
import { config } from "@/lib/config/config";
import { logger } from "../lib/logger";

export type SendOnChainFn = (
  playerWallet: string,
  amount: number,
  ref: string,
) => Promise<{ signature: string }>;

/** Terminal business-logic errors — retrying will never help. */
const NON_RETRYABLE = new Set([
  "INSUFFICIENT_COINS",
  "VERIFICATION_FAILED",
  "NOT_FOUND",
  "INVALID_AMOUNT",
]);

export class TransactionWorker {
  private timer: NodeJS.Timeout | null = null;
  private draining = false;
  private stopped  = false;

  constructor(
    private readonly sendOnChain: SendOnChainFn,
    private readonly pollMs    = config.withdrawal.workerPollMs,
    private readonly maxRetries = config.withdrawal.maxRetries,
  ) {}

  start(): void {
    logger.info(`starting — polling every ${this.pollMs}ms, maxRetries=${this.maxRetries}`);
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.pollMs);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    logger.info("stopped");
  }

  private async tick(): Promise<void> {
    if (this.draining || this.stopped) return;
    this.draining = true;
    try {
      // Refresh beacon nodes before each Hive drain cycle.
      if (config.blockchain.chain === "hive") {
        try {
          const { getHiveNodes } = await import("@/lib/chain/hive/rpc");
          const nodes = await getHiveNodes();
          logger.info(`beacon nodes resolved (${nodes.length})`);
        } catch { /* non-fatal */ }
      }

      const jobs = await listPendingOldestFirst();
      if (jobs.length === 0) return;

      logger.info(`draining ${jobs.length} job(s)`);
      for (const job of jobs) {
        if (this.stopped) break;
        await this.processJob(job);
      }
    } catch (err) {
      logger.error("drain cycle error", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      this.draining = false;
    }
  }

  private async processJob(job: IInboundTransaction): Promise<void> {
    switch (job.type) {
      case "withdrawal":      return this.processWithdrawal(job);
      case "deposit":         return this.processDeposit(job);
      case "crate_purchase":  return this.processCratePurchase(job);
      case "market_purchase": return this.processMarketPurchase(job);
      default:
        logger.warn("unknown job type", { type: (job as { type: string }).type });
        await failJob(String(job._id), "unknown job type", 1);
    }
  }

  /** Withdrawal: send on-chain → deduct coins → write ledger → complete. */
  private async processWithdrawal(job: IInboundTransaction): Promise<void> {
    const id     = String(job._id);
    const amount = job.withdrawAmount ?? 0;
    try {
      const { signature } = await this.sendOnChain(job.walletAddress, amount, job.signature);

      const { ok } = await deductCoins(job.walletAddress, amount);
      if (!ok) {
        await failJob(id, "INSUFFICIENT_COINS: balance dropped between enqueue and settlement", 1);
        logger.warn("dead-lettered withdrawal (insufficient coins at settlement)", {
          wallet: job.walletAddress, amount,
        });
        return;
      }

      await insertProcessedTransaction({
        txHash:   signature,
        wallet:   job.walletAddress,
        type:     "withdrawal",
        amount:   -amount,
        metadata: { type: "withdrawal", payoutTxHash: signature },
      });

      await completeJob(id);
      logger.info("settled withdrawal", { wallet: job.walletAddress, amount, signature });
    } catch (err) {
      const code    = (err as { code?: string }).code;
      const message = err instanceof Error ? err.message : String(err);
      if (code && NON_RETRYABLE.has(code)) {
        await failJob(id, `${code}: ${message}`, 1);
        logger.warn("dead-lettered withdrawal (non-retryable)", { wallet: job.walletAddress, code });
        return;
      }
      const dead = await failJob(id, message, this.maxRetries);
      logger.warn(dead ? "dead-lettered withdrawal (max retries)" : "withdrawal retry scheduled", {
        wallet: job.walletAddress, amount,
      });
    }
  }

  /** Deposit: verify on-chain → claim ledger row → credit coins → complete. */
  private async processDeposit(job: IInboundTransaction): Promise<void> {
    const id     = String(job._id);
    const amount = job.depositAmount ?? 0;
    const txId   = job.depositTxId  ?? job.signature;
    try {
      const verification = await verifyDepositFromPlayer(txId, job.walletAddress, amount);
      if (!verification.ok) {
        if (verification.code === "NOT_CONFIRMED") {
          const dead = await failJob(id, verification.error ?? "not confirmed", this.maxRetries);
          logger.warn(dead ? "dead-lettered deposit (max retries)" : "deposit retry scheduled", {
            wallet: job.walletAddress, txId,
          });
          return;
        }
        await failJob(id, `VERIFICATION_FAILED: ${verification.error ?? "invalid"}`, 1);
        logger.warn("dead-lettered deposit (verification failed)", {
          wallet: job.walletAddress, txId, error: verification.error,
        });
        return;
      }

      const { claimed } = await claimProcessedTransaction({
        txHash:   txId,
        wallet:   job.walletAddress,
        type:     "deposit",
        amount,
        metadata: { type: "deposit", creditedAmount: amount },
      });

      if (claimed) {
        await addCoins(job.walletAddress, amount);
        logger.info("settled deposit", { wallet: job.walletAddress, amount, txId });
      } else {
        logger.info("deposit already processed (idempotent)", { wallet: job.walletAddress, txId });
      }

      await completeJob(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const dead    = await failJob(id, message, this.maxRetries);
      logger.warn(dead ? "dead-lettered deposit (max retries)" : "deposit retry scheduled", {
        wallet: job.walletAddress, txId,
      });
    }
  }

  /**
   * Crate purchase: deduct coins → mint crates (Phase 4 stub) → write ledger → complete.
   * Full minting logic is implemented in Phase 4 (items/crates module).
   */
  private async processCratePurchase(job: IInboundTransaction): Promise<void> {
    const id    = String(job._id);
    const rarity = job.crateRarity ?? "common";
    const count  = job.crateCount  ?? 1;

    const CRATE_PRICES: Record<string, number> = {
      common: 100, uncommon: 500, rare: 1500, epic: 5000, legendary: 20000,
    };
    const cost = (CRATE_PRICES[rarity] ?? 100) * count;

    try {
      const { ok } = await deductCoins(job.walletAddress, cost);
      if (!ok) {
        await failJob(id, "INSUFFICIENT_COINS: cannot deduct crate cost", 1);
        logger.warn("dead-lettered crate purchase (insufficient coins)", {
          wallet: job.walletAddress, rarity, count, cost,
        });
        return;
      }

      // Phase 4 will mint actual crate NFTs here. For now we write the ledger row.
      await insertProcessedTransaction({
        txHash:   job.signature,
        wallet:   job.walletAddress,
        type:     "crate_purchase",
        amount:   -cost,
        metadata: { type: "crate_purchase", crateNumbers: [], rarity },
      });

      await completeJob(id);
      logger.info("settled crate purchase", { wallet: job.walletAddress, rarity, count, cost });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const dead    = await failJob(id, message, this.maxRetries);
      logger.warn(dead ? "dead-lettered crate purchase (max retries)" : "crate purchase retry scheduled", {
        wallet: job.walletAddress,
      });
    }
  }

  /**
   * Market purchase: deduct coins → transfer item ownership (Phase 4 stub) → write ledger → complete.
   */
  private async processMarketPurchase(job: IInboundTransaction): Promise<void> {
    const id         = String(job._id);
    const itemNumber = job.itemNumber ?? 0;
    const itemType   = job.itemType   ?? "item";

    try {
      // Phase 4 will supply the real price from the item listing.
      // For now record the ledger row with amount 0 as a Phase 4 stub.
      await insertProcessedTransaction({
        txHash:   job.signature,
        wallet:   job.walletAddress,
        type:     "market_purchase",
        amount:   0,
        metadata: { type: "market_purchase", itemNumber, itemType },
      });

      await completeJob(id);
      logger.info("settled market purchase (stub)", { wallet: job.walletAddress, itemNumber, itemType });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const dead    = await failJob(id, message, this.maxRetries);
      logger.warn(dead ? "dead-lettered market purchase (max retries)" : "market purchase retry scheduled", {
        wallet: job.walletAddress,
      });
    }
  }
}

export async function logQueueDepth(): Promise<void> {
  const counts = await countJobsByStatus();
  logger.info("queue depth", counts);
}
