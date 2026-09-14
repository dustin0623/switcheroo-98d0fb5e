import type { Request, Response, NextFunction } from "express";
import { verifySession } from "@/lib/auth/jwt";

export interface AuthRequest extends Request {
  wallet?: string;
  username?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const payload = await verifySession(token);
    req.wallet = payload.wallet;
    req.username = payload.username;
    next();
  } catch (err) {
    res.status(401).json({ ok: false, error: "Invalid token" });
  }
}
