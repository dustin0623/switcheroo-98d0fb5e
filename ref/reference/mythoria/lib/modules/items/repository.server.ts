import { ItemModel } from "./model.server";
import type { IItem } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

export async function findItemByNumber(item_number: number): Promise<IItem | null> {
  await connectDatabase();
  return ItemModel.findOne({ item_number }).lean<IItem>();
}

export async function findItemsByOwner(owner: string): Promise<IItem[]> {
  await connectDatabase();
  return ItemModel.find({ owner, burnt: { $ne: true } }).lean<IItem[]>();
}

export async function findListedItems(
  limit = 50, skip = 0
): Promise<IItem[]> {
  await connectDatabase();
  return ItemModel.find({ "market.listed": true, salvaged: { $ne: true }, burnt: { $ne: true } })
    .sort({ "market.created": -1 })
    .skip(skip)
    .limit(limit)
    .lean<IItem[]>();
}

export async function listItem(
  item_number: number,
  seller: string,
  price: number,
): Promise<{ ok: boolean; error?: string }> {
  await connectDatabase();
  const result = await ItemModel.updateOne(
    { item_number, owner: seller, "market.listed": false, equiped: false, salvaged: { $ne: true }, burnt: { $ne: true } },
    { $set: { "market.listed": true, "market.price": price, "market.seller": seller, "market.created": Date.now() } },
  );
  if (result.modifiedCount === 0) return { ok: false, error: "Item not found, already listed, or cannot be listed" };
  return { ok: true };
}

export async function delistItem(
  item_number: number,
  seller: string,
): Promise<{ ok: boolean; error?: string }> {
  await connectDatabase();
  const result = await ItemModel.updateOne(
    { item_number, owner: seller, "market.listed": true },
    { $set: { "market.listed": false, "market.price": 0, "market.seller": null, "market.created": 0 } },
  );
  if (result.modifiedCount === 0) return { ok: false, error: "Item not found or not listed by this seller" };
  return { ok: true };
}

export async function purchaseItem(
  item_number: number,
  buyer: string,
  expectedSeller: string,
  expectedPrice: number,
): Promise<{ ok: boolean; seller?: string; price?: number; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ item_number });
  if (!item) return { ok: false, error: "Item not found" };
  if (!item.market.listed) return { ok: false, error: "Item not listed" };
  if (item.market.seller !== expectedSeller) return { ok: false, error: "Seller mismatch" };
  if (item.market.price !== expectedPrice)   return { ok: false, error: "Price mismatch" };
  if (item.equiped) return { ok: false, error: "Item is equipped" };
  if (item.lastTransfer && Date.now() - item.lastTransfer < 86_400_000) {
    return { ok: false, error: "Item is on a 24h transfer cooldown" };
  }
  const result = await ItemModel.updateOne(
    { item_number, "market.listed": true, owner: expectedSeller },
    { $set: { owner: buyer, lastTransfer: Date.now(), market: { listed: false, seller: null, price: 0, sold: Date.now(), expires: 0, created: 0 } }, $inc: { version: 1 } },
  );
  if (result.modifiedCount === 0) return { ok: false, error: "Concurrent purchase — item no longer available" };
  return { ok: true, seller: item.market.seller ?? undefined, price: item.market.price };
}

export async function salvageItem(
  item_number: number,
  owner: string,
): Promise<{ ok: boolean; item?: IItem; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ item_number, owner });
  if (!item)               return { ok: false, error: "Item not found or wrong owner" };
  if (item.equiped)        return { ok: false, error: "Item is equipped" };
  if (item.market.listed)  return { ok: false, error: "Item is listed on market" };
  if (item.salvaged)       return { ok: false, error: "Already salvaged" };
  await ItemModel.updateOne(
    { item_number },
    { $set: { salvaged: true, equiped: false, owner: null, market: { listed: false, price: 0, seller: null, created: 0, expires: 0, sold: 0 } } },
  );
  return { ok: true, item };
}

export async function equipItem(
  item_number: number,
  owner: string,
): Promise<{ ok: boolean; item?: IItem; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ item_number, owner });
  if (!item)              return { ok: false, error: "Item not found or wrong owner" };
  if (item.salvaged)      return { ok: false, error: "Item is salvaged" };
  if (item.market.listed) return { ok: false, error: "Item is listed on market" };
  await ItemModel.updateOne({ item_number }, { $set: { equiped: true }, $inc: { version: 1 } });
  item.equiped = true;
  return { ok: true, item };
}

export async function unequipItem(
  item_number: number,
  owner: string,
): Promise<{ ok: boolean; item?: IItem; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ item_number, owner });
  if (!item) return { ok: false, error: "Item not found or wrong owner" };
  await ItemModel.updateOne({ item_number }, { $set: { equiped: false }, $inc: { version: 1 } });
  item.equiped = false;
  return { ok: true, item };
}
