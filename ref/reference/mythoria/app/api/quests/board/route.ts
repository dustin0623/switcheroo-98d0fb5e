// GET /api/quests/board — today's quest board (public, no auth required)
import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/error-response";
import { getTodaysBoard, generateBoard } from "@/lib/modules/quest-board/repository.server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest): Promise<Response> {
  try {
    let board = await getTodaysBoard();

    // Auto-generate if no board exists yet for today (first ever deploy or
    // the cron hasn't run yet). Production cron keeps this path cold.
    if (!board) {
      board = await generateBoard();
    }

    return apiOk({ board });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(message, "BOARD_FETCH_FAILED", 500);
  }
}
