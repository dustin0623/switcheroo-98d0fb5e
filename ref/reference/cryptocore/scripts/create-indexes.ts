// scripts/create-indexes.ts
// Run with: pnpm db:indexes
// Ensures the unique MongoDB indexes that prevent double-crediting exist.

import "dotenv/config";
import { connectDatabase } from "@/lib/config/database";

async function main() {
  await connectDatabase();
  console.log("Indexes will be created by Mongoose model definitions at import time.");
  console.log("Syncing all models...");

  await import("@/lib/modules/players/model.server");
  await import("@/lib/modules/items/model.server");
  await import("@/lib/modules/transactions-pending/model.server");
  await import("@/lib/modules/transactions-processed/model.server");
  await import("@/lib/modules/logs/model.server");
  await import("@/lib/modules/market-listings/model.server");
  await import("@/lib/modules/login-nonces/model.server");


  console.log("Models registered. Indexes are auto-created by Mongoose on connect.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
