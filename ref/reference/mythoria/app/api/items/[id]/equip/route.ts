import { NextRequest } from "next/server";
import { getWallet } from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { connectDatabase } from "@/lib/config/database";
import { ItemModel } from "@/lib/modules/items/model.server";
import { PlayerModel } from "@/lib/modules/players/model.server";

const VALID_SLOTS = ["weapon", "armor", "mount", "accessory", "avatar"] as const;
type Slot = (typeof VALID_SLOTS)[number];

// Map legacy "artifact" to new "accessory" slot
function normalizeSlot(itemType: string): Slot | null {
  if (itemType === "artifact") return "accessory";
  if (VALID_SLOTS.includes(itemType as Slot)) return itemType as Slot;
  return null;
}

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
  const { findPlayer } = await import("@/lib/modules/players/repository.server");
  const [item, player] = await Promise.all([
    ItemModel.findOne({ item_number: itemNumber }).lean(),
    findPlayer(wallet),
  ]);

  const playerWallet = player?.wallet ?? wallet;
  if (!item)                        return apiError("Item not found", "NOT_FOUND", 404);
  if (item.owner !== playerWallet)  return apiError("Not your item", "FORBIDDEN", 403);
  if (item.salvaged)         return apiError("Item is salvaged", "FORBIDDEN", 403);
  if (item.burnt)            return apiError("Item is burnt", "FORBIDDEN", 403);
  if (item.market?.listed)   return apiError("Delist the item before equipping", "FORBIDDEN", 403);
  if (!player)               return apiError("Player not found", "NOT_FOUND", 404);

  const slot = normalizeSlot(item.type);
  if (!slot) return apiError("Invalid item type for slot", "BAD_REQUEST", 400);

  // Unequip whichever item currently occupies this slot
  const currentEquipped = player?.items?.[slot];
  if (currentEquipped?.item_number && currentEquipped.item_number !== itemNumber) {
    await ItemModel.updateOne(
      { item_number: currentEquipped.item_number, owner: playerWallet },
      { $set: { equiped: false }, $inc: { version: 1 } },
    );
  }

  // Equip the new item and write player slot
  const slotData = {
    item_number: item.item_number,
    item_id: item.id,
    item_equipped: true,
    rarity: item.rarity,
    level: item.level ?? 1,
    attributes: item.attributes,
  };

  await Promise.all([
    ItemModel.updateOne(
      { item_number: itemNumber, owner: playerWallet },
      { $set: { equiped: true }, $inc: { version: 1 } },
    ),
    PlayerModel.updateOne(
      { wallet: playerWallet },
      { $set: { [`items.${slot}`]: slotData }, $inc: { version: 1 } },
    ),
  ]);

  return apiOk({ slot, item_number: itemNumber });
}
