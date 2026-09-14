import { Router } from "express";
import { z } from "zod";

import { findPendingByWallet } from "@/lib/modules/transactions-pending/repository.server";
import { getTransactionHistory } from "@/lib/modules/transactions-processed/repository.server";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(25) });

/**
 * Combined ledger for the wallet modal: jobs still queued in the settlement
 * worker plus transactions the worker already settled on-chain.
 */
router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { limit } = query.parse(req.query);
    const wallet = req.wallet!;

    const [pending, settled] = await Promise.all([
      findPendingByWallet(wallet, limit),
      getTransactionHistory(wallet, limit),
    ]);

    res.json({
      ok: true,
      pending: pending.map((job) => ({
        id: String(job._id),
        type: job.type,
        status: job.status,
        signature: job.signature,
        amount: job.withdrawAmount ?? job.depositAmount ?? job.price ?? 0,
        itemNumber: job.itemNumber ?? null,
        retryCount: job.retryCount,
        error: job.lastError ?? null,
        refunded: job.refunded ?? false,
        createdAt: new Date(job.createdAt).getTime(),
      })),
      history: settled.transactions.map((tx) => ({
        id: String(tx._id),
        type: tx.type,
        txHash: tx.txHash,
        amount: tx.amount,
        processedAt: tx.processedAt,
        metadata: tx.metadata ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
