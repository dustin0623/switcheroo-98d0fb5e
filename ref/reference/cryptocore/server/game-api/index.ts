import "dotenv/config";
import express from "express";
import { connectDatabase } from "@/lib/config/database";

import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error";

import authRouter from "./routes/auth";
import playerRouter from "./routes/player";
import gameRouter from "./routes/game";
import itemsRouter from "./routes/items";
import marketRouter from "./routes/market";
import logsRouter from "./routes/logs";
import transactionsRouter from "./routes/transactions";
import healthRouter from "./routes/health";

const app = express();
const PORT = Number(process.env["PORT"] ?? 3000);

app.use(express.json());
app.use(corsMiddleware);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/player", playerRouter);
app.use("/api/game", gameRouter);
app.use("/api/items", itemsRouter);
app.use("/api/market", marketRouter);
app.use("/api/logs", logsRouter);
app.use("/api/transactions", transactionsRouter);

app.use(errorHandler);

async function main() {
  await connectDatabase();
  // eslint-disable-next-line no-console
  console.log("Connected to MongoDB");

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`CryptoCore game API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start game API", err);
  process.exit(1);
});
