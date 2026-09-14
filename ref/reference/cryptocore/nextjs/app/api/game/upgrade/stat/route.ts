import { authenticateRequest } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/cors";
import { upgradeStat } from "@/lib/game/upgrade.server";
import { STAT_KEYS } from "@/features/constants/game";
import type { StatKey } from "@/features/types/game";
import { z } from "zod";

export const dynamic = "force-dynamic";

const statInput = z.object({ stat: z.enum(STAT_KEYS as [StatKey, ...StatKey[]]) });

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { stat } = statInput.parse(body);
    const result = await upgradeStat(auth.wallet, stat);
    return jsonResponse(result, request, { status: result.ok ? 200 : 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse({ ok: false, error: "Invalid request", issues: err.issues }, request, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error("[game/upgrade/stat]", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, request, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}
