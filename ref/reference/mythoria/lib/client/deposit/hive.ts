/**
 * lib/client/deposit/hive.ts
 *
 * Client-side Hive HIVE/HBD custom_json transfer for player → treasury deposit.
 * Calls Keychain if available; falls back to directing the user to HiveSigner.
 * Browser only. Zero Node.js APIs.
 */

import type { DepositOptions, DepositResult } from "./types";
// Window.hive_keychain is declared globally in types/hive-keychain.d.ts

export interface HiveDepositOptions extends DepositOptions {
  fromAccount: string;
  currency?: "HIVE" | "HBD";
}

export async function depositHive(opts: HiveDepositOptions): Promise<DepositResult> {
  const {
    fromAccount,
    amount,
    treasuryAddress,
    memo = "",
    currency = "HIVE",
  } = opts;

  if (!fromAccount || !treasuryAddress) {
    throw new Error("Hive deposit requires fromAccount and treasuryAddress");
  }

  const amountStr = `${Number(amount).toFixed(3)} ${currency}`;

  if (typeof window !== "undefined" && window.hive_keychain) {
    return new Promise<DepositResult>((resolve, reject) => {
      window.hive_keychain!.requestTransfer(
        fromAccount,
        treasuryAddress,
        amountStr,
        memo,
        currency,
        (resp) => {
          if (!resp.success) {
            reject(new Error(resp.message ?? "Keychain transfer rejected"));
            return;
          }
          const id = typeof resp.result === "string"
            ? resp.result
            : (resp.result?.id ?? `hive-${Date.now()}`);
          resolve({ txId: id });
        },
      );
    });
  }

  // Fallback: open HiveSigner deep link in the same tab.
  const hivesignerUrl = new URL("https://hivesigner.com/sign/transfer");
  hivesignerUrl.searchParams.set("from",     fromAccount);
  hivesignerUrl.searchParams.set("to",       treasuryAddress);
  hivesignerUrl.searchParams.set("amount",   amountStr);
  hivesignerUrl.searchParams.set("memo",     memo);
  window.location.href = hivesignerUrl.toString();

  // This path never resolves unless the user comes back — but we throw immediately
  // so the caller can clean up.
  throw new Error("Redirecting to HiveSigner. You will be returned after signing.");
}
