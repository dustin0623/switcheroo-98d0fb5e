import { ItemTemplateModel } from "./model.server";
import type { IItemTemplate } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

export async function findTemplateById(id: number): Promise<IItemTemplate | null> {
  await connectDatabase();
  return ItemTemplateModel.findOne({ id }).lean<IItemTemplate>();
}

export async function findAllTemplates(): Promise<IItemTemplate[]> {
  await connectDatabase();
  return ItemTemplateModel.find().lean<IItemTemplate[]>();
}

export async function incrementTemplateMintCount(id: number): Promise<void> {
  await connectDatabase();
  await ItemTemplateModel.updateOne({ id }, { $inc: { supply_minted: 1 } });
}
