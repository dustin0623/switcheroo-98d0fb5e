import { Router } from "express";
import {
  findActivityLogsByWallet,
  findMarketLogsByWallet,
  findMarketSales,
} from "@/lib/modules/logs/repository.server";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

function parseLimit(raw: unknown, fallback = 50): number {
  const value = Number(raw ?? fallback);
  return Number.isFinite(value) && value > 0 ? Math.min(200, value) : fallback;
}

/** The signed-in player's gameplay activity (claims, chests, raids, upgrades). */
router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseLimit((req.query as Record<string, unknown>)["limit"]);
    const logs = await findActivityLogsByWallet(req.wallet!, limit);
    res.json({ ok: true, logs });
  } catch (err) {
    next(err);
  }
});

/** The signed-in player's marketplace trades. */
router.get("/market", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseLimit((req.query as Record<string, unknown>)["limit"]);
    const logs = await findMarketLogsByWallet(req.wallet!, limit);
    res.json({ ok: true, logs });
  } catch (err) {
    next(err);
  }
});

/** Public history of completed marketplace sales. */
router.get("/market/sales", async (req, res, next) => {
  try {
    const limit = parseLimit((req.query as Record<string, unknown>)["limit"]);
    const logs = await findMarketSales(limit);
    res.json({ ok: true, logs });
  } catch (err) {
    next(err);
  }
});

export default router;
