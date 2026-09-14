/**
 * lib/client/deposit/robinhood.ts
 *
 * Client-side ERC-20 deposit: player MetaMask wallet → treasury on Robinhood Chain.
 * Uses window.ethereum (MetaMask / EIP-1193) — no ethers bundle shipped to the browser.
 * Browser only. Zero Node.js APIs.
 */

import type { DepositOptions, DepositResult } from "./types";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

export interface RobinhoodDepositOptions extends DepositOptions {
  tokenAddress: string;
  decimals:     number;
  chainId:      number;
}

const ERC20_TRANSFER_SELECTOR = "0xa9059cbb";

function encodeUint256(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

function encodeAddress(addr: string): string {
  return addr.replace(/^0x/, "").padStart(64, "0").toLowerCase();
}

function encodeTransferData(to: string, amount: bigint): string {
  return `${ERC20_TRANSFER_SELECTOR}${encodeAddress(to)}${encodeUint256(amount)}`;
}

function toBaseUnits(amount: number, decimals: number): bigint {
  const [whole, frac = ""] = String(amount).split(".");
  const paddedFrac = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole + paddedFrac);
}

export async function depositRobinhood(opts: RobinhoodDepositOptions): Promise<DepositResult> {
  const { tokenAddress, decimals, chainId, amount, treasuryAddress } = opts;

  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask (or another EIP-1193 wallet) is required");
  }

  const eth = window.ethereum;

  // Ensure the correct chain is active.
  const currentChainHex = (await eth.request({ method: "eth_chainId" })) as string;
  const currentChainId  = parseInt(currentChainHex, 16);
  if (currentChainId !== chainId) {
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (err) {
      throw new Error(
        `Please switch to Robinhood Chain (chainId ${chainId}) in your wallet. ` +
        (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  const [fromAddress] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!fromAddress) throw new Error("No accounts available in wallet");

  const rawAmount = toBaseUnits(amount, decimals);
  const data      = encodeTransferData(treasuryAddress, rawAmount);

  const txHash = (await eth.request({
    method: "eth_sendTransaction",
    params: [{
      from:  fromAddress,
      to:    tokenAddress,
      data,
      gas:   "0x186A0", // 100 000
      value: "0x0",
    }],
  })) as string;

  if (!txHash) throw new Error("Transaction was rejected or returned no hash");

  // Poll until the tx lands (up to ~60 s).
  const MAX_POLLS = 30;
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((r) => setTimeout(r, 2000));
    const receipt = (await eth.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as { status?: string } | null;
    if (receipt) {
      if (receipt.status === "0x1") return { txId: txHash };
      if (receipt.status === "0x0") throw new Error(`Transaction reverted: ${txHash}`);
    }
  }

  // Return the hash anyway — the server-side verifier will do one more poll.
  return { txId: txHash };
}
