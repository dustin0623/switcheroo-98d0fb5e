/**
 * lib/chain/robinhood/rpc.ts
 *
 * Robinhood Chain (EVM L2, chain id 4663) provider + treasury signer +
 * ERC-20 token contract accessors, built on ethers v6.
 * SERVER-ONLY.
 */

import { JsonRpcProvider, Wallet, Contract } from "ethers";
import { config } from "@/lib/config/config";

const rh = config.blockchain.robinhood;

export const ERC20_ABI = [
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

let _provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (!_provider) {
    _provider = new JsonRpcProvider(rh.rpcUrl, rh.chainId, { staticNetwork: true });
  }
  return _provider;
}

function normalisePk(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("TREASURY_KEY env var is not set");
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

let _wallet: Wallet | null = null;

export function getTreasuryWallet(): Wallet {
  if (!_wallet) {
    _wallet = new Wallet(normalisePk(config.blockchain.treasuryKey), getProvider());
  }
  return _wallet;
}

export function resetProvider(): void {
  _provider = null;
  _wallet   = null;
  _decimals = null;
}

export function getTokenContract(): Contract {
  if (!rh.tokenAddress) throw new Error("ROBINHOOD_TOKEN_ADDRESS (or CONTRACT_ADDRESS) is not set");
  return new Contract(rh.tokenAddress, ERC20_ABI, getTreasuryWallet());
}

let _decimals: number | null = null;

export async function getTokenDecimals(): Promise<number> {
  if (_decimals !== null) return _decimals;
  try {
    const token = new Contract(rh.tokenAddress, ERC20_ABI, getProvider());
    _decimals = Number(await token.decimals());
  } catch {
    _decimals = rh.decimals;
  }
  return _decimals;
}
