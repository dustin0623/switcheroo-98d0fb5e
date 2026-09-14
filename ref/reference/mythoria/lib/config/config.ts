// lib/config/config.ts
// This is the ONLY file that reads process.env. All other files import from here.

export type SupportedChain = "hive" | "solana" | "robinhood";

function resolveChain(): SupportedChain {
  const raw = (
    process.env.NEXT_PUBLIC_CHAIN ??
    process.env.CHAIN ??
    "hive"
  ).toLowerCase();
  if (raw === "solana") return "solana";
  if (raw === "robinhood") return "robinhood";
  return "hive"; // Mythoria default
}

function parseRpcNodes(raw: string | undefined, fallback: string): string[] {
  if (!raw) return [fallback];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export const config = {
  mongoUri:  process.env.MONGODB_URI!,
  mongoDb:   process.env.MONGODB_DB ?? "mythoria",
  jwtSecret: process.env.JWT_SECRET ?? "changeme-dev-secret",

  withdrawal: {
    workerPollMs: Number(process.env.WORKER_POLL_MS ?? 5000),
    maxRetries:   Number(process.env.WORKER_MAX_RETRIES ?? 8),
  },

  // Shared blockchain config + per-chain namespaced sub-objects.
  blockchain: {
    chain:           resolveChain(),
    treasuryAddress: process.env.TREASURY_ADDRESS ?? "",
    treasuryKey:     process.env.TREASURY_KEY     ?? "",
    contractAddress: process.env.CONTRACT_ADDRESS ?? "",
    walletEnabled:   process.env.NEXT_PUBLIC_WALLET_ENABLED === "true",
    wsUrl:           process.env.NEXT_PUBLIC_WS_URL ?? "",

    // ---------- Hive + Hive-Engine ----------
    hive: {
      rpcNodes:     parseRpcNodes(process.env.HIVE_RPC_NODES, "https://api.hive.blog"),
      engineRpcUrl: process.env.HIVE_ENGINE_RPC_URL ?? "https://api.hive-engine.com/rpc",
      engineId:     process.env.HIVE_ENGINE_ID      ?? "ssc-mainnet-hive",
      tokenSymbol:  process.env.CONTRACT_ADDRESS    ?? "",
      precision:    Number(process.env.HIVE_TOKEN_PRECISION ?? 3),
    },

    // ---------- Solana ----------
    solana: {
      rpcUrl:      process.env.SOLANA_RPC_URL    ?? "https://api.mainnet-beta.solana.com",
      heliusApiKey: process.env.HELIUS_API_KEY   ?? "",
      mint:        process.env.CONTRACT_ADDRESS  ?? "",
    },

    // ---------- Robinhood (EVM L2, chain id 4663) ----------
    robinhood: {
      rpcUrl:       process.env.ROBINHOOD_RPC_URL   ?? "https://rpc.robinhood.com",
      chainId:      Number(process.env.ROBINHOOD_CHAIN_ID ?? 4663),
      tokenAddress: process.env.CONTRACT_ADDRESS    ?? "",
      decimals:     Number(process.env.ROBINHOOD_TOKEN_DECIMALS ?? 18),
    },
  },
} as const;
