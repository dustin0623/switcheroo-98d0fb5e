import { Router } from "express";
import { z } from "zod";
import {
  findItemsByOwner,
  equipItem,
  unequipItem,
  salvageItem,
} from "@/lib/modules/items/repository.server";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

function toItemDto(item: Awaited<ReturnType<typeof findItemsByOwner>>[number]) {
  return {
    itemNumber: item.itemNumber,
    owner: item.owner,
    name: item.name,
    slot: item.slot,
    rarity: item.rarity,
    level: item.level,
    stats: item.stats,
    equipped: item.equipped,
    salvaged: item.salvaged,
    image: item.image,
    createdAt: item.createdAt,
    lastTransfer: item.lastTransfer,
  };
}

router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const items = await findItemsByOwner(req.wallet!);
    res.json({ ok: true, items: items.map(toItemDto) });
  } catch (err) {
    next(err);
  }
});

const itemInput = z.object({ itemNumber: z.number().int().positive() });

router.post("/equip", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { itemNumber } = itemInput.parse(req.body);
    const result = await equipItem(itemNumber, req.wallet!);
    res.status(result.ok ? 200 : 400).json({ ...result, item: result.item ? toItemDto(result.item) : undefined });
  } catch (err) {
    next(err);
  }
});

router.post("/unequip", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { itemNumber } = itemInput.parse(req.body);
    const result = await unequipItem(itemNumber, req.wallet!);
    res.status(result.ok ? 200 : 400).json({ ...result, item: result.item ? toItemDto(result.item) : undefined });
  } catch (err) {
    next(err);
  }
});

router.post("/salvage", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { itemNumber } = itemInput.parse(req.body);
    const result = await salvageItem(itemNumber, req.wallet!);
    res.status(result.ok ? 200 : 400).json({ ...result, item: result.item ? toItemDto(result.item) : undefined });
  } catch (err) {
    next(err);
  }
});

export default router;
