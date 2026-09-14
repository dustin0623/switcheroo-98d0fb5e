import { apiOk, apiError }          from "@/lib/api/error-response";
import { getWallet }                 from "@/lib/api/get-wallet";
import { verifyDepositFromPlayer }   from "@/lib/chain/verify";
import { enqueueDeposit }            from "@/lib/modules/transactions-pending/repository.server";
import { isTransactionProcessed }    from "@/lib/modules/transactions-processed/repository.server";

export async function POST(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const body = await req.json() as { txId?: unknown; amount?: unknown };
  const txId   = String(body.txId   ?? "").trim();
  const amount = Number(body.amount);

  if (!txId || !amount || amount <= 0) {
    return apiError("Missing or invalid txId / amount", "INVALID_BODY", 400);
  }

  // Idempotency: if already processed, ack without re-crediting.
  if (await isTransactionProcessed(txId)) {
    return apiOk({ status: "already_processed", txId });
  }

  // Verify on-chain that the player actually sent the expected amount.
  const verification = await verifyDepositFromPlayer(txId, wallet, amount);
  if (!verification.ok) {
    return apiError(
      verification.error ?? "Deposit not confirmed on-chain",
      "VERIFICATION_FAILED",
      422,
    );
  }

  const { duplicate } = await enqueueDeposit({
    walletAddress: wallet,
    depositAmount: amount,
    depositTxId:   txId,
  });

  return apiOk({ status: duplicate ? "already_queued" : "queued", txId }, 202);
}
