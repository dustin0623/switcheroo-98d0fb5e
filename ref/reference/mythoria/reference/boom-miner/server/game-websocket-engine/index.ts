/**
 * server/game-websocket-engine/index.ts
 *
 * Entry point for the game WebSocket engine.
 * Run with: pnpm run server:websocket-start
 *
 * Reads from environment:
 *   MONGODB_URI    — MongoDB connection string (required)
 *   JWT_SECRET     — shared with the Next.js app (required)
 *   PORT           — server port (default: 4000)
 *   CORS_ORIGIN    — comma-separated allowed origins (unset = allow all, recommended for local testing only)
 *
 * Architecture:
 *   http.createServer → Socket.IO attaches to it
 *   authMiddleware    → runs before every connection
 *   registerHandlers  → called once per authenticated connection
 *   FlushScheduler    → 30s interval writes dirty sessions to DB + backfill
 */

import { createServer } from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { connectDatabase } from "@/lib/config/database";
import { SessionStore } from "./session/SessionStore";
import { FlushScheduler } from "./session/FlushScheduler";
import { RegenScheduler } from "./session/RegenScheduler";
import { authMiddleware } from "./socket/auth";
import { registerHandlers } from "./socket/handlers";
import { WalletAuthority } from "./authority/WalletAuthority";

// ---- Config ----------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? "4000", 10);

// When CORS_ORIGIN is not set, allow all origins (*) — useful for local
// testing so you don't need to enumerate every dev URL.
// In production, set CORS_ORIGIN to a comma-separated list of allowed origins.
const CORS_ORIGIN: string | string[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : "*";

// ---- Bootstrap -------------------------------------------------------------

async function main(): Promise<void> {
  // Ensure the DB is connected before accepting any socket connections.
  await connectDatabase();
  console.log("[WS Engine] MongoDB connected");

  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin:      CORS_ORIGIN,
      methods:     ["GET", "POST"],
      // credentials cannot be used with wildcard origin; only set when a
      // specific origin list is provided.
      credentials: CORS_ORIGIN !== "*",
    },
    // Prefer WebSocket; fall back to long-polling for restrictive networks.
    transports:  ["websocket", "polling"],
  });

  const store     = new SessionStore();
  const flusher   = new FlushScheduler(store);
  const regen     = new RegenScheduler(store);
  const authority = new WalletAuthority();

  let shuttingDown = false;

  // Auth middleware — runs before connection event fires.
  io.use((socket, next) => shuttingDown ? next(new Error("SERVER_SHUTTING_DOWN")) : authMiddleware(socket, next));

  io.on("connection", (socket) => {
    if (shuttingDown) {
      socket.disconnect(true);
      return;
    }
    console.log(`[WS Engine] connected: ${socket.data.wallet} (${socket.id})`);
    registerHandlers(socket, io, store, flusher, authority).catch((err) => {
      console.error(`[WS Engine] registerHandlers failed for ${socket.data.wallet}:`, err);
      socket.disconnect(true);
    });
  });

  flusher.start();
  regen.start();

  httpServer.listen(PORT, () => {
    console.log(`[WS Engine] listening on port ${PORT}`);
    console.log(`[WS Engine] CORS origins: ${CORS_ORIGIN === "*" ? "* (all — set CORS_ORIGIN in production)" : (CORS_ORIGIN as string[]).join(", ")}`);
  });

  // Graceful shutdown — stop intake, drain serialized work, then release leases.
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[WS Engine] ${signal} received — draining authoritative work`);
    flusher.stop();
    regen.stop();
    const deadline = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("shutdown deadline exceeded")), 20_000).unref();
    });
    try {
      await Promise.race([
        (async () => {
          await new Promise<void>((resolve) => io.close(() => resolve()));
          await Promise.allSettled([...store.all()].map((entry) => entry.flushPromise));
          await flusher.flushAll();
          for (const entry of store.all()) {
            if (entry.dirty || entry.flushPromise) continue;
            await authority.release(entry.wallet, entry.lease.fencingToken);
          }
          await mongoose.disconnect();
          await new Promise<void>((resolve) => httpServer.close(() => resolve()));
        })(),
        deadline,
      ]);
      console.log("[WS Engine] shutdown drain complete");
      process.exit(0);
    } catch (error) {
      const incomplete = [...store.all()].filter((entry) => entry.dirty || entry.flushPromise).length;
      console.error("[WS Engine] shutdown incomplete", { signal, incompleteSessions: incomplete, error: String(error) });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[WS Engine] fatal startup error:", err);
  process.exit(1);
});
