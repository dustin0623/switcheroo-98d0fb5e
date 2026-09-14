/**
 * Seed / upsert all 104 templates into the MongoDB `templates` collection.
 *
 * Run once (or re-run safely — upsert is idempotent):
 *   pnpm seed:templates
 */
import { avatarTemplates }     from "@/features/templates/avatars";
import { bannerTemplates }     from "@/features/templates/banners";
import { backgroundTemplates } from "@/features/templates/backgrounds";
import { equipmentTemplates }  from "@/features/templates/equipments";
import { upsertTemplate }      from "@/lib/modules/templates/repository.server";
import { connectDatabase }     from "@/lib/config/database";
import mongoose from "mongoose";

async function main() {
  await connectDatabase();
  console.log("[seed-templates] Connected to MongoDB");

  const rows: Parameters<typeof upsertTemplate>[0][] = [
    // ── Avatars (0–23) ────────────────────────────────────────────────────────
    ...avatarTemplates.map((t) => ({
      _id:       t.templateId,
      kind:      "avatar" as const,
      name:      t.name,
      image:     t.image,
      maxSupply: t.maxSupply,
      soulbound: t.soulbound,
      slot:      null,
      rarity:    null,
      mintCount: 0,
    })),

    // ── Banners (100–124) ─────────────────────────────────────────────────────
    ...bannerTemplates.map((t) => ({
      _id:       t.templateId,
      kind:      "banner" as const,
      name:      t.name,
      image:     t.image,
      maxSupply: t.maxSupply,
      soulbound: t.soulbound,
      slot:      null,
      rarity:    null,
      mintCount: 0,
    })),

    // ── Backgrounds (200–224) ─────────────────────────────────────────────────
    ...backgroundTemplates.map((t) => ({
      _id:       t.templateId,
      kind:      "background" as const,
      name:      t.name,
      image:     t.image,
      maxSupply: t.maxSupply,
      soulbound: t.soulbound,
      slot:      null,
      rarity:    null,
      mintCount: 0,
    })),

    // ── Items (1000–6004) ─────────────────────────────────────────────────────
    ...equipmentTemplates.map((t) => ({
      _id:       t.templateId,
      kind:      "item" as const,
      name:      t.name,
      image:     t.image,
      maxSupply: null,      // no cap on items
      soulbound: false,
      slot:      t.slot,
      rarity:    t.rarity,
      mintCount: 0,
    })),
  ];

  let upserted = 0;
  for (const row of rows) {
    await upsertTemplate(row);
    upserted++;
  }

  console.log(`[seed-templates] Upserted ${upserted} templates.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[seed-templates] Fatal:", err);
  process.exit(1);
});
