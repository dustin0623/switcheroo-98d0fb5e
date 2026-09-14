// POST /api/quests/:questId/collect — collect a completed quest
import { NextRequest } from "next/server";
import mongoose, { Types } from "mongoose";
import { getWallet } from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { connectDatabase } from "@/lib/config/database";
import { collectActiveQuest } from "@/lib/modules/active-quests/repository.server";
import { PlayerModel } from "@/lib/modules/players/model.server";

// ── loot reward constants ────────────────────────────────────────────────────
const TIER_XP = { 1: 25, 2: 50, 3: 100, 4: 200, 5: 400 } as Record<number, number>;

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

const AMOUNT_BASE: Record<Rarity, { min: number; max: number }> = {
  common:    { min: 0.01, max: 1.49 },
  uncommon:  { min: 0.01, max: 1.01 },
  rare:      { min: 0.01, max: 0.60 },
  epic:      { min: 0.01, max: 0.37 },
  legendary: { min: 0.01, max: 0.53 },
};

const TIER_SCALE: Record<number, number> = { 1: 0.7, 2: 0.58, 3: 0.48, 4: 0.4, 5: 0.32 };

const BASE_LOOT: Record<string, { r: Rarity; w: number }[]> = {
  combat:  [{ r:"legendary",w:1 },{ r:"epic",w:5 },{ r:"rare",w:20 },{ r:"uncommon",w:38 },{ r:"common",w:36 }],
  salvage: [{ r:"legendary",w:1 },{ r:"epic",w:3 },{ r:"rare",w:12 },{ r:"uncommon",w:43 },{ r:"common",w:41 }],
  stealth: [{ r:"legendary",w:1 },{ r:"epic",w:5 },{ r:"rare",w:18 },{ r:"uncommon",w:39 },{ r:"common",w:37 }],
  fortune: [{ r:"legendary",w:2 },{ r:"epic",w:7 },{ r:"rare",w:20 },{ r:"uncommon",w:36 },{ r:"common",w:35 }],
  defense: [{ r:"legendary",w:1 },{ r:"epic",w:4 },{ r:"rare",w:15 },{ r:"uncommon",w:41 },{ r:"common",w:39 }],
};

const RARITY_ORDER: Rarity[] = ["common","uncommon","rare","epic","legendary"];
const RARITY_BUMP: Record<Rarity,Rarity> = { common:"uncommon", uncommon:"rare", rare:"epic", epic:"legendary", legendary:"legendary" };
const JACKPOT_CHANCE = 0.02;
const INV_FLOOR = 0.3;

type RouteContext = { params: Promise<{ questId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { questId } = await ctx.params;
  if (!questId || !Types.ObjectId.isValid(questId)) {
    return apiError("Invalid questId", "INVALID_ID", 400);
  }

  await connectDatabase();

  // 1. Load + mark collected atomically (ensures completes_at <= now)
  const quest = await collectActiveQuest(new Types.ObjectId(questId), wallet);
  if (!quest) {
    return apiError(
      "Quest not found, not ready, already collected, or wrong wallet",
      "COLLECT_FAILED",
      409
    );
  }

  // 2. Compute reward
  const nowMs = Date.now();
  const seed = `${quest.wallet}-${quest._id.toString()}-${nowMs}`;
  const { relics, xp } = computeRewards(quest, seed);

  // 3. Credit player: relics + XP (relics go to relics collection, XP increments player)
  const db = mongoose.connection.db!;

  for (const [rarity, amount] of Object.entries(relics)) {
    if (!amount || amount <= 0) continue;
    const type = `${rarity}_relics`;
    const existing = await db.collection("relics").findOne({ wallet, type });
    if (existing) {
      await db.collection("relics").updateOne({ wallet, type }, { $inc: { amount } });
    } else {
      await db.collection("relics").insertOne({
        wallet,
        version: 1,
        type,
        amount,
        market: { listed: false, amount: 0, price: 0, seller: null, created: 0, expires: 0, sold: 0 },
      });
    }
  }

  // XP increment + level-up logic (simple: floor(exp / 1000) + 1 up to 100)
  const player = await PlayerModel.findOne({ wallet }).lean();
  if (player) {
    const newExp = (player.experience ?? 0) + xp;
    const newLevel = Math.min(100, Math.floor(newExp / 1000) + 1);
    await PlayerModel.updateOne(
      { wallet },
      { $inc: { experience: xp, version: 1 }, $set: { level: newLevel } }
    );
  }

  // 4. Write quest-log collect entry
  const relicSummary = Object.entries(relics)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([r, v]) => `${r}: ${(v ?? 0).toFixed(2)}`)
    .join(", ");

  await db.collection("quest-log").insertOne({
    wallet,
    action:      "collect",
    quest_type:  quest.quest_type,
    tier:        quest.tier,
    name:        quest.name,
    board_date:  quest.board_date,
    aether_paid: quest.aether_paid ?? quest.mgold_paid,
    rewards:     relics,
    xp,
    time:        new Date(),
  });

  // 5. Daily stats
  const statDate = new Date().toISOString().slice(0, 10);
  await db.collection("stats").updateOne(
    { date: statDate },
    { $inc: { quests_collected: 1 } },
    { upsert: true }
  );

  return apiOk({ relics, xp, summary: relicSummary });
}

// ── reward computation ────────────────────────────────────────────────────────

interface QuestDoc {
  quest_type: string;
  tier: number;
  base_rolls: number;
  effective_primary_stat: number;
  secondary_stat_value: number;
  equipped_item_rarity: string;
  equipped_item_level: number;
  item_attribute_value: number;
}

