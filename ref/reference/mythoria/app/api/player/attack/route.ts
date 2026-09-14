import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getWallet } from "@/lib/api/get-wallet";

function getDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected");
  return db;
}
import { apiError, apiOk } from "@/lib/api/error-response";
import { connectDatabase } from "@/lib/config/database";
import { PlayerModel } from "@/lib/modules/players/model.server";
import {
  canAttack,
  checkDodge,
  computeCurrentAttacks,
  rollAttack,
} from "@/features/game-store/formulas/combat";
import { computeCurrentScrap } from "@/features/game-store/formulas/mining";

export async function POST(req: NextRequest) {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json().catch(() => ({}));
  const target: string | undefined = body.target;
  if (!target) return apiError("Missing target", "BAD_REQUEST", 400);
  if (target === wallet) return apiError("Cannot attack yourself", "BAD_REQUEST", 400);

  await connectDatabase();
  // getWallet returns username; findPlayer resolves username-or-wallet to the doc
  const { findPlayer } = await import("@/lib/modules/players/repository.server");
  const [attacker, defender] = await Promise.all([
    findPlayer(wallet),
    findPlayer(target),
  ]);

  if (!attacker) return apiError("Attacker not found", "NOT_FOUND", 404);
  if (!defender) return apiError("Target not found", "NOT_FOUND", 404);

  const nowMs = Date.now();
  const prereq = canAttack(attacker as never, defender as never, nowMs);
  if (!prereq.ok) return apiError(prereq.reason ?? "Cannot attack", "FORBIDDEN", 403);

  // Server RNG — never trust client-supplied seed
  const seed = crypto.randomUUID();

  const { current: attacksLeft, newLastregen } = computeCurrentAttacks(attacker as never, nowMs);
  const dodged = checkDodge(defender as never, seed);

  const attackerWallet = attacker.wallet;
  const defenderWallet = defender.wallet;

  if (dodged) {
    await PlayerModel.findOneAndUpdate(
      { wallet: attackerWallet, version: attacker.version },
      {
        $set: { lastBattle: nowMs, lastRewardTime: newLastregen },
        $inc: { attacks: attacksLeft - 1 - (attacker.attacks ?? 0), version: 1 },
      },
    );
    const db = getDb();
    await db.collection("battle_logs").insertOne({
      wallet: attackerWallet,
      attacked: defenderWallet,
      scrap: 0,
      seed,
      roll: 0,
      dodged: true,
      reason: "dodge",
      timestamp: nowMs,
    });
    return apiOk({ dodged: true, scrap: 0 });
  }

  const targetScrap = computeCurrentScrap(defender as never, nowMs);
  const attackerScrap = computeCurrentScrap(attacker as never, nowMs);
  const stashSize = (attacker.staked ?? 0) + 1;
  const roll = rollAttack(attacker as never, seed);
  let stolen = (roll / 100) * targetScrap;
  if (stolen > targetScrap) stolen = targetScrap;
  if (attackerScrap + stolen > stashSize) stolen = Math.max(0, stashSize - attackerScrap);

  // Atomic updates with version check on attacker
  const [updatedAttacker] = await Promise.all([
    PlayerModel.findOneAndUpdate(
      { wallet: attackerWallet, version: attacker.version },
      {
        $set: { lastBattle: nowMs, cooldown: nowMs, lastRewardTime: newLastregen },
        $inc: { unclaimedAether: stolen, attacks: attacksLeft - 1 - (attacker.attacks ?? 0), version: 1 },
      },
      { new: true },
    ),
    PlayerModel.findOneAndUpdate(
      { wallet: defenderWallet, version: defender.version },
      {
        $set: { lastBattle: nowMs, cooldown: nowMs },
        $inc: { unclaimedAether: -stolen, version: 1 },
      },
    ),
  ]);

  if (!updatedAttacker) {
    return apiError("Concurrent modification — please retry", "CONFLICT", 409);
  }

  const db = getDb();
  await db.collection("battle_logs").insertOne({
    wallet: attackerWallet,
    attacked: defenderWallet,
    scrap: stolen,
    seed,
    roll,
    dodged: false,
    reason: null,
    timestamp: nowMs,
  });

  return apiOk({ dodged: false, scrap: stolen });
}
