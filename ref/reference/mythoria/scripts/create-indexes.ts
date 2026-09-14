// scripts/create-indexes.ts
// Run once after first deploy:
//   node --env-file-if-exists=.env.local scripts/create-indexes.ts
import { connectDatabase } from "@/lib/config/database";
import mongoose from "mongoose";

async function run() {
  await connectDatabase();
  const db = mongoose.connection.db!;

  await db.collection("players").createIndex({ wallet: 1 }, { unique: true });
  await db
    .collection("players")
    .createIndex({ username: 1 }, { unique: true, sparse: true });
  await db.collection("players").createIndex({ favor: -1 });
  await db.collection("players").createIndex({ coins: -1 });

  await db.collection("items").createIndex({ item_number: 1 }, { unique: true });
  await db.collection("items").createIndex({ owner: 1 });
  await db
    .collection("items")
    .createIndex({ "market.listed": 1, "market.price": 1 });

  await db.collection("crates").createIndex({ item_number: 1 }, { unique: true });
  await db.collection("crates").createIndex({ owner: 1 });
  await db.collection("crates").createIndex({ "market.listed": 1 });

  await db
    .collection("consumables")
    .createIndex({ wallet: 1, type: 1 }, { unique: true });
  await db
    .collection("relics")
    .createIndex({ wallet: 1, type: 1 }, { unique: true });

  await db.collection("active-quests").createIndex({ wallet: 1, collected: 1 });
  await db.collection("active-quests").createIndex({ wallet: 1, board_date: 1 });

  await db.collection("claims").createIndex({ wallet: 1, time: -1 });
  await db.collection("battle_logs").createIndex({ wallet: 1, timestamp: -1 });
  await db.collection("battle_logs").createIndex({ attacked: 1, timestamp: -1 });
  await db.collection("boss-log").createIndex({ wallet: 1, time: -1 });
  await db.collection("forge-log").createIndex({ wallet: 1, time: -1 });
  await db.collection("salvage-log").createIndex({ wallet: 1, time: -1 });
  await db.collection("nft-mints").createIndex({ owner: 1, timestamp: -1 });
  await db.collection("marketplace-logs").createIndex({ created: -1 });
  await db.collection("marketplace-logs").createIndex({ buyer: 1, created: -1 });
  await db.collection("marketplace-logs").createIndex({ seller: 1, created: -1 });
  await db.collection("quest-log").createIndex({ wallet: 1, time: -1 });

  await db
    .collection("transactions_pending")
    .createIndex({ signature: 1 }, { unique: true });
  await db
    .collection("transactions_pending")
    .createIndex({ status: 1, createdAt: 1 });
  await db
    .collection("transactions_processed")
    .createIndex({ txHash: 1 }, { unique: true });
  await db
    .collection("transactions_processed")
    .createIndex({ wallet: 1, processedAt: -1 });

  await db.collection("stats").createIndex({ date: 1 }, { unique: true });
  await db.collection("price_feed").createIndex({ date: 1 }, { unique: true });
  await db.collection("planet-config").createIndex({ name: 1 }, { unique: true });
  await db.collection("quest-board").createIndex({ date: 1 }, { unique: true });
  await db.collection("item-templates").createIndex({ id: 1 }, { unique: true });
  await db.collection("registrations").createIndex({ wallet: 1 }, { unique: true });

  console.log("All indexes created.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
