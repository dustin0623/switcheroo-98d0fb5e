import { authenticateRequest } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/cors";
import { findPlayerByWallet, updatePlayer } from "@/lib/modules/players/repository.server";
import { regenCharges, simulateRaid, logRaid } from "@/lib/game/raid.server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const raidInput = z.object({ target: z.string(), seed: z.string() });

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { target, seed } = raidInput.parse(body);

    const attacker = await findPlayerByWallet(auth.wallet);
    const defender = await findPlayerByWallet(target);
    if (!attacker || !defender) {
      return jsonResponse({ ok: false, error: "Player not found" }, request, { status: 404 });
    }

    regenCharges(attacker);
    if (attacker.raidCharges <= 0) {
      return jsonResponse({ ok: false, error: "No raid charges" }, request, { status: 400 });
    }
    if (attacker.wallet === defender.wallet) {
      return jsonResponse({ ok: false, error: "Cannot raid yourself" }, request, { status: 400 });
    }

    const result = simulateRaid(attacker, defender, seed);
    if (result.success) {
      await updatePlayer(attacker.wallet, attacker);
      await updatePlayer(defender.wallet, defender);
    } else {
      attacker.raidCharges -= 1;
      await updatePlayer(attacker.wallet, attacker);
    }
    await logRaid(attacker.wallet, defender.wallet, result, seed);
    return jsonResponse({ ok: result.success, ...result }, request);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse({ ok: false, error: "Invalid request", issues: err.issues }, request, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error("[game/raid]", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, request, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}
