import { Router } from "express";
import { z } from "zod";
import { findPlayerByWallet, upsertPlayer, updatePlayer } from "@/lib/modules/players/repository.server";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

function toPlayerDto(player: NonNullable<Awaited<ReturnType<typeof findPlayerByWallet>>>) {
  return {
    address: player.wallet,
    username: player.username,
    registrationTime: player.registrationTime,
    xp: player.xp,
    level: player.level,
    hash: player.hash,
    sparks: player.sparks,
    vault: player.vault,
    vaultStaked: player.vaultStaked,
    notoriety: player.notoriety,
    totalBurned: player.totalBurned,
    statLevels: player.statLevels,
    lastTickAt: player.lastTickAt,
    lastSinkAt: player.lastSinkAt,
    claimCharges: player.claimCharges,
    lastClaimRegenAt: player.lastClaimRegenAt,
    raidCharges: player.raidCharges,
    lastRaidRegenAt: player.lastRaidRegenAt,
    totalClaimed: player.totalClaimed,
    totalMined: player.totalMined,
    raids: player.raids,
    raidWins: player.raidWins,
    totalStolen: player.totalStolen,
    bestHashRate: player.bestHashRate,
    protectionUntil: player.protectionUntil,
  };
}

router.get("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    let player = await findPlayerByWallet(req.wallet!);
    if (!player) {
      // First authenticated visit: provision the account from the verified wallet.
      await upsertPlayer({ wallet: req.wallet!, username: req.wallet! });
      player = await findPlayerByWallet(req.wallet!);
    }
    if (!player) {
      res.status(404).json({ ok: false, error: "Player not found" });
      return;
    }
    res.json({ ok: true, player: toPlayerDto(player) });
  } catch (err) {
    next(err);
  }
});

const updateInput = z.object({ username: z.string().min(3).max(32) });

router.post("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { username } = updateInput.parse(req.body);
    await upsertPlayer({ wallet: req.wallet!, username });
    // upsertPlayer only sets username on insert — apply renames explicitly.
    await updatePlayer(req.wallet!, { username });
    const player = await findPlayerByWallet(req.wallet!);
    if (!player) {
      res.status(404).json({ ok: false, error: "Player not found" });
      return;
    }
    res.json({ ok: true, player: toPlayerDto(player) });
  } catch (err) {
    next(err);
  }
});

export default router;
