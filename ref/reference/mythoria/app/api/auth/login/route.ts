// app/api/auth/login/route.ts
// Verify wallet signature → issue JWT → upsert player.
// Chain is determined server-side from NEXT_PUBLIC_CHAIN / CHAIN env vars.
//
// Payload shape:
//   wallet    — the signing address / Hive account name (always required)
//   message   — the message that was signed               (always required)
//   signature — the wallet's signature over message       (always required)
//   username  — short game display name                   (required for Robinhood / Solana)
//               On Hive, wallet === username so the client may omit it.
//
// The client never controls which chain is used — chain is read from server config only.
import { apiOk, apiError } from "@/lib/api/error-response";
import { verifyWalletSignature, getActiveChain } from "@/lib/auth/verify-signature.server";
import { signToken } from "@/lib/auth/jwt";
import { upsertPlayer } from "@/lib/modules/players/repository.server";
import { cookies } from "next/headers";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as {
    wallet?:    string;
    message?:   string;
    signature?: string;
    username?:  string; // optional on Hive (wallet IS the username); required on Robinhood/Solana
  };

  const { wallet, message, signature } = body;

  if (!wallet || !message || !signature) {
    return apiError("Missing wallet, message, or signature", "INVALID_BODY", 400);
  }

  const walletNorm = wallet.trim().toLowerCase();

  // Chain is always determined by server config, never trusted from the client.
  const chain = getActiveChain();

  // On Hive the wallet name IS the username.
  // On Robinhood / Solana the wallet is a long address — use the client-supplied
  // username if provided, otherwise fall back to the wallet address.
  const username = body.username?.trim().toLowerCase() || walletNorm;

  // Validate username on non-Hive chains where it was supplied by the client.
  if (chain !== "hive" && body.username) {
    const validUsername = /^[a-z0-9._-]{3,32}$/.test(username);
    if (!validUsername) {
      return apiError(
        "Username must be 3–32 characters: lowercase letters, numbers, dots, underscores, or hyphens.",
        "INVALID_USERNAME",
        400
      );
    }
  }

  // Verify the wallet signature cryptographically using the active chain's adapter.
  const valid = await verifyWalletSignature({ wallet: walletNorm, message, signature });
  if (!valid) {
    return apiError("Signature verification failed", "INVALID_SIGNATURE", 401);
  }

  // Upsert player — store both the wallet address and the chosen display username.
  await upsertPlayer({ wallet: walletNorm, username });

  const token = await signToken(username);

  // Set httpOnly cookie for Edge middleware route gating.
  const cookieStore = await cookies();
  cookieStore.set("mythoria_token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });

  return apiOk({ token, username, chain });
}
