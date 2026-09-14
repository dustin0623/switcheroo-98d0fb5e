import { Router } from "express";
import { generateLoginChallenge, verifyLoginSignature } from "@/lib/auth/login.server";
import { z } from "zod";

const router = Router();

const challengeInput = z.object({ wallet: z.string().min(32) });
const verifyInput = z.object({ wallet: z.string().min(32), signature: z.string() });

router.post("/challenge", async (req, res, next) => {
  try {
    const { wallet } = challengeInput.parse(req.body);
    const nonce = await generateLoginChallenge(wallet);
    res.json({ ok: true, nonce });
  } catch (err) {
    next(err);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { wallet, signature } = verifyInput.parse(req.body);
    const result = await verifyLoginSignature(wallet, signature);
    if (!result.ok) {
      res.status(401).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, token: result.token, wallet: result.payload?.wallet });
  } catch (err) {
    next(err);
  }
});

export default router;
