// GET /api/quests/active — authenticated player's in-progress quests
import { NextRequest } from "next/server";
import { getWallet } from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { findActiveQuestsByWallet } from "@/lib/modules/active-quests/repository.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  try {
    const quests = await findActiveQuestsByWallet(wallet);

    // Add computed time_remaining_ms for the client
    const nowMs = Date.now();
    const withRemaining = quests.map((q) => ({
      ...q,
      time_remaining_ms: Math.max(0, q.completes_at - nowMs),
    }));

    return apiOk({ quests: withRemaining });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(message, "QUESTS_FETCH_FAILED", 500);
  }
}
