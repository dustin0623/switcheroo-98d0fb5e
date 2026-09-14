// src/lib/modules/players/repository.server.ts
import { PlayerModel } from "./model.server";
import type { IPlayer } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

export async function upsertPlayer(input: { wallet: string; username: string }) {
  await connectDatabase();
  return PlayerModel.findOneAndUpdate(
    { wallet: input.wallet },
    {
      $setOnInsert: {
        wallet:   input.wallet,
        username: input.username,
        registrationTime: Date.now(),
      },
    },
    { upsert: true, new: true }
  );
}

export async function findPlayerByWallet(wallet: string) {
  await connectDatabase();
  return PlayerModel.findOne({ wallet }).lean<IPlayer>();
}

export async function findPlayerByUsername(username: string) {
  await connectDatabase();
  return PlayerModel.findOne({ username }).lean<IPlayer>();
}

export async function findPlayer(identifier: string) {
  await connectDatabase();
  return (
    (await PlayerModel.findOne({ username: identifier }).lean<IPlayer>()) ??
    (await PlayerModel.findOne({ wallet: identifier }).lean<IPlayer>())
  );
}

export async function creditHash(wallet: string, amount: number): Promise<void> {
  await connectDatabase();
  await PlayerModel.updateOne({ wallet }, { $inc: { hash: amount } });
}

export async function debitHash(wallet: string, amount: number): Promise<{ ok: boolean }> {
  await connectDatabase();
  const result = await PlayerModel.updateOne(
    { wallet, hash: { $gte: amount } },
    { $inc: { hash: -amount } }
  );
  return { ok: result.modifiedCount > 0 };
}

export async function creditSparks(wallet: string, amount: number): Promise<void> {
  await connectDatabase();
  await PlayerModel.updateOne({ wallet }, { $inc: { sparks: amount } });
}

export async function debitSparks(wallet: string, amount: number): Promise<{ ok: boolean }> {
  await connectDatabase();
  const result = await PlayerModel.updateOne(
    { wallet, sparks: { $gte: amount } },
    { $inc: { sparks: -amount } }
  );
  return { ok: result.modifiedCount > 0 };
}

export async function updatePlayer(wallet: string, update: Partial<IPlayer> | Record<string, unknown>) {
  await connectDatabase();
  const raw = update as Record<string, unknown>;
  const usesOperators = Object.keys(raw).some((key) => key.startsWith("$"));

  if (usesOperators) {
    // Caller passed a Mongo update document ({ $inc, $set, ... }) — pass through.
    return PlayerModel.updateOne({ wallet }, raw);
  }

  // Plain object: strip immutable/internal fields so passing a whole lean
  // document (e.g. from findPlayerByWallet) doesn't fail on _id.
  const {
    _id: _ignoredId,
    __v: _ignoredV,
    wallet: _ignoredWallet,
    createdAt: _ignoredCreatedAt,
    updatedAt: _ignoredUpdatedAt,
    ...safe
  } = raw;

  return PlayerModel.updateOne({ wallet }, { $set: safe });
}

export async function incrementPlayer(wallet: string, inc: Record<string, number>) {
  await connectDatabase();
  return PlayerModel.updateOne({ wallet }, { $inc: inc });
}
