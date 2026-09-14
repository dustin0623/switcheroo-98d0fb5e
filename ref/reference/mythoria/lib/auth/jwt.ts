// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from "jose";
import { config } from "@/lib/config/config";

const secret = new TextEncoder().encode(config.jwtSecret);

/** Signs a JWT that identifies a player by their Hive username. */
export async function signToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** Verifies a JWT and returns the payload, or null if invalid/expired. */
export async function verifyToken(
  token: string
): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    // Support legacy tokens that stored wallet instead of username
    const username = (payload.username ?? payload.wallet) as string | undefined;
    if (!username) return null;
    return { username };
  } catch {
    return null;
  }
}
