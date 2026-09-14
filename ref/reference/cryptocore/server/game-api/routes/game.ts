import { Router } from "express";
import { z } from "zod";
import { claimVault } from "@/lib/game/claim.server";
import { openChest } from "@/lib/game/chest.server";
import { burnHash } from "@/lib/game/burn.server";
import { upgradeStat, upgradeEquipment } from "@/lib/game/upgrade.server";
import { tickPlayer } from "@/lib/game/mining.server";
import { findPlayerByWallet, updatePlayer } from "@/lib/modules/players/repository.server";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import type { ChestKey, StatKey } from "@/features/types/game";
import { PURCHASABLE_CHEST_KEYS, STAT_KEYS } from "@/features/constants/game";

const router = Router();

const seedInput = z.object({ seed: z.string() });
const chestInput = z.object({
  chest: z.enum(PURCHASABLE_CHEST_KEYS as [ChestKey, ...ChestKey[]]),
  seed: z.string().min(1),
});
const statInput = z.object({ stat: z.enum(STAT_KEYS as [StatKey, ...StatKey[]]) });
const itemInput = z.object({ itemNumber: z.number().int().positive() });
const burnInput = z.object({ amount: z.number().positive() });
const raidInput = z.object({ target: z.string(), seed: z.string() });

router.post("/tick", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const player = await findPlayerByWallet(req.wallet!);
    if (!player) {
      res.status(404).json({ ok: false, error: "Player not found" });
      return;
    }
    const { player: updated, mined } = tickPlayer(player);
    await updatePlayer(req.wallet!, updated);
    res.json({ ok: true, mined, vault: updated.vault });
  } catch (err) {
    next(err);
  }
});

router.post("/claim", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await claimVault(req.wallet!);
    // Frontend contract uses `amount`; keep `claimed` for backwards compat.
    res.status(result.ok ? 200 : 400).json({ ...result, amount: result.claimed });
  } catch (err) {
    next(err);
  }
});

router.post("/chest", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { chest, seed } = chestInput.parse(req.body);
    const result = await openChest(req.wallet!, chest, seed);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/upgrade/stat", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { stat } = statInput.parse(req.body);
    const result = await upgradeStat(req.wallet!, stat);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/upgrade/item", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { itemNumber } = itemInput.parse(req.body);
    const result = await upgradeEquipment(req.wallet!, itemNumber);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/burn", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { amount } = burnInput.parse(req.body);
    const result = await burnHash(req.wallet!, amount);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/raid", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { target, seed } = raidInput.parse(req.body);
    const { findPlayerByWallet, updatePlayer } = await import("@/lib/modules/players/repository.server");
    const { regenCharges, simulateRaid, logRaid } = await import("@/lib/game/raid.server");

    const attacker = await findPlayerByWallet(req.wallet!);
    const defender = await findPlayerByWallet(target);
    if (!attacker || !defender) {
      res.status(404).json({ ok: false, error: "Player not found" });
      return;
    }

    regenCharges(attacker);
    if (attacker.raidCharges <= 0) {
      res.status(400).json({ ok: false, error: "No raid charges" });
      return;
    }
    if (attacker.wallet === defender.wallet) {
      res.status(400).json({ ok: false, error: "Cannot raid yourself" });
      return;
    }

    const result = simulateRaid(attacker, defender, seed);
    if (result.success) {
      await updatePlayer(attacker.wallet, attacker);
      await updatePlayer(defender.wallet, defender);
    } else {
      attacker.raidCharges -= 1;
      await updatePlayer(attacker.wallet, attacker);
    }
    await logRaid(attacker.wallet, defender.wallet, result, seed);
    res.json({ ok: result.success, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
