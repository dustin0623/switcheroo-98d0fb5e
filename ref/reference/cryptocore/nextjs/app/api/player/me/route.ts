import { authenticateRequest, type AuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/cors";
import { findPlayerByWallet, upsertPlayer, updatePlayer } from "@/lib/modules/players/repository.server";
import { z } from "zod";

export const dynamic = "force-dynamic";

function toPlayerDto(player: NonNullable<Awaited<ReturnType<typeof findPlayerByWallet>>>) {
  return {
    address: player.wallet,
    username: player.username,
    registrationTime: player.registrationTime,
    xp: player.xp,
    level: player.level,
    hash: player.hash,
    sparks: player.sparks,
    vault: player.vault,
    vaultStaked: player.vaultStaked,
    notoriety: player.notoriety,
    totalBurned: player.totalBurned,
    statLevels: player.statLevels,
    lastTickAt: player.lastTickAt,
    lastSinkAt: player.lastSinkAt,
    claimCharges: player.claimCharges,
    lastClaimRegenAt: player.lastClaimRegenAt,
    raidCharges: player.raidCharges,
    lastRaidRegenAt: player.lastRaidRegenAt,
    totalClaimed: player.totalClaimed,
    totalMined: player.totalMined,
    raids: player.raids,
    raidWins: player.raidWins,
    totalStolen: player.totalStolen,
    bestHashRate: player.bestHashRate,
    protectionUntil: player.protectionUntil,
  };
}

const updateInput = z.object({ username: z.string().min(3).max(32) });

async function handleGet(request: Request, auth: AuthContext) {
  let player = await findPlayerByWallet(auth.wallet);
  if (!player) {
    await upsertPlayer({ wallet: auth.wallet, username: auth.wallet });
    player = await findPlayerByWallet(auth.wallet);
  }
  if (!player) {
    return jsonResponse({ ok: false, error: "Player not found" }, request, { status: 404 });
  }
  return jsonResponse({ ok: true, player: toPlayerDto(player) }, request);
}

async function handlePost(request: Request, auth: AuthContext) {
  try {
    const body = await request.json();
    const { username } = updateInput.parse(body);
    await upsertPlayer({ wallet: auth.wallet, username });
    await updatePlayer(auth.wallet, { username });
    const player = await findPlayerByWallet(auth.wallet);
    if (!player) {
      return jsonResponse({ ok: false, error: "Player not found" }, request, { status: 404 });
    }
    return jsonResponse({ ok: true, player: toPlayerDto(player) }, request);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse({ ok: false, error: "Invalid request", issues: err.issues }, request, { status: 400 });
    }
    throw err;
  }
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;
  try {
    return await handleGet(request, auth);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[player/me GET]", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, request, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;
  try {
    return await handlePost(request, auth);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[player/me POST]", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, request, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
}
