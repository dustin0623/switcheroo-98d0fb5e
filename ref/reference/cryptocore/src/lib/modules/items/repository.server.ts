// src/lib/modules/items/repository.server.ts
import { ItemModel } from "./model.server";
import type { IItem, ItemInput } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

export async function findItemByNumber(itemNumber: number): Promise<IItem | null> {
  await connectDatabase();
  return ItemModel.findOne({ itemNumber }).lean<IItem>();
}

export async function findItemsByNumbers(itemNumbers: number[]): Promise<IItem[]> {
  await connectDatabase();
  if (itemNumbers.length === 0) return [];
  return ItemModel.find({ itemNumber: { $in: itemNumbers } }).lean<IItem[]>();
}

export async function findItemsByOwner(owner: string): Promise<IItem[]> {
  await connectDatabase();
  return ItemModel.find({ owner, salvaged: { $ne: true } }).lean<IItem[]>();
}

export async function findEquippedItems(owner: string): Promise<IItem[]> {
  await connectDatabase();
  return ItemModel.find({ owner, equipped: true, salvaged: { $ne: true } }).lean<IItem[]>();
}

export async function insertItem(input: ItemInput): Promise<IItem> {
  await connectDatabase();
  return ItemModel.create(input);
}

export async function mintNextItemNumber(): Promise<number> {
  await connectDatabase();
  const last = await ItemModel.findOne().sort({ itemNumber: -1 }).select("itemNumber").lean<{ itemNumber: number }>();
  return (last?.itemNumber ?? 0) + 1;
}

export async function equipItem(itemNumber: number, owner: string): Promise<{ ok: boolean; item?: IItem; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ itemNumber, owner });
  if (!item) return { ok: false, error: "Item not found or wrong owner" };
  if (item.salvaged) return { ok: false, error: "Item is salvaged" };

  // Unequip any other item in the same slot first.
  await ItemModel.updateMany(
    { owner, slot: item.slot, equipped: true },
    { $set: { equipped: false } }
  );

  item.equipped = true;
  await item.save();
  return { ok: true, item: item.toObject() };
}

export async function unequipItem(itemNumber: number, owner: string): Promise<{ ok: boolean; item?: IItem; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ itemNumber, owner });
  if (!item) return { ok: false, error: "Item not found or wrong owner" };
  item.equipped = false;
  await item.save();
  return { ok: true, item: item.toObject() };
}

export async function salvageItem(itemNumber: number, owner: string): Promise<{ ok: boolean; item?: IItem; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ itemNumber, owner });
  if (!item) return { ok: false, error: "Item not found or wrong owner" };
  if (item.equipped) return { ok: false, error: "Item is equipped" };
  if (item.salvaged) return { ok: false, error: "Already salvaged" };
  item.salvaged = true;
  item.equipped = false;
  item.owner = null;
  await item.save();
  return { ok: true, item: item.toObject() };
}

export async function upgradeItem(itemNumber: number, owner: string): Promise<{ ok: boolean; item?: IItem; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ itemNumber, owner });
  if (!item) return { ok: false, error: "Item not found or wrong owner" };
  item.level += 1;
  await item.save();
  return { ok: true, item: item.toObject() };
}

export async function transferOwnership(itemNumber: number, from: string, to: string): Promise<{ ok: boolean; item?: IItem; error?: string }> {
  await connectDatabase();
  const item = await ItemModel.findOne({ itemNumber, owner: from });
  if (!item) return { ok: false, error: "Item not found or wrong owner" };
  item.owner = to;
  item.equipped = false;
  item.lastTransfer = Date.now();
  await item.save();
  return { ok: true, item: item.toObject() };
}
