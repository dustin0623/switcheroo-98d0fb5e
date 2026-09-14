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
import { ItemModel } from "@/lib/modules/items/model.server";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { enchantCost, enchantAttributes } from "@/features/game-store/formulas/crates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  const itemNumber = parseInt(id, 10);
  if (isNaN(itemNumber)) return apiError("Invalid item number", "BAD_REQUEST", 400);

  await connectDatabase();
  const [item, player] = await Promise.all([
    ItemModel.findOne({ item_number: itemNumber }).lean(),
    PlayerModel.findOne({ wallet }).lean(),
  ]);

  if (!item)            return apiError("Item not found", "NOT_FOUND", 404);
  if (item.owner !== wallet) return apiError("Not your item", "FORBIDDEN", 403);
  if (item.salvaged)    return apiError("Item is salvaged", "FORBIDDEN", 403);
  if (!player)          return apiError("Player not found", "NOT_FOUND", 404);

  const cost = enchantCost(item as never);
  if ((player.essence ?? 0) < cost) {
    return apiError(`Insufficient essence — need ${cost.toFixed(3)}`, "INSUFFICIENT_FUNDS", 402);
  }

  // Snapshot before upgrade
  const snapshot = { ...item };

  const newAttrs = enchantAttributes(item.attributes as never);
  const nowMs = Date.now();

  const [updatedItem] = await Promise.all([
    ItemModel.findOneAndUpdate(
      { item_number: itemNumber, owner: wallet },
      {
        $set: { attributes: newAttrs, level: (item.level ?? 1) + 1 },
        $inc: { version: 1 },
      },
      { new: true },
    ),
    PlayerModel.updateOne(
      { wallet, version: player.version, essence: { $gte: cost } },
      { $inc: { essence: -cost, version: 1 } },
    ),
  ]);

  if (!updatedItem) {
    return apiError("Concurrent modification — please retry", "CONFLICT", 409);
  }

  // Write forge-log
  const db = getDb();
  await db.collection("forge-log").insertOne({
    wallet,
    item: snapshot,
    essence: cost.toFixed(3),
    time: nowMs,
  });

  return apiOk({ item: updatedItem, essence: cost });
}
