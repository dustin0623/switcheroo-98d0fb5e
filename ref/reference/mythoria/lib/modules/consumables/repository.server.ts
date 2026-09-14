import { ConsumableModel } from "./model.server";
import type { IConsumable } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

export async function findConsumablesByWallet(wallet: string): Promise<IConsumable[]> {
  await connectDatabase();
  return ConsumableModel.find({ wallet, amount: { $gt: 0 } }).lean<IConsumable[]>();
}

export async function findListedConsumables(limit = 50, skip = 0): Promise<IConsumable[]> {
  await connectDatabase();
  return ConsumableModel.find({ "market.listed": true, "market.amount": { $gt: 0 } })
    .sort({ "market.created": -1 })
    .skip(skip)
    .limit(limit)
    .lean<IConsumable[]>();
}

export async function upsertConsumable(
  wallet: string, type: string, delta: number
): Promise<void> {
  await connectDatabase();
  await ConsumableModel.updateOne(
    { wallet, type },
    { $inc: { amount: delta, version: 1 } },
    { upsert: true },
  );
}

export async function listConsumable(
  wallet: string, type: string, amount: number, price: number,
): Promise<{ ok: boolean; error?: string }> {
  await connectDatabase();
  const doc = await ConsumableModel.findOne({ wallet, type, amount: { $gte: amount } });
  if (!doc) return { ok: false, error: "Consumable not found or insufficient amount" };
  const newAmount = doc.market.listed ? Math.min(doc.market.amount + amount, doc.amount) : amount;
  await ConsumableModel.updateOne(
    { wallet, type },
    { $set: { "market.listed": true, "market.amount": newAmount, "market.price": price,
               "market.seller": wallet, "market.created": Date.now() } },
  );
  return { ok: true };
}

export async function delistConsumable(
  wallet: string, type: string,
): Promise<{ ok: boolean; error?: string }> {
  await connectDatabase();
  const result = await ConsumableModel.updateOne(
    { wallet, type, "market.listed": true },
    { $set: { "market.listed": false, "market.amount": 0, "market.price": 0, "market.seller": null, "market.created": 0 } },
  );
  if (result.modifiedCount === 0) return { ok: false, error: "Not listed" };
  return { ok: true };
}

export async function purchaseConsumable(
  seller: string, type: string, qty: number, buyer: string,
): Promise<{ ok: boolean; price?: number; error?: string }> {
  await connectDatabase();
  const doc = await ConsumableModel.findOne({ wallet: seller, type, "market.listed": true });
  if (!doc)                       return { ok: false, error: "Consumable not found" };
  if (doc.market.amount < qty)    return { ok: false, error: "Not enough listed amount" };
  if (doc.amount < qty)           return { ok: false, error: "Seller no longer holds enough" };

  const remaining = doc.market.amount - qty;
  await ConsumableModel.updateOne(
    { wallet: seller, type },
    remaining > 0
      ? { $inc: { amount: -qty }, $set: { "market.amount": remaining } }
      : { $inc: { amount: -qty }, $set: { "market.listed": false, "market.amount": 0, "market.price": 0, "market.seller": null } },
  );
  await ConsumableModel.updateOne(
    { wallet: buyer, type },
    { $inc: { amount: qty, version: 1 } },
    { upsert: true },
  );
  return { ok: true, price: doc.market.price };
}
