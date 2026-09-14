// src/lib/chain/solana/transfer.ts
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import bs58 from "bs58";
import { config } from "@/lib/config/config";
import { getSolanaConnection } from "./client";

export function getTreasuryKeypair(): Keypair {
  if (!config.blockchain.treasuryKey) throw new Error("TREASURY_KEY is not set");
  return Keypair.fromSecretKey(bs58.decode(config.blockchain.treasuryKey));
}

export async function sendToken(
  recipient: PublicKey,
  amount:    number,
  decimals = 6,
): Promise<string> {
  const connection = getSolanaConnection();
  const mint = new PublicKey(config.blockchain.solana.mint);
  const sender = getTreasuryKeypair();

  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    mint,
    sender.publicKey,
  );

  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    mint,
    recipient,
  );

  const amountInSmallestUnit = BigInt(Math.floor(amount * 10 ** decimals));

  const tx = new Transaction().add(
    createTransferInstruction(
      senderTokenAccount.address,
      recipientTokenAccount.address,
      sender.publicKey,
      amountInSmallestUnit,
    )
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [sender], {
    commitment: "confirmed",
  });

  return signature;
}

export async function confirmSignature(
  signature: string,
  maxAttempts = 10,
  pollMs = 2000,
): Promise<boolean> {
  const connection = getSolanaConnection();
  for (let i = 0; i < maxAttempts; i++) {
    const status = await connection.getSignatureStatuses([signature]);
    const value = status.value[0];
    if (value?.confirmationStatus === "confirmed" || value?.confirmationStatus === "finalized") {
      return !value.err;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}
