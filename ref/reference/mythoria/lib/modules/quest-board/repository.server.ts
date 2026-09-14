// lib/modules/quest-board/repository.server.ts
import { QuestBoardModel } from "./model.server";
import type { IQuestBoard, IQuestBoardSlot } from "./types.server";
import { connectDatabase } from "@/lib/config/database";
import { findActiveTemplates } from "@/lib/modules/quest-templates/repository.server";

/** Return today's board (UTC date). Returns null if none generated yet. */
export async function getTodaysBoard(): Promise<IQuestBoard | null> {
  await connectDatabase();
  const today = todayUTC();
  return QuestBoardModel.findOne({ date: today }).lean<IQuestBoard>();
}

/** Generate (or replace) today's board from 6 random active templates. */
export async function generateBoard(
  multiplier = 1.0,
  scrapUsd = 0
): Promise<IQuestBoard> {
  await connectDatabase();
  const today = todayUTC();
  const templates = await findActiveTemplates();

  if (templates.length === 0) {
    throw new Error("No active quest templates found — run seed-quest-templates first");
  }

  // Pick 6 distinct random templates (or fewer if not enough exist)
  const shuffled = templates.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(6, shuffled.length));

  const slots: IQuestBoardSlot[] = picked.map((t) => ({
    template_id:    t.id,
    quest_type:     t.quest_type,
    tier:           t.tier,
    name:           t.name,
    flavor:         t.flavor,
    image_url:      t.image_url,
    duration_hours: t.duration_hours,
    base_rolls:     t.base_rolls,
    mgold_cost:     t.mgold_cost ?? 0,
  }));

  const doc = await QuestBoardModel.findOneAndUpdate(
    { date: today },
    {
      $set: {
        slots,
        generated_at: Date.now(),
        multiplier,
        mgold_usd: scrapUsd,
      },
    },
    { upsert: true, new: true }
  );

  return doc!.toObject() as IQuestBoard;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}
