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
import { dismantleValue } from "@/features/game-store/formulas/crates";

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
  const item = await ItemModel.findOne({ item_number: itemNumber }).lean();

  if (!item)                 return apiError("Item not found", "NOT_FOUND", 404);
  if (item.owner !== wallet) return apiError("Not your item", "FORBIDDEN", 403);
  if (item.equiped)          return apiError("Unequip the item first", "FORBIDDEN", 403);
  if (item.market?.listed)   return apiError("Delist the item first", "FORBIDDEN", 403);
  if (item.salvaged)         return apiError("Already salvaged", "FORBIDDEN", 403);

  const value = dismantleValue(item.attributes as never);
  const nowMs = Date.now();

  await Promise.all([
    ItemModel.updateOne(
      { item_number: itemNumber, owner: wallet },
      {
        $set: {
          salvaged: true,
          equiped: false,
          owner: null,
          "market.listed": false,
          "market.price": 0,
          "market.seller": null,
        },
      },
    ),
    PlayerModel.updateOne(
      { wallet },
      { $inc: { scrap: value, version: 1 } },
    ),
  ]);

  // Write salvage-log
  const db = getDb();
  await db.collection("salvage-log").insertOne({
    wallet,
    item_number: itemNumber,
    value,
    time: nowMs,
  });

  return apiOk({ item_number: itemNumber, value });
}
