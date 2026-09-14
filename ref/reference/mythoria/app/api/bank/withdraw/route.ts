import { apiOk, apiError }    from "@/lib/api/error-response";
import { getWallet }           from "@/lib/api/get-wallet";
import { enqueueWithdrawal }   from "@/lib/modules/transactions-pending/repository.server";
import { findPlayerByWallet }  from "@/lib/modules/players/repository.server";

export async function POST(req: Request): Promise<Response> {
  if (process.env.NEXT_PUBLIC_WALLET_ENABLED !== "true") {
    return apiError("Withdrawals are currently disabled", "WITHDRAWALS_DISABLED", 503);
  }

  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const body = await req.json() as { amount?: unknown };
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < 1) {
    return apiError("Amount must be an integer >= 1", "INVALID_AMOUNT", 400);
  }

  const player = await findPlayerByWallet(wallet);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);

  if ((player as { aether: number }).aether < amount) {
    return apiError("Insufficient balance", "INSUFFICIENT_AETHER", 422);
  }

  const { jobId } = await enqueueWithdrawal({ walletAddress: wallet, withdrawAmount: amount });
  return apiOk({ status: "queued", jobId }, 202);
}
