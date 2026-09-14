import { authenticateRequest } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/cors";
import { buyFromMarket } from "@/lib/game/market.server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const buyInput = z.object({
  itemNumber: z.number().int().positive(),
  paymentTxId: z.string().min(32).max(120),
});

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { itemNumber, paymentTxId } = buyInput.parse(body);
    const result = await buyFromMarket(itemNumber, auth.wallet, paymentTxId);
    return jsonResponse(result, request, { status: result.ok ? 202 : 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse({ ok: false, error: "Invalid request", issues: err.issues }, request, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error("[market/buy]", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, request, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}
