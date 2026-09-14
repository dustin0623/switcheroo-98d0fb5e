// lib/modules/players/repository.server.ts
// Server-only. All player business logic lives here — route handlers stay thin.
import { PlayerModel } from "./model.server";
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
  return PlayerModel.findOne({ wallet }).lean();
}

/**
 * Finds a player by their short game username (display name).
 * Used by authenticated API routes where getWallet() returns the username
 * stored in the JWT — not the raw wallet address.
 */
export async function findPlayerByUsername(username: string) {
  await connectDatabase();
  return PlayerModel.findOne({ username }).lean();
}

/**
 * Finds a player by username first, then falls back to wallet address.
 * Safe to use for both Hive (where wallet === username) and EVM/Solana chains.
 */
export async function findPlayer(identifier: string) {
  await connectDatabase();
  return (
    (await PlayerModel.findOne({ username: identifier }).lean()) ??
    (await PlayerModel.findOne({ wallet: identifier }).lean())
  );
}

/** Credit liquid $AETHER to a player (e.g. from a claim or reward). */
export async function addAether(wallet: string, amount: number): Promise<void> {
  await connectDatabase();
  await PlayerModel.updateOne({ wallet }, { $inc: { aether: amount } });
}

/** Debit liquid $AETHER from a player. Returns ok:false if insufficient balance. */
export async function deductAether(
  wallet: string,
  amount: number
): Promise<{ ok: boolean }> {
  await connectDatabase();
  const result = await PlayerModel.updateOne(
    { wallet, aether: { $gte: amount } },
    { $inc: { aether: -amount } }
  );
  return { ok: result.modifiedCount > 0 };
}
