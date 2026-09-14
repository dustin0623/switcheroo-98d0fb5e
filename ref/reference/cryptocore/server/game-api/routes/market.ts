import { Router } from "express";
import { z } from "zod";
import {
  findActiveListings,
  listItem,
  markSold,
  cancelListing,
} from "@/lib/modules/market-listings/repository.server";
import { findItemsByNumbers } from "@/lib/modules/items/repository.server";
import { buyFromMarket } from "@/lib/game/market.server";
import { createLog } from "@/lib/modules/logs/repository.server";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const sortParam = query["sort"];
    const sort: "price_asc" | "price_desc" | "newest" =
      sortParam === "price_asc" || sortParam === "price_desc" ? sortParam : "newest";
    const parsedLimit = Number(query["limit"] ?? 50);
    const limit = Math.min(100, Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50);
    const rawCursor = query["cursor"];
    const parsedCursor = rawCursor ? Number(rawCursor) : undefined;
    const cursor = parsedCursor !== undefined && Number.isFinite(parsedCursor) ? parsedCursor : undefined;
    const result = await findActiveListings(sort, limit, cursor);
    const items = await findItemsByNumbers(result.listings.map((l) => l.itemNumber));
    const itemsByNumber = new Map(items.map((item) => [item.itemNumber, item]));
    const listings = result.listings.map((listing) => ({
      ...listing,
      item: itemsByNumber.get(listing.itemNumber) ?? null,
    }));
    res.json({ ok: true, listings, nextCursor: result.nextCursor });
  } catch (err) {
    next(err);
  }
});

const listInput = z.object({ itemNumber: z.number().int().positive(), price: z.number().positive() });

router.post("/list", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { itemNumber, price } = listInput.parse(req.body);
    const result = await listItem({ seller: req.wallet!, itemNumber, price });
    if (result.ok) {
      await createLog({
        type: "market",
        wallet: req.wallet!,
        data: { action: "listed", itemNumber, price },
      });
    }
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

const buyInput = z.object({
  itemNumber: z.number().int().positive(),
  paymentTxId: z.string().min(32).max(120),
});

/**
 * Queues the purchase. The buyer pays on-chain in the SPL game token first and
 * passes that signature; the game-smart-contract worker verifies the payment,
 * moves the item, pays the seller, or refunds the buyer if the listing is gone.
 */
router.post("/buy", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { itemNumber, paymentTxId } = buyInput.parse(req.body);
    const result = await buyFromMarket(itemNumber, req.wallet!, paymentTxId);
    res.status(result.ok ? 202 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

const cancelInput = z.object({ itemNumber: z.number().int().positive() });

router.post("/cancel", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { itemNumber } = cancelInput.parse(req.body);
    const result = await cancelListing(itemNumber, req.wallet!);
    if (result.ok) {
      await createLog({
        type: "market",
        wallet: req.wallet!,
        data: { action: "cancelled", itemNumber },
      });
    }
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
