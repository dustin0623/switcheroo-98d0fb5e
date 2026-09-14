// src/lib/config/config.ts
// This is the ONLY file that reads process.env. All other files import from here.
// Solana-only — no multi-chain fallback.

export type SupportedChain = "solana";

export const config = {
  mongoUri:  process.env["MONGODB_URI"]!,
  mongoDb:   process.env["MONGODB_DB"] ?? "cryptocore",
  jwtSecret: process.env["JWT_SECRET"] ?? "changeme-dev-secret",
  serverApiUrl: process.env["SERVER_API_URL"] ?? "http://localhost:3000",


  withdrawal: {
    workerPollMs: Number(process.env["WORKER_POLL_MS"] ?? 5000),
    maxRetries:   Number(process.env["WORKER_MAX_RETRIES"] ?? 8),
  },

  blockchain: {
    chain:           "solana" as SupportedChain,
    treasuryAddress: process.env["TREASURY_ADDRESS"] ?? "",
    treasuryKey:     process.env["TREASURY_KEY"]     ?? "",
    contractAddress: process.env["CONTRACT_ADDRESS"] ?? "",

    solana: {
      rpcUrl:      process.env["SOLANA_RPC_URL"]  ?? "https://api.devnet.solana.com",
      heliusApiKey: process.env["HELIUS_API_KEY"] ?? "",
      mint:        process.env["CONTRACT_ADDRESS"] ?? "",
    },
  },
} as const;
