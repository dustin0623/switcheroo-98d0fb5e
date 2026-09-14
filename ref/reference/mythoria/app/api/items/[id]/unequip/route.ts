import { NextRequest } from "next/server";
import { getWallet } from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { connectDatabase } from "@/lib/config/database";
import { ItemModel } from "@/lib/modules/items/model.server";
import { PlayerModel } from "@/lib/modules/players/model.server";

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
  if (!item.equiped)         return apiError("Item is not equipped", "BAD_REQUEST", 400);

  const slot = item.type as string;

  await Promise.all([
    ItemModel.updateOne(
      { item_number: itemNumber, owner: wallet },
      { $set: { equiped: false }, $inc: { version: 1 } },
    ),
    PlayerModel.updateOne(
      { wallet },
      { $unset: { [`items.${slot}`]: "" }, $inc: { version: 1 } },
    ),
  ]);

  return apiOk({ slot, item_number: itemNumber });
}
