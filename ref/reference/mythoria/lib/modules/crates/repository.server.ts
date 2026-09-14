import { CrateModel } from "./model.server";
import type { ICrate } from "./types.server";
import type { Rarity } from "@/lib/modules/items/types.server";
import { connectDatabase } from "@/lib/config/database";

export async function findCratesByOwner(owner: string): Promise<ICrate[]> {
  await connectDatabase();
  return CrateModel.find({ owner }).lean<ICrate[]>();
}

export async function findListedCrates(limit = 50, skip = 0): Promise<ICrate[]> {
  await connectDatabase();
  return CrateModel.find({ "market.listed": true })
    .sort({ "market.created": -1 })
    .skip(skip)
    .limit(limit)
    .lean<ICrate[]>();
}

export async function mintCrates(
  owner: string, rarity: Rarity, count: number
): Promise<ICrate[]> {
  await connectDatabase();
  const docs = Array.from({ length: count }, () => ({
    rarity, owner, acquired: Date.now(),
    market: { listed: false, price: 0, seller: null, created: 0, expires: 0, sold: 0 },
  }));
  return CrateModel.insertMany(docs) as unknown as ICrate[];
}

export async function consumeCrate(
  owner: string, rarity: Rarity
): Promise<ICrate | null> {
  await connectDatabase();
  return CrateModel.findOneAndDelete({ owner, rarity, "market.listed": false });
}

export async function listCrate(
  crateId: string, seller: string, price: number,
): Promise<{ ok: boolean; error?: string }> {
  await connectDatabase();
  const result = await CrateModel.updateOne(
    { _id: crateId, owner: seller, "market.listed": false },
    { $set: { "market.listed": true, "market.price": price, "market.seller": seller, "market.created": Date.now() } },
  );
  if (result.modifiedCount === 0) return { ok: false, error: "Crate not found or already listed" };
  return { ok: true };
}

export async function delistCrate(
  crateId: string, seller: string,
): Promise<{ ok: boolean; error?: string }> {
  await connectDatabase();
  const result = await CrateModel.updateOne(
    { _id: crateId, owner: seller, "market.listed": true },
    { $set: { "market.listed": false, "market.price": 0, "market.seller": null, "market.created": 0 } },
  );
  if (result.modifiedCount === 0) return { ok: false, error: "Crate not found or not listed by this seller" };
  return { ok: true };
}

export async function purchaseCrate(
  crateId: string, buyer: string, expectedSeller: string, expectedPrice: number,
): Promise<{ ok: boolean; error?: string }> {
  await connectDatabase();
  const result = await CrateModel.updateOne(
    { _id: crateId, "market.listed": true, "market.seller": expectedSeller, "market.price": expectedPrice },
    { $set: { owner: buyer, "market.listed": false, "market.price": 0, "market.seller": null, "market.sold": Date.now() } },
  );
  if (result.modifiedCount === 0) return { ok: false, error: "Crate not available" };
  return { ok: true };
}
