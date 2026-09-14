import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getWallet } from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { connectDatabase } from "@/lib/config/database";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { ConsumableModel } from "@/lib/modules/consumables/model.server";
import { CrateModel } from "@/lib/modules/crates/model.server";
import { RelicModel } from "@/lib/modules/relics/model.server";
import type { IRelic } from "@/lib/modules/relics/types.server";
import { applyXp } from "@/features/game-store/formulas/xp";
import { createSeed, rngFloat, rngInt } from "@/features/game-store/rng";
import type { Rarity } from "@/features/types";

function getDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected");
  return db;
}

const BOSS_XP = 100;
const BOSS_COOLDOWN_MS = 4 * 3_600_000;

const PLANETS: Record<string, {
  essence: number;
  consumableThreshold: number;
  rarityThresholds: number[];
}> = {
  Mythoria:  { essence: 1, consumableThreshold: 900, rarityThresholds: [950, 985, 995, 1000] },
  Oceana:     { essence: 2, consumableThreshold: 750, rarityThresholds: [949, 983, 993, 1000] },
  Celestia:   { essence: 2, consumableThreshold: 750, rarityThresholds: [948, 982, 992, 1000] },
  Arborealis: { essence: 2, consumableThreshold: 500, rarityThresholds: [947.5, 981, 991, 1000] },
  Neptolith:  { essence: 2, consumableThreshold: 750, rarityThresholds: [947, 980.5, 990.5, 1000] },
  Solisar:    { essence: 2, consumableThreshold: 750, rarityThresholds: [930, 975, 993, 1000] },
};

const RARITIES: Rarity[] = ["uncommon", "rare", "epic", "legendary"];
const UNCOMMON_CONSUMABLES = ["attack", "claim", "crit", "damage", "dodge"];
const RARE_CONSUMABLES     = ["rage", "impenetrable", "overload", "rogue", "battle", "fury"];
const EPIC_CONSUMABLES     = ["protection", "focus"];

export async function POST(req: NextRequest) {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json().catch(() => ({}));
  const planet: string | undefined = body.planet;
  if (!planet) return apiError("Missing planet", "BAD_REQUEST", 400);

  const cfg = PLANETS[planet];
  if (!cfg) return apiError("Unknown planet", "BAD_REQUEST", 400);

  await connectDatabase();
  const { findPlayer } = await import("@/lib/modules/players/repository.server");
  const player = await findPlayer(wallet);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);
  const playerWallet = player.wallet;

  const bossIdx = (player.boss_data ?? []).findIndex(
    (b: { name: string }) => b.name === planet,
  );
  if (bossIdx === -1) return apiError("Planet locked", "FORBIDDEN", 403);

  const bossEntry = player.boss_data![bossIdx];
  const nowMs = Date.now();

  if (nowMs - (bossEntry.lastBattle ?? 0) < BOSS_COOLDOWN_MS) {
    return apiError("Boss on cooldown", "COOLDOWN", 429);
  }
  if ((player.essence ?? 0) < cfg.essence) {
    return apiError("Not enough essence", "INSUFFICIENT_ESSENCE", 402);
  }

  // Server RNG
  const seed = createSeed(nowMs, `${wallet}-${planet}`, "boss");
  const luck = player.stats?.luck ?? 0;
  const roll = rngFloat(seed + "-boss") * 100;
  const hit  = roll <= luck;

  const { level, experience } = applyXp(
    { level: player.level ?? 1, experience: player.experience ?? 0 },
    BOSS_XP,
  );

  await PlayerModel.updateOne(
    { wallet: playerWallet },
    {
      $inc: { essence: -cfg.essence, version: 1 },
      $set: {
        [`boss_data.${bossIdx}.lastBattle`]: nowMs,
        level,
        experience,
      },
    },
  );

  const db = getDb();

  if (!hit) {
    // Miss → drop a relic
    const luckMod = planet === "Mythoria" ? luck / 10 : luck / 5;
    const roll2 = rngFloat(seed + "-relic") * 100;
    let rarity: string;
    let amount: number;
    if      (roll2 <= 70) { rarity = "common";    amount = Math.max(rngFloat(seed + "-amt") * 1.25 * luckMod + 1, 0.1); }
    else if (roll2 <= 90) { rarity = "uncommon";  amount = Math.max(rngFloat(seed + "-amt") * 1.00 * luckMod + 1, 0.1); }
    else if (roll2 <= 98) { rarity = "rare";      amount = Math.max(rngFloat(seed + "-amt") * 0.75 * luckMod + 1, 0.1); }
    else if (roll2 <= 99) { rarity = "epic";      amount = Math.max(rngFloat(seed + "-amt") * 0.50 * luckMod + 1, 0.1); }
    else                  { rarity = "legendary"; amount = Math.max(0.1 * luckMod, 0.1); }
    amount = parseFloat(amount.toFixed(3));

    const relicType = rarity.toUpperCase() as IRelic["type"];
    await RelicModel.updateOne(
      { wallet: playerWallet, type: relicType },
      { $inc: { amount }, $setOnInsert: { wallet: playerWallet, type: relicType, version: 1 } },
      { upsert: true },
    );

    await db.collection("boss-log").insertOne({ wallet: playerWallet, planet, result: "miss", roll, luck, rarity, drop: `${rarity} relic`, amount, time: nowMs });
    await db.collection("nft-drops").insertOne({ name: `${rarity} relic`, rarity, owner: playerWallet, amount, time: nowMs });

    return apiOk({ result: "miss", drop: `${rarity} relic`, rarity, amount });
  }

  // Hit → consumable, crate
  const crateSeed  = seed + "-crate";
  const rarityRoll = Math.floor(rngFloat(crateSeed + "r") * 1001);
  const dropRoll   = Math.floor(rngFloat(crateSeed + "d") * 1001);

  let rarity: Rarity = "uncommon";
  for (let i = 0; i < cfg.rarityThresholds.length; i++) {
    if (rarityRoll <= cfg.rarityThresholds[i]) { rarity = RARITIES[i]; break; }
  }

  let drop: string;
  if (dropRoll <= cfg.consumableThreshold) {
    const pool = rarity === "uncommon" ? UNCOMMON_CONSUMABLES
               : rarity === "rare"     ? RARE_CONSUMABLES
               :                         EPIC_CONSUMABLES;
    const type = pool[rngInt(crateSeed + "c", pool.length)];
    await ConsumableModel.updateOne(
      { wallet: playerWallet, type },
      { $inc: { amount: 1 }, $setOnInsert: { wallet: playerWallet, type, version: 1 } },
      { upsert: true },
    );
    drop = `${type} consumable`;
  } else {
    await CrateModel.create({ rarity, owner: playerWallet, acquired: nowMs });
    drop = `${rarity} crate`;
  }

  await db.collection("boss-log").insertOne({ wallet: playerWallet, planet, result: "hit", roll, luck, rarity, drop, time: nowMs });
  await db.collection("nft-drops").insertOne({ name: drop, rarity, owner: playerWallet, time: nowMs });

  return apiOk({ result: "hit", drop, rarity });
}
