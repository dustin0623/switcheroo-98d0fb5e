import { apiOk, apiError }          from "@/lib/api/error-response";
import { getWallet }                 from "@/lib/api/get-wallet";
import { verifyDepositFromPlayer }   from "@/lib/chain/verify";
import { enqueueMarketPurchase }     from "@/lib/modules/transactions-pending/repository.server";
import { isTransactionProcessed }   from "@/lib/modules/transactions-processed/repository.server";

const VALID_ITEM_TYPES = ["item", "crate", "consumable", "relic"] as const;
type PurchasableType = typeof VALID_ITEM_TYPES[number];

export async function POST(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const body = await req.json() as {
    txId?:       string;
    itemNumber?: number;
    itemType?:   string;
    amount?:     number;
  };

  const { txId, itemNumber, itemType, amount } = body;

  if (!txId || itemNumber === undefined || !itemType) {
    return apiError("Missing txId, itemNumber, or itemType", "INVALID_BODY", 400);
  }

  if (!VALID_ITEM_TYPES.includes(itemType as PurchasableType)) {
    return apiError(`Unknown itemType: ${itemType}`, "INVALID_TYPE", 400);
  }

  if (!amount || amount <= 0) {
    return apiError("amount must be a positive number", "INVALID_AMOUNT", 400);
  }

  // Idempotency guard.
  if (await isTransactionProcessed(txId)) {
    return apiOk({ status: "already_processed", txId });
  }

  // Verify the buyer actually sent the correct amount on-chain.
  const verification = await verifyDepositFromPlayer(txId, wallet, amount);
  if (!verification.ok) {
    return apiError(
      verification.error ?? "Payment not confirmed on-chain",
      "VERIFICATION_FAILED",
      422,
    );
  }

  const { duplicate } = await enqueueMarketPurchase({
    walletAddress: wallet,
    itemNumber,
    itemType,
    depositTxId: txId,
  });

  return apiOk({ status: duplicate ? "already_queued" : "queued", txId }, 202);
}
