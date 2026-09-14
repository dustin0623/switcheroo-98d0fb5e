// lib/modules/active-quests/repository.server.ts
import { ActiveQuestModel } from "./model.server";
import type { IActiveQuest } from "./types.server";
import { connectDatabase } from "@/lib/config/database";
import type { Types } from "mongoose";

/** All in-progress (not collected) quests for a wallet. */
export async function findActiveQuestsByWallet(wallet: string): Promise<IActiveQuest[]> {
  await connectDatabase();
  return ActiveQuestModel.find({ wallet, collected: false }).lean<IActiveQuest[]>();
}

/** All quests for a wallet (including collected) — useful for the log page. */
export async function findAllQuestsByWallet(wallet: string): Promise<IActiveQuest[]> {
  await connectDatabase();
  return ActiveQuestModel.find({ wallet })
    .sort({ started_at: -1 })
    .lean<IActiveQuest[]>();
}

/** Check if wallet already has an active quest for this board slot. */
export async function hasActiveQuestForSlot(
  wallet: string,
  boardDate: string,
  questType: string,
  tier: number
): Promise<boolean> {
  await connectDatabase();
  const existing = await ActiveQuestModel.findOne({
    wallet,
    board_date: boardDate,
    quest_type: questType,
    tier,
    collected: false,
  });
  return existing !== null;
}

/** Insert a new active-quest document. */
export async function insertActiveQuest(
  data: Omit<IActiveQuest, "_id" | keyof import("mongoose").Document>
): Promise<IActiveQuest> {
  await connectDatabase();
  const doc = await ActiveQuestModel.create(data);
  return doc.toObject() as IActiveQuest;
}

/** Mark a quest as collected. Returns updated doc or null if not found / already collected. */
export async function collectActiveQuest(
  questId: Types.ObjectId | string,
  wallet: string
): Promise<IActiveQuest | null> {
  await connectDatabase();
  const nowMs = Date.now();
  return ActiveQuestModel.findOneAndUpdate(
    { _id: questId, wallet, collected: false, completes_at: { $lte: nowMs } },
    { $set: { collected: true, collected_at: nowMs } },
    { new: true }
  ).lean<IActiveQuest>();
}
