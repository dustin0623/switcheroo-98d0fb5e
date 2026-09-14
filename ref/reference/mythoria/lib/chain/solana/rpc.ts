/**
 * lib/chain/solana/rpc.ts
 *
 * Solana connection + treasury signer accessors.
 * SERVER-ONLY — reads the treasury secret key from config.
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import { config } from "@/lib/config/config";

const solana = config.blockchain.solana;

function resolveServerRpcUrl(): string {
  if (solana.heliusApiKey) {
    const host = solana.rpcUrl.includes("devnet")
      ? "devnet.helius-rpc.com"
      : "mainnet.helius-rpc.com";
    return `https://${host}/?api-key=${solana.heliusApiKey}`;
  }
  return solana.rpcUrl;
}

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(resolveServerRpcUrl(), "confirmed");
  }
  return _connection;
}

let _treasury: Keypair | null = null;

function decodeSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("TREASURY_KEY env var is not set");
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed) as number[];
    return Uint8Array.from(arr);
  }
  return bs58.decode(trimmed);
}

export function getTreasuryKeypair(): Keypair {
  if (!_treasury) {
    _treasury = Keypair.fromSecretKey(decodeSecretKey(config.blockchain.treasuryKey));
  }
  return _treasury;
}

export function getMintPublicKey(): PublicKey {
  if (!solana.mint) throw new Error("CONTRACT_ADDRESS (Solana mint) is not set");
  return new PublicKey(solana.mint);
}

export async function getMintDecimals(): Promise<number> {
  const mintInfo = await getMint(
    getConnection(),
    getMintPublicKey(),
    "confirmed",
    TOKEN_2022_PROGRAM_ID,
  );
  return mintInfo.decimals;
}
