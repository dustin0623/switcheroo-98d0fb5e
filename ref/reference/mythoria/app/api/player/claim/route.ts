import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getWallet } from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { connectDatabase } from "@/lib/config/database";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { computeCurrentClaims, computeCurrentScrap } from "@/features/game-store/formulas/mining";

function getDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected");
  return db;
}

export async function POST(req: NextRequest) {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  await connectDatabase();
  const { findPlayer } = await import("@/lib/modules/players/repository.server");
  const player = await findPlayer(wallet);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);
  // Use the canonical wallet address from the DB for all update operations
  const playerWallet = player.wallet;

  const nowMs = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { current: claimsAvail, newLastclaim } = computeCurrentClaims(player as any, nowMs);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qty = computeCurrentScrap(player as any, nowMs);

  // Write rejected log and 409 if no claims available
  if (claimsAvail <= 0 || qty <= 0) {
    const db = getDb();
    await db.collection("claims").insertOne({
      wallet: playerWallet,
      qty: "0",
      status: "rejected",
      time: nowMs,
    });
    return apiError("No claim available", "CLAIM_UNAVAILABLE", 409);
  }

  // Optimistic update with version check
  // Claim converts accumulated unclaimedAether → liquid aether balance
  const result = await PlayerModel.findOneAndUpdate(
    { wallet: playerWallet, version: player.version },
    {
      $set: { unclaimedAether: 0, cooldown: nowMs, lastclaim: newLastclaim },
      $inc: { claims: -1, aether: qty, version: 1 },
    },
    { new: true },
  );

  if (!result) {
    return apiError("Concurrent modification — please retry", "CONFLICT", 409);
  }

  // Write success log
  const db = getDb();
  await db.collection("claims").insertOne({
    wallet: playerWallet,
    qty: qty.toFixed(8),
    status: "success",
    time: nowMs,
  });

  return apiOk({ qty });
}
