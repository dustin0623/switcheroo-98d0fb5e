import { apiOk, apiError }          from "@/lib/api/error-response";
import { getWallet }                 from "@/lib/api/get-wallet";
import { verifyDepositFromPlayer }   from "@/lib/chain/verify";
import { enqueueCratePurchase }      from "@/lib/modules/transactions-pending/repository.server";
import { isTransactionProcessed }   from "@/lib/modules/transactions-processed/repository.server";

const CRATE_PRICES: Record<string, number> = {
  common:    100,
  uncommon:  500,
  rare:      1500,
  epic:      5000,
  legendary: 20000,
};

export async function POST(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const body = await req.json() as { txId?: string; rarity?: string; count?: number };
  const { txId, rarity, count } = body;

  if (!txId || !rarity || !count) {
    return apiError("Missing txId, rarity, or count", "INVALID_BODY", 400);
  }

  const unitPrice = CRATE_PRICES[rarity];
  if (!unitPrice) {
    return apiError(`Unknown rarity: ${rarity}`, "INVALID_RARITY", 400);
  }

  if (!Number.isInteger(count) || count < 1) {
    return apiError("count must be a positive integer", "INVALID_AMOUNT", 400);
  }

  // Idempotency — if already fully processed, just ack.
  if (await isTransactionProcessed(txId)) {
    return apiOk({ status: "already_processed", txId });
  }

  const expectedAmount = unitPrice * count;
  const verification = await verifyDepositFromPlayer(txId, wallet, expectedAmount);
  if (!verification.ok) {
    return apiError(
      verification.error ?? "Payment not confirmed on-chain",
      "VERIFICATION_FAILED",
      422,
    );
  }

  const { duplicate } = await enqueueCratePurchase({
    walletAddress: wallet,
    crateRarity:   rarity,
    crateCount:    count,
    depositTxId:   txId,
  });

  return apiOk({ status: duplicate ? "already_queued" : "queued", txId }, 202);
}
