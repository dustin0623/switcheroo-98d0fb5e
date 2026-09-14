import { apiOk, apiError }         from "@/lib/api/error-response";
import { getWallet }                from "@/lib/api/get-wallet";
import { getTransactionHistory }    from "@/lib/modules/transactions-processed/repository.server";
import type { ProcessedTxType }     from "@/lib/modules/transactions-processed/types.server";
import { NextRequest }              from "next/server";

const VALID_TYPES: ProcessedTxType[] = [
  "withdrawal", "deposit", "crate_purchase", "market_purchase",
];

export async function GET(req: NextRequest): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const params    = req.nextUrl.searchParams;
  const limit     = Math.min(25, Math.max(1, Number(params.get("limit") ?? 25)));
  const rawCursor = params.get("cursor");
  const cursor    = rawCursor ? Number(rawCursor) : undefined;
  const rawType   = params.get("type");
  const type      = rawType && VALID_TYPES.includes(rawType as ProcessedTxType)
    ? (rawType as ProcessedTxType)
    : undefined;

  const { transactions, nextCursor } = await getTransactionHistory(
    wallet, limit, cursor, type,
  );

  return apiOk({ transactions, nextCursor });
}
