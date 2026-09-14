import { authenticateRequest } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/cors";
import { tickPlayer } from "@/lib/game/mining.server";
import { findPlayerByWallet, updatePlayer } from "@/lib/modules/players/repository.server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  try {
    const player = await findPlayerByWallet(auth.wallet);
    if (!player) {
      return jsonResponse({ ok: false, error: "Player not found" }, request, { status: 404 });
    }
    const { player: updated, mined } = tickPlayer(player);
    await updatePlayer(auth.wallet, updated);
    return jsonResponse({ ok: true, mined, vault: updated.vault }, request);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[game/tick]", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, request, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}
