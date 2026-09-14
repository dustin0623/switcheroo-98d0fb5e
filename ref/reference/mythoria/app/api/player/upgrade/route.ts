import { NextRequest } from "next/server";
import { getWallet } from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { connectDatabase } from "@/lib/config/database";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { damageCost, defenseCost, arcaneCost } from "@/features/game-store/formulas/upgrades";
import { applyXp } from "@/features/game-store/formulas/xp";

type Kind = "arcane" | "damage" | "guardian";
const VALID_KINDS: Kind[] = ["arcane", "damage", "guardian"];

export async function POST(req: NextRequest) {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json().catch(() => ({}));
  const kind: Kind = body.kind;
  if (!kind || !VALID_KINDS.includes(kind)) {
    return apiError("Invalid kind — must be engineering, damage, or defense", "BAD_REQUEST", 400);
  }

  await connectDatabase();
  const { findPlayer } = await import("@/lib/modules/players/repository.server");
  const player = await findPlayer(wallet);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);
  const playerWallet = player.wallet;

  const currentLevel =
    kind === "arcane" ? (player.arcane ?? 0)
    : kind === "damage" ? (player.damage ?? 0)
    :                     (player.defense ?? 0);

  const cost =
    kind === "arcane" ? arcaneCost(currentLevel)
    : kind === "damage"    ? damageCost(currentLevel)
    :                        defenseCost(currentLevel);

  if ((player.aether ?? 0) < cost) {
    return apiError("Insufficient $AETHER", "INSUFFICIENT_FUNDS", 402);
  }

  const nowMs = Date.now();
  const { level, experience } = applyXp(
    { level: player.level ?? 1, experience: player.experience ?? 0 },
    cost,
  );

  // Build the $inc — kind-specific stat increment + common fields
  const inc: Record<string, number> = {
    aether: -cost,
    experience: 0, // overridden by $set
    version: 1,
  };
  const setFields: Record<string, unknown> = {
    last_upgrade_time: nowMs,
    level,
    experience,
  };

  if (kind === "arcane") inc.arcane = 1;
  else if (kind === "damage") inc.damage = 10;
  else inc.defense = 10;

  const result = await PlayerModel.findOneAndUpdate(
    { wallet: playerWallet, version: player.version, aether: { $gte: cost } },
    { $inc: inc, $set: setFields },
    { new: true },
  );

  if (!result) {
    return apiError("Concurrent modification or insufficient funds — please retry", "CONFLICT", 409);
  }

  return apiOk({ kind, cost, level: result.level });
}
