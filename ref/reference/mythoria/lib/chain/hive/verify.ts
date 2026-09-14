// lib/chain/hive/verify.ts
// Server-only. Cryptographic Hive signature verification using @hiveio/dhive.
// Hive Keychain signs the buffer with the account's Posting key.
// We recover the public key from the signature and compare it against
// the account's known posting key authorities fetched from the Hive API.

import { Signature, PublicKey } from "@hiveio/dhive";
import { createHash } from "crypto";

const HIVE_RPC = "https://api.hive.blog";

type HiveAccountResult = {
  result?: Array<{
    posting?: { key_auths?: Array<[string, number]> };
  }>;
};

async function fetchPostingKeys(wallet: string): Promise<string[]> {
  const res = await fetch(HIVE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "condenser_api.get_accounts",
      params: [[wallet.toLowerCase()]],
      id: 1,
    }),
  });
  const json = (await res.json()) as HiveAccountResult;
  return json.result?.[0]?.posting?.key_auths?.map(([k]) => k) ?? [];
}

/**
 * Verifies a Hive Keychain signature.
 *
 * Hive Keychain's requestSignBuffer hashes the message with SHA-256 before
 * signing. We recover the public key from the compact signature and check it
 * matches one of the account's posting key authorities.
 */
export async function verify(
  wallet: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    if (!signature || signature.length < 10) return false;

    // Sha-256 hash of the raw message (Keychain signs the raw buffer, dhive
    // internally sha256s it during recovery — we pass the raw string).
    const msgBuffer = Buffer.from(message, "utf8");
    const msgHash = createHash("sha256").update(msgBuffer).digest();

    // Recover public key from compact (hex) signature
    const sig = Signature.fromString(signature);
    const recoveredKey = sig.recover(msgHash);
    const recoveredKeyStr = recoveredKey.toString();

    // Fetch the account's known posting keys from the Hive API
    const postingKeys = await fetchPostingKeys(wallet);

    if (postingKeys.length === 0) {
      // Account does not exist on chain
      return false;
    }

    return postingKeys.includes(recoveredKeyStr);
  } catch {
    return false;
  }
}
