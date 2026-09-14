// lib/modules/quest-templates/repository.server.ts
import { QuestTemplateModel } from "./model.server";
import type { IQuestTemplate } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

/** Return all active templates (used for board generation). */
export async function findActiveTemplates(): Promise<IQuestTemplate[]> {
  await connectDatabase();
  return QuestTemplateModel.find({ active: true }).lean<IQuestTemplate[]>();
}

/** Upsert a template (idempotent seed helper). */
export async function upsertTemplate(
  data: Omit<IQuestTemplate, keyof Document>
): Promise<void> {
  await connectDatabase();
  await QuestTemplateModel.updateOne(
    { id: data.id },
    { $set: data },
    { upsert: true }
  );
}