function computeRewards(quest: QuestDoc, seed: string) {
  const tier = quest.tier;

  // Effective roll (mirrors quest-loot.js)
  const STAT_REQ: Record<number,number> = { 1:10, 2:50, 3:100, 4:200, 5:500 };
  const statReq = STAT_REQ[tier] ?? 10;
  const statMod = Math.max(0, Math.min((quest.effective_primary_stat - statReq) / (statReq * 4), 0.75));
  const secBonus = quest.secondary_stat_value
    ? Math.min((quest.secondary_stat_value / Math.max(statReq, 1)) * 8, 8)
    : 0;
  const baseRoll = seededRng(seed + "_base") * 100;
  const effectiveRoll = baseRoll * (1 + statMod) + secBonus;

  // Draw count brackets
  let drawCount = quest.base_rolls;
  let shiftRareUp = false;
  let guaranteedLegendary = false;

  if (effectiveRoll < 35)       drawCount = Math.max(1, Math.floor(quest.base_rolls * 0.5));
  else if (effectiveRoll < 65)  drawCount = quest.base_rolls;
  else if (effectiveRoll < 100) drawCount = Math.ceil(quest.base_rolls * 1.5);
  else if (effectiveRoll < 130) drawCount = quest.base_rolls * 2;
  else if (effectiveRoll < 155) { drawCount = Math.ceil(quest.base_rolls * 2.5); shiftRareUp = true; }
  else if (effectiveRoll < 175) drawCount = quest.base_rolls * 3;
  else { drawCount = quest.base_rolls * 3; guaranteedLegendary = true; }

  // Item draw bonuses
  const itemRarity = quest.equipped_item_rarity as Rarity;
  const itemLevel  = quest.equipped_item_level ?? 1;
  if (["rare","epic","legendary"].includes(itemRarity)) drawCount += 1;
  const lvlChance = itemRarity ? Math.min((itemLevel - 1) * 0.05, 1) : 0;
  if (lvlChance > 0 && seededRng(seed + "_lvl") < lvlChance) drawCount += 1;

  const rawAff  = Math.min((quest.item_attribute_value ?? 0) * 4, 1);
  const affGuar = Math.floor(rawAff);
  const affFrac = rawAff - affGuar;
  drawCount += affGuar;
  if (affFrac > 0 && seededRng(seed + "_aff") < affFrac) drawCount += 1;

  // Loot table
  const table = getLootTable(quest.quest_type, tier);
  const relics: Partial<Record<Rarity, number>> = {};

  for (let i = 0; i < drawCount; i++) {
    let rarity = weightedDraw(table, seededRng(seed + `_draw_${i}`));
    if (shiftRareUp) {
      const idx = RARITY_ORDER.indexOf(rarity);
      rarity = RARITY_ORDER[Math.min(idx + 1, RARITY_ORDER.length - 1)];
    }
    let amount = drawAmount(rarity, tier, seededRng(seed + `_amt_${i}`));
    if (seededRng(seed + `_jp_${i}`) < JACKPOT_CHANCE) {
      rarity = RARITY_BUMP[rarity];
      amount *= 3;
    }
    relics[rarity] = r2((relics[rarity] ?? 0) + amount);
  }

  if (guaranteedLegendary) {
    const legAmt = drawAmount("legendary", tier, seededRng(seed + "_leg"));
    relics.legendary = r2((relics.legendary ?? 0) + legAmt);
  }

  // Investment factor
  const factor = computeInvFactor(itemRarity, itemLevel);
  for (const r of Object.keys(relics) as Rarity[]) {
    relics[r] = r2((relics[r] ?? 0) * factor);
  }

  const xp = TIER_XP[tier] ?? 25;
  return { relics, xp };
}

function getLootTable(questType: string, tier: number): { r: Rarity; w: number }[] {
  const base = BASE_LOOT[questType] ?? BASE_LOOT.combat;
  const shift = (tier - 1) * 2;
  return base.map((e) => {
    let w = e.w;
    if (e.r === "legendary") w += shift * 2;
    else if (e.r === "epic") w += shift;
    else if (e.r === "uncommon" || e.r === "common") w = Math.max(0, w - shift);
    return { ...e, w };
  });
}

function weightedDraw(table: { r: Rarity; w: number }[], roll01: number): Rarity {
  const total = table.reduce((s, e) => s + e.w, 0);
  let r = roll01 * total;
  for (const e of table) { r -= e.w; if (r <= 0) return e.r; }
  return "common";
}

function drawAmount(rarity: Rarity, tier: number, roll01: number): number {
  const { min, max } = AMOUNT_BASE[rarity];
  const raw = min + roll01 * (max - min);
  const variance = 0.2 + seededRng(`v${rarity}${tier}${roll01}`) * 1.6;
  return r2(raw * (TIER_SCALE[tier] ?? 0.5) * variance);
}

function computeInvFactor(rarity: Rarity | string, level: number): number {
  const rarityW: Record<string,number> = { none:0, common:0.1, uncommon:0.3, rare:0.6, epic:0.85, legendary:1.0 };
  const lvlComp  = Math.min((level - 1) / 9, 1);
  const gearScore = (rarityW[rarity] ?? 0) * (0.6 + 0.4 * lvlComp);
  return Math.max(INV_FLOOR, Math.min(1, INV_FLOOR + (1 - INV_FLOOR) * gearScore));
}

/** Deterministic float [0,1) from a string seed (no external deps). */
function seededRng(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = h >>> 0;
  return h / 4294967296;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
