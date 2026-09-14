/**
 * lib/client/deposit/solana.ts
 *
 * Client-side Token-2022 SPL deposit: player wallet → treasury.
 * Uses Solana wallet-adapter (WalletContext must be mounted). Browser only.
 */

import type { DepositOptions, DepositResult } from "./types";
import type { WalletContextState }            from "@solana/wallet-adapter-react";


export interface SolanaDepositOptions extends DepositOptions {
  wallet:       WalletContextState;
  mintAddress:  string;
  connection:   import("@solana/web3.js").Connection;
}

export async function depositSolana(opts: SolanaDepositOptions): Promise<DepositResult> {
  const { wallet, mintAddress, connection, amount, treasuryAddress, memo = "" } = opts;
  if (!wallet.publicKey) throw new Error("Solana wallet not connected");
  if (!wallet.signTransaction) throw new Error("Wallet does not support transaction signing");

  const [
    { PublicKey, Transaction },
    {
      getOrCreateAssociatedTokenAccount,
      createTransferCheckedInstruction,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      getMint,
    },
  ] = await Promise.all([
    import("@solana/web3.js"),
    import("@solana/spl-token"),
  ]);

  const mintPk      = new PublicKey(mintAddress);
  const treasuryPk  = new PublicKey(treasuryAddress);
  const playerPk    = wallet.publicKey;

  const mintInfo = await getMint(connection, mintPk, "confirmed", TOKEN_2022_PROGRAM_ID);
  const decimals = mintInfo.decimals;

  const [whole, frac = ""] = String(amount).split(".");
  const paddedFrac = (frac + "0".repeat(decimals)).slice(0, decimals);
  const rawAmount  = BigInt(whole + paddedFrac);

  const playerAta = await getOrCreateAssociatedTokenAccount(
    connection, { publicKey: playerPk, secretKey: new Uint8Array(64) } as import("@solana/web3.js").Signer,
    mintPk, playerPk, false, "confirmed", undefined, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  ).catch(async () => {
    // If "can't sign" for ATA creation, derive the ATA address directly.
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    return { address: getAssociatedTokenAddressSync(mintPk, playerPk, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID) };
  });

  const treasuryAta = await getOrCreateAssociatedTokenAccount(
    connection, { publicKey: playerPk, secretKey: new Uint8Array(64) } as import("@solana/web3.js").Signer,
    mintPk, treasuryPk, false, "confirmed", undefined, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  ).catch(async () => {
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    return { address: getAssociatedTokenAddressSync(mintPk, treasuryPk, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID) };
  });

  const tx = new Transaction();
  tx.add(
    createTransferCheckedInstruction(
      playerAta.address, mintPk, treasuryAta.address, playerPk,
      rawAmount, decimals, [], TOKEN_2022_PROGRAM_ID,
    ),
  );

  if (memo) {
    const { createMemoInstruction } = await import("@solana/spl-memo");
    tx.add(createMemoInstruction(memo, [playerPk]));
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer        = playerPk;

  const signed = await wallet.signTransaction(tx);
  const sig    = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

  return { txId: sig };
}
