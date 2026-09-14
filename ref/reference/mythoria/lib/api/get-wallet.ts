// lib/api/get-wallet.ts
// Extracts the authenticated username from any incoming Request.
// Returns null if missing or invalid — callers should 401 on null.
// "wallet" is kept as the function name for backwards compat with callers.
//
// Token resolution order:
//   1. Authorization: Bearer <token>  (sent by game-store for XHR calls)
//   2. mythoria_token cookie           (set httpOnly by /api/auth/login)
import { verifyToken } from "@/lib/auth/jwt";
import { cookies } from "next/headers";

export async function getWallet(req: Request): Promise<string | null> {
  // 1. Try Bearer header first (explicit client-side auth header)
  const auth = req.headers.get("authorization") ?? "";
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearerToken) {
    const payload = await verifyToken(bearerToken);
    if (payload?.username) return payload.username;
  }

  // 2. Fall back to httpOnly cookie (covers SSR actions and calls without header)
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("mythoria_token")?.value ?? null;
  if (cookieToken) {
    const payload = await verifyToken(cookieToken);
    if (payload?.username) return payload.username;
  }

  return null;
}
