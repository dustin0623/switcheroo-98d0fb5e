# Mythoria — Full Database & API Integration Guide

This is the single source of truth for wiring Mythoria to a real MongoDB backend,
implementing the multi-chain token flow, and migrating every mock route to a
production-ready route. It is modelled directly on the architecture from
`reference/boom-miner`.

Read this document top to bottom before prompting any implementation phase.
Each phase is self-contained and can be implemented in a single prompt.

---

## Architecture Overview

The codebase follows a strict three-layer pattern from boom-miner:

```
lib/config/       — central config (reads env vars, NEVER import process.env elsewhere)
lib/chain/        — chain adapters (server-only: verify, transfer, memo, rpc)
lib/client/       — browser-side chain helpers (deposit flows per chain)
lib/modules/      — domain modules, each with types / model / repository
  players/
  items/
  crates/
  transactions-pending/
  transactions-processed/
  ... (one folder per domain)
server/
  game-smart-contract/   — standalone Node worker (drains pending queue)
app/api/               — Next.js Route Handlers (thin: auth → repository → response)
```

**Rules:**
- Route Handlers are thin. They only: verify auth, call a repository function, return a response.
- All business logic lives in `lib/modules/<domain>/repository.server.ts`.
- `lib/config/config.ts` is the ONLY file that reads `process.env`. All other files import from it.
- Files in `lib/modules/`, `lib/chain/`, `lib/config/` that touch DB or secrets must never be
  imported in `"use client"` files. Suffix them `.server.ts` to enforce this.
- `lib/client/` files are `"use client"` — they handle wallet signing in the browser.

---

## 27 Collections Reference

### Core Game (10)
| Collection | Key indexes |
|---|---|
| `players` | `wallet` unique (primary key), `username` unique |
| `items` | `item_number` unique, `owner`, `market.listed + market.price` |
| `crates` | `item_number` unique, `owner`, `market.listed` |
| `item-templates` | `id` unique — seeded once, read-only |
| `consumables` | `{ wallet, type }` compound unique |
| `relics` | `{ wallet, type }` compound unique |
| `quest-templates` | `_id`, `active`, `tier` |
| `quest-board` | `date` unique — single doc replaced daily by cron |
| `active-quests` | `wallet`, `board_date`, `collected` |
| `price_feed` | `date: "global"` — single doc |

### Config (2)
| Collection | Key indexes |
|---|---|
| `planet-config` | `name` unique |
| `stats` | `date` unique — `"global"` or `"YYYY-MM-DD"` |

### Supply Counters (2)
| Collection | Key indexes |
|---|---|
| `item-count` | `supply: "total"` — single doc |
| `crate-count` | `supply: "total"` — single doc |

### Token Transactions (2)
| Collection | Key indexes |
|---|---|
| `transactions_pending` | `signature` unique, `{ status, createdAt }` |
| `transactions_processed` | `txHash` unique, `{ wallet, processedAt: -1 }` |

### Registration (2)
| Collection | Key indexes |
|---|---|
| `registrations` | `wallet` unique, `time` |
| `referrers` | `wallet`, `referrer`, `time` |

### Logs (9)
| Collection | Written by |
|---|---|
| `claims` | `POST /api/player/claim` |
| `battle_logs` | `POST /api/player/attack` |
| `boss-log` | `POST /api/player/boss` |
| `forge-log` | `POST /api/items/[id]/forge` |
| `salvage-log` | `POST /api/items/[id]/salvage` |
| `nft-mints` | `POST /api/crates/[id]/open` |
| `nft-drops` | `POST /api/player/boss` (loot branch) |
| `marketplace-logs` | Market buy / list / delist routes |
| `quest-log` | Quest start + collect routes |

**Total: 27 collections.**

---

## Environment Variables

Copy to `.env.local` and fill in your values.

```bash
# ----------------------------------------------------------------
# Database
# ----------------------------------------------------------------
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
MONGODB_DB=mythoria

# ----------------------------------------------------------------
# Auth
# Generate with: openssl rand -base64 32
# ----------------------------------------------------------------
JWT_SECRET=

# ----------------------------------------------------------------
# Blockchain
# "hive" | "solana" | "robinhood"  (default: hive)
# NEXT_PUBLIC_CHAIN is readable on both server and client.
# ----------------------------------------------------------------
NEXT_PUBLIC_CHAIN=hive

# Chain-agnostic treasury — these three are the ONLY chain vars required.
# For Hive:      TREASURY_ADDRESS = hive username,  TREASURY_KEY = WIF posting/active key,
#                CONTRACT_ADDRESS = Hive-Engine token symbol (e.g. MGOLD)
# For Solana:    TREASURY_ADDRESS = base58 pubkey,  TREASURY_KEY = base58 or JSON byte-array private key,
#                CONTRACT_ADDRESS = SPL mint address
# For Robinhood: TREASURY_ADDRESS = 0x… EVM address, TREASURY_KEY = hex private key,
#                CONTRACT_ADDRESS = ERC-20 token address
TREASURY_ADDRESS=
TREASURY_KEY=
CONTRACT_ADDRESS=

# Solana only — server-side RPC enhancer for on-chain verification (helius.dev).
# When set, server talks to https://mainnet.helius-rpc.com/?api-key=...
# Never exposed to the client.
HELIUS_API_KEY=

# ----------------------------------------------------------------
# Feature flags
# ----------------------------------------------------------------
# Set "true" to open deposits + withdrawals. Any other value disables them.
NEXT_PUBLIC_WALLET_ENABLED=false

# ----------------------------------------------------------------
# WebSocket Engine  (the standalone WS server, if used)
# ----------------------------------------------------------------
PORT=4000
CORS_ORIGIN=https://your-app.vercel.app
NEXT_PUBLIC_WS_URL=https://ws.your-domain.com
```

> **Nothing else is needed.** Each chain adapter in `lib/chain/<chain>/` reads only
> `TREASURY_ADDRESS`, `TREASURY_KEY`, `CONTRACT_ADDRESS`, and `NEXT_PUBLIC_CHAIN`
> from `lib/config/config.ts`. There are no `HIVE_*`, `SOLANA_RPC_URL`, or
> `ROBINHOOD_*` variables — all chain-specific defaults (RPC nodes, decimals,
> engine IDs) are hardcoded inside the adapter files and can be changed there
> without touching env vars.

---

---

# Phase 1 — Foundation: Config, DB, Auth, Chain Layer

**Goal:** All infrastructure is wired. The app can connect to MongoDB, authenticate
a player via any chain, and issue/verify JWT sessions. No game logic yet.

---

## Step 1.1 — Central Config

Create `lib/config/config.ts`. This is the ONLY file that reads `process.env`.

```ts
// lib/config/config.ts
export type SupportedChain = "hive" | "solana" | "robinhood";

function resolveChain(): SupportedChain {
  const raw = (
    process.env.NEXT_PUBLIC_CHAIN ??
    process.env.CHAIN ??
    "hive"
  ).toLowerCase();
  if (raw === "solana")    return "solana";
  if (raw === "robinhood") return "robinhood";
  return "hive"; // Mythoria default
}

export const config = {
  mongoUri:  process.env.MONGODB_URI!,
  mongoDb:   process.env.MONGODB_DB ?? "mythoria",
  jwtSecret: process.env.JWT_SECRET ?? "changeme-dev-secret",

  withdrawal: {
    workerPollMs: 5000,
    maxRetries:   8,
  },

  // Only these three env vars are required — chain adapters handle everything else.
  blockchain: {
    chain:           resolveChain(),
    treasuryAddress: process.env.TREASURY_ADDRESS!,
    treasuryKey:     process.env.TREASURY_KEY!,
    contractAddress: process.env.CONTRACT_ADDRESS!,
    // Solana server-side RPC enhancer (optional, helius.dev)
    heliusApiKey:    process.env.HELIUS_API_KEY ?? "",
    // WebSocket engine
    wsUrl:           process.env.NEXT_PUBLIC_WS_URL ?? "",
    walletEnabled:   process.env.NEXT_PUBLIC_WALLET_ENABLED === "true",
  },
} as const;
```

---

## Step 1.2 — Database Connection

```ts
// lib/config/database.ts
import mongoose from "mongoose";
import { config } from "./config";

declare global {
  var _mongooseConnection: Promise<typeof mongoose> | undefined;
}

export async function connectDatabase(): Promise<typeof mongoose> {
  if (global._mongooseConnection) return global._mongooseConnection;
  if (!config.mongoUri) throw new Error("MONGODB_URI is not set");
  global._mongooseConnection = mongoose.connect(config.mongoUri, {
    dbName: config.mongoDb,
    bufferCommands: false,
  });
  return global._mongooseConnection;
}
```

---

## Step 1.3 — JWT Auth

```ts
// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from "jose";
import { config } from "@/lib/config/config";

const secret = new TextEncoder().encode(config.jwtSecret);

export async function signToken(wallet: string, chain: string): Promise<string> {
  return new SignJWT({ wallet, chain })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(
  token: string
): Promise<{ wallet: string; chain: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { wallet: string; chain: string };
  } catch {
    return null;
  }
}
```

```ts
// lib/api/get-wallet.ts  — extracts the authenticated wallet from any request
import { verifyToken } from "@/lib/auth/jwt";

export async function getWallet(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.wallet ?? null;
}
```

```ts
// lib/api/error-response.ts
export function apiOk(data: unknown, status = 200): Response {
  return Response.json({ success: true, ...data as object }, { status });
}
export function apiError(message: string, code: string, status: number): Response {
  return Response.json({ success: false, error: message, code }, { status });
}
```

---

## Step 1.4 — Chain Adapters (Server)

Each chain adapter lives in `lib/chain/<chain>/` and contains three files:
- `verify.ts` — signature verification
- `transfer.ts` — outbound treasury transfer (withdrawal payouts)
- `deposit.ts` — generate deposit address / memo for inbound transfers

All chain-specific constants (RPC URLs, engine IDs, decimals, chain IDs) are
**hardcoded inside the adapter files**. To change a network endpoint, edit
the adapter — not env vars.

```
lib/chain/
  index.ts           — re-exports the active chain's functions based on config.blockchain.chain
  hive/
    verify.ts        — verifyHive(wallet, message, signature)
    transfer.ts      — transferHive(to, amount, memo)   → txHash
    deposit.ts       — getHiveDepositAddress()
  solana/
    verify.ts        — verifySolana(wallet, message, signature)
    transfer.ts      — transferSolana(to, amount, memo) → txHash
    deposit.ts       — getSolanaDepositAddress()
  robinhood/
    verify.ts        — verifyRobinhood(wallet, message, signature)
    transfer.ts      — transferRobinhood(to, amount, memo) → txHash
    deposit.ts       — getRobinhoodDepositAddress()
```

**`lib/chain/index.ts`** — routes all calls to the active adapter:
```ts
import { config } from "@/lib/config/config";

export async function verifySignature(wallet: string, message: string, sig: string) {
  const { verify } = await import(`./lib/chain/${config.blockchain.chain}/verify`);
  return verify(wallet, message, sig);
}
export async function sendTransfer(to: string, amount: number, memo: string) {
  const { transfer } = await import(`./lib/chain/${config.blockchain.chain}/transfer`);
  return transfer(to, amount, memo);
}
```

**`lib/chain/hive/verify.ts`** (hardcoded Hive defaults, no env vars):
```ts
// RPC endpoint hardcoded — change here if needed, not in .env
const HIVE_RPC = "https://api.hive.blog";

async function verifyHive(wallet: string, _message: string, signature: string): Promise<boolean> {
  try {
    if (!signature || signature.length < 10) return false;
    const res = await fetch(HIVE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", method: "condenser_api.get_accounts",
        params: [[wallet.toLowerCase()]], id: 1,
      }),
    });
    const json = await res.json() as { result?: Array<{ posting?: { key_auths?: Array<[string, number]> } }> };
    const postingKeys = json.result?.[0]?.posting?.key_auths?.map(([k]) => k) ?? [];
    // TODO: replace with full @hiveio/hive-js cryptographic recovery in production.
    return postingKeys.length > 0;
  } catch { return false; }
}

// Solana adapter (lib/chain/solana/verify.ts) — no env vars needed
async function verifySolana(wallet: string, message: string, signature: string): Promise<boolean> {
  try {
    const { default: bs58 } = await import("bs58");
    const { default: nacl } = await import("tweetnacl");
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = bs58.decode(signature);
    const pubBytes = bs58.decode(wallet);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes);
  } catch { return false; }
}

// Robinhood adapter (lib/chain/robinhood/verify.ts) — no env vars needed
async function verifyRobinhood(wallet: string, message: string, signature: string): Promise<boolean> {
  try {
    const { ethers } = await import("ethers");
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === wallet.toLowerCase();
  } catch { return false; }
}
```

`lib/auth/verify-signature.server.ts` routes to the active adapter:
```ts
import { config } from "@/lib/config/config";

export function getActiveChain() { return config.blockchain.chain; }

export async function verifyWalletSignature(opts: {
  wallet: string; message: string; signature: string;
}): Promise<boolean> {
  // Dynamic import so only the active chain's deps are bundled
  const { verify } = await import(`@/lib/chain/${config.blockchain.chain}/verify`);
  return verify(opts.wallet, opts.message, opts.signature);
}
```

---

## Step 1.5 — Client Chain Switcher

```ts
// lib/client/chain.ts
"use client";
const raw = (process.env.NEXT_PUBLIC_CHAIN ?? "hive").toLowerCase();
export const activeChain: "hive" | "solana" | "robinhood" =
  raw === "solana" ? "solana" : raw === "robinhood" ? "robinhood" : "hive";
```

---

## Step 1.6 — Auth Routes

```
POST /api/auth/login    — verify signature → issue JWT → upsert player doc
POST /api/auth/register — alias for login (creates player if not exists)
```

**`app/api/auth/login/route.ts`:**
```ts
import { apiOk, apiError } from "@/lib/api/error-response";
import { verifyWalletSignature, getActiveChain } from "@/lib/auth/verify-signature.server";
import { signToken } from "@/lib/auth/jwt";
import { upsertPlayer } from "@/lib/modules/players/repository.server";

export async function POST(req: Request): Promise<Response> {
  const { wallet, message, signature } = await req.json() as {
    wallet: string; message: string; signature: string;
  };
  if (!wallet || !message || !signature) {
    return apiError("Missing wallet, message, or signature", "INVALID_BODY", 400);
  }
  const chain = getActiveChain();
  const valid = await verifyWalletSignature({ wallet, message, signature });
  if (!valid) return apiError("Signature verification failed", "INVALID_SIGNATURE", 401);

  await upsertPlayer({ wallet, chain });
  const token = await signToken(wallet, chain);
  return apiOk({ token, wallet, chain });
}
```

---

## Step 1.7 — Index Creation Script

Create `scripts/create-indexes.ts` and run once after first deploy:

```ts
// scripts/create-indexes.ts
import { connectDatabase } from "@/lib/config/database";
import mongoose from "mongoose";

async function run() {
  await connectDatabase();
  const db = mongoose.connection.db!;

  await db.collection("players").createIndex({ wallet: 1 }, { unique: true });
  await db.collection("players").createIndex({ username: 1 }, { unique: true, sparse: true });
  await db.collection("players").createIndex({ favor: -1 });
  await db.collection("players").createIndex({ coins: -1 });

  await db.collection("items").createIndex({ item_number: 1 }, { unique: true });
  await db.collection("items").createIndex({ owner: 1 });
  await db.collection("items").createIndex({ "market.listed": 1, "market.price": 1 });

  await db.collection("crates").createIndex({ item_number: 1 }, { unique: true });
  await db.collection("crates").createIndex({ owner: 1 });
  await db.collection("crates").createIndex({ "market.listed": 1 });

  await db.collection("consumables").createIndex({ wallet: 1, type: 1 }, { unique: true });
  await db.collection("relics").createIndex({ wallet: 1, type: 1 }, { unique: true });

  await db.collection("active-quests").createIndex({ wallet: 1, collected: 1 });
  await db.collection("active-quests").createIndex({ wallet: 1, board_date: 1 });

  await db.collection("claims").createIndex({ wallet: 1, time: -1 });
  await db.collection("battle_logs").createIndex({ wallet: 1, timestamp: -1 });
  await db.collection("battle_logs").createIndex({ attacked: 1, timestamp: -1 });
  await db.collection("boss-log").createIndex({ wallet: 1, time: -1 });
  await db.collection("forge-log").createIndex({ wallet: 1, time: -1 });
  await db.collection("salvage-log").createIndex({ wallet: 1, time: -1 });
  await db.collection("nft-mints").createIndex({ owner: 1, timestamp: -1 });
  await db.collection("marketplace-logs").createIndex({ created: -1 });
  await db.collection("marketplace-logs").createIndex({ buyer: 1, created: -1 });
  await db.collection("marketplace-logs").createIndex({ seller: 1, created: -1 });
  await db.collection("quest-log").createIndex({ wallet: 1, time: -1 });

  await db.collection("transactions_pending").createIndex({ signature: 1 }, { unique: true });
  await db.collection("transactions_pending").createIndex({ status: 1, createdAt: 1 });
  await db.collection("transactions_processed").createIndex({ txHash: 1 }, { unique: true });
  await db.collection("transactions_processed").createIndex({ wallet: 1, processedAt: -1 });

  await db.collection("stats").createIndex({ date: 1 }, { unique: true });
  await db.collection("price_feed").createIndex({ date: 1 }, { unique: true });
  await db.collection("planet-config").createIndex({ name: 1 }, { unique: true });
  await db.collection("quest-board").createIndex({ date: 1 }, { unique: true });
  await db.collection("item-templates").createIndex({ id: 1 }, { unique: true });
  await db.collection("registrations").createIndex({ wallet: 1 }, { unique: true });

  console.log("All indexes created.");
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
```

---

---

# Phase 2 — Player Module & Core Read Routes

**Goal:** Player data is stored in and read from MongoDB. The play page loads a
real player. All mock read routes for player/leaderboard/stats are replaced.

---

## Step 2.1 — Player Module

```
lib/modules/players/
  types.server.ts
  model.server.ts
  repository.server.ts
```

**`types.server.ts`:**
```ts
import type { Document } from "mongoose";

export interface IPlayer extends Document {
  wallet:            string;    // primary key — on-chain address / Hive username
  username?:         string;    // optional display name
  chain:             string;    // "hive" | "solana" | "robinhood"
  registrationTime:  number;

  // Core stats
  engineering:       number;
  damage:            number;
  defense:           number;
  favor:             number;
  experience:        number;
  level:             number;

  // Economy
  coins:             number;    // in-game balance (pending on-chain)
  hiveEngineScrap:   number;    // confirmed on-chain balance (displayed)
  hiveEngineStake:   number;
  stashsize:         number;
  flux:              number;
  scrap:             number;    // accumulated since last claim

  // Items (equipped slots)
  items: {
    weapon?:  EquippedItem;
    armor?:   EquippedItem;
    ship?:    EquippedItem;
    special?: EquippedItem;
    avatar?:  EquippedItem;
  };

  // Boss data per planet
  boss_data: Array<{ name: string; level: number; lastBattle: number }>;

  // Timing
  last_upgrade_time:  number;
  lastRewardTime:     number;
  lastBattle:         number;
  lastclaim:          number;
  cooldown:           number;

  // Withdrawal tracking
  withdrawnToday:     number;
  lastWithdrawnAt:    number;

  // Protection
  protection_time:    number;
  attacks:            number;
  claims:             number;

  // Computed / cached stats
  stats: {
    luck:   number;
    dodge:  number;
    crit:   number;
    speed:  number;
  };

  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquippedItem {
  item_number: number;
  item_id:     string;
  item_equipped: boolean;
  rarity:      string;
  level:       number;
  attributes:  { damage: number; defense: number; engineering: number;
                 dodge: number; crit: number; luck: number };
}
```

**`model.server.ts`:**
```ts
import mongoose, { Schema, Model } from "mongoose";
import type { IPlayer } from "./types.server";

const EquippedItemSchema = new Schema({
  item_number:   Number,
  item_id:       String,
  item_equipped: Boolean,
  rarity:        String,
  level:         { type: Number, default: 1 },
  attributes:    { damage: Number, defense: Number, engineering: Number,
                   dodge: Number, crit: Number, luck: Number },
}, { _id: false });

const PlayerSchema = new Schema<IPlayer>({
  wallet:           { type: String, required: true, unique: true, index: true },
  username:         { type: String, sparse: true },
  chain:            { type: String, required: true, default: "hive" },
  registrationTime: { type: Number, default: () => Date.now() },

  engineering: { type: Number, default: 0 },
  damage:      { type: Number, default: 0 },
  defense:     { type: Number, default: 0 },
  favor:       { type: Number, default: 0 },
  experience:  { type: Number, default: 0 },
  level:       { type: Number, default: 1 },

  coins:           { type: Number, default: 0 },
  hiveEngineScrap: { type: Number, default: 0 },
  hiveEngineStake: { type: Number, default: 0 },
  stashsize:       { type: Number, default: 1 },
  flux:            { type: Number, default: 0 },
  scrap:           { type: Number, default: 0 },

  items: {
    weapon:  { type: EquippedItemSchema },
    armor:   { type: EquippedItemSchema },
    ship:    { type: EquippedItemSchema },
    special: { type: EquippedItemSchema },
    avatar:  { type: EquippedItemSchema },
  },

  boss_data: [{ name: String, level: Number, lastBattle: Number }],

  last_upgrade_time: { type: Number, default: 0 },
  lastRewardTime:    { type: Number, default: 0 },
  lastBattle:        { type: Number, default: 0 },
  lastclaim:         { type: Number, default: 0 },
  cooldown:          { type: Number, default: 0 },

  withdrawnToday:  { type: Number, default: 0 },
  lastWithdrawnAt: { type: Number, default: 0 },
  protection_time: { type: Number, default: 0 },
  attacks:         { type: Number, default: 0 },
  claims:          { type: Number, default: 0 },

  stats: {
    luck:  { type: Number, default: 0 },
    dodge: { type: Number, default: 0 },
    crit:  { type: Number, default: 0 },
    speed: { type: Number, default: 1 },
  },

  version: { type: Number, default: 0 },
}, { collection: "players", timestamps: true });

export const PlayerModel: Model<IPlayer> =
  mongoose.models.Player ??
  mongoose.model<IPlayer>("Player", PlayerSchema);
```

**`repository.server.ts` — key functions:**
```ts
import { PlayerModel } from "./model.server";
import { connectDatabase } from "@/lib/config/database";

export async function upsertPlayer(input: { wallet: string; chain: string }) {
  await connectDatabase();
  return PlayerModel.findOneAndUpdate(
    { wallet: input.wallet },
    { $setOnInsert: { wallet: input.wallet, chain: input.chain, registrationTime: Date.now() } },
    { upsert: true, new: true },
  );
}

export async function findPlayerByWallet(wallet: string) {
  await connectDatabase();
  return PlayerModel.findOne({ wallet }).lean();
}

export async function addCoins(wallet: string, amount: number): Promise<void> {
  await connectDatabase();
  await PlayerModel.updateOne({ wallet }, { $inc: { coins: amount } });
}

export async function deductCoins(wallet: string, amount: number): Promise<{ ok: boolean }> {
  await connectDatabase();
  const result = await PlayerModel.updateOne(
    { wallet, coins: { $gte: amount } },
    { $inc: { coins: -amount } },
  );
  return { ok: result.modifiedCount > 0 };
}
```

---

## Step 2.2 — Player Read Route

```
GET /api/player/me       — authenticated player (replaces GET /api/mock/player/[user])
GET /api/player/[wallet] — public player profile
```

**`app/api/player/me/route.ts`:**
```ts
import { apiOk, apiError } from "@/lib/api/error-response";
import { getWallet }        from "@/lib/api/get-wallet";
import { findPlayerByWallet } from "@/lib/modules/players/repository.server";

export async function GET(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);
  const player = await findPlayerByWallet(wallet);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);
  return apiOk({ player });
}
```

---

## Step 2.3 — Leaderboard, Richlist, Stats Routes

Replace `GET /api/mock/leaderboard`, `GET /api/mock/richlist`, `GET /api/mock/stats`.

**`app/api/leaderboard/route.ts`:**
```ts
import { connectDatabase } from "@/lib/config/database";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { apiOk } from "@/lib/api/error-response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest): Promise<Response> {
  await connectDatabase();
  const limit  = Math.min(200, Number(req.nextUrl.searchParams.get("limit")  ?? 100));
  const offset = Math.max(0,   Number(req.nextUrl.searchParams.get("offset") ?? 0));
  const players = await PlayerModel
    .find({}, { wallet:1, username:1, favor:1, level:1, experience:1,
                engineering:1, damage:1, defense:1, hiveEngineScrap:1, items:1, stats:1 })
    .sort({ favor: -1 })
    .skip(offset).limit(limit).lean();
  return apiOk({ players });
}
```

**`app/api/stats/route.ts`:**
```ts
import { connectDatabase } from "@/lib/config/database";
import mongoose from "mongoose";
import { apiOk } from "@/lib/api/error-response";

export async function GET(): Promise<Response> {
  await connectDatabase();
  const db = mongoose.connection.db!;
  const [global_, daily] = await Promise.all([
    db.collection("stats").findOne({ date: "global" }, { projection: { _id: 0 } }),
    db.collection("stats")
      .find({ date: { $regex: /^\d{4}-\d{2}-\d{2}$/ } })
      .sort({ date: 1 }).toArray(),
  ]);
  return apiOk({ global: global_, daily });
}
```

---

## Step 2.4 — Frontend Migration (Play Page)

In `stores/game-store.ts` (or wherever `fetchPlayer` is defined):

```ts
// Change BASE from mock to real
const BASE = "/api";  // was "/api/mock"

// Change fetchPlayer to use auth token + /api/player/me
async fetchPlayer() {
  const token = localStorage.getItem("mythoria_token");
  const res = await fetch(`${BASE}/player/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load player");
  const data = await res.json();
  set({ player: data.player });
}
```

---

---

# Phase 3 — Transaction Module & Token Flow

**Goal:** Deposits, withdrawals and crate-shop purchases all flow through
`transactions_pending` → `transactions_processed`. The smart contract worker
processes the queue and settles on-chain.

This is the most critical phase — follow the boom-miner pattern exactly.

---

## Step 3.1 — transactions-pending Module

```
lib/modules/transactions-pending/
  types.server.ts
  model.server.ts
  repository.server.ts
```

**`types.server.ts`:**
```ts
import type { Document } from "mongoose";

export type InboundTxStatus  = "pending" | "failed" | "dead";
export type PendingTxType    = "withdrawal" | "deposit" | "crate_purchase" | "market_purchase";

export interface IInboundTransaction extends Document {
  type:          PendingTxType;
  signature:     string;       // idempotency key — UUID for withdrawal, txId for deposit
  walletAddress: string;       // payer / recipient

  // withdrawal fields
  withdrawAmount?: number;

  // deposit fields (deposit = player sends tokens to treasury)
  depositAmount?:  number;
  depositTxId?:    string;

  // crate purchase (off-chain shop)
  crateRarity?:    string;
  crateCount?:     number;

  // market purchase
  itemNumber?:     number;
  itemType?:       string;     // "item" | "crate" | "consumable" | "relic"

  status:          InboundTxStatus;
  retryCount:      number;
  lastError?:      string;
  createdAt:       Date;
  updatedAt:       Date;
}
```

**`model.server.ts`:**
```ts
import mongoose, { Schema, Model } from "mongoose";
import type { IInboundTransaction } from "./types.server";

const InboundTransactionSchema = new Schema<IInboundTransaction>({
  type:          { type: String, required: true,
                   enum: ["withdrawal", "deposit", "crate_purchase", "market_purchase"] },
  signature:     { type: String, required: true, unique: true, index: true },
  walletAddress: { type: String, required: true },

  withdrawAmount: Number,
  depositAmount:  Number,
  depositTxId:    String,
  crateRarity:    String,
  crateCount:     Number,
  itemNumber:     Number,
  itemType:       String,

  status:     { type: String, required: true,
                enum: ["pending", "failed", "dead"], default: "pending" },
  retryCount: { type: Number, default: 0 },
  lastError:  String,
}, { collection: "transactions_pending", timestamps: true });

InboundTransactionSchema.index({ status: 1, createdAt: 1 });

export const InboundTransactionModel: Model<IInboundTransaction> =
  mongoose.models.InboundTransaction ??
  mongoose.model<IInboundTransaction>("InboundTransaction", InboundTransactionSchema);
```

**`repository.server.ts` — key functions:**
```ts
import { randomUUID } from "crypto";
import { InboundTransactionModel } from "./model.server";
import type { IInboundTransaction, InboundTxStatus } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

const DEFAULT_MAX_RETRIES = 8;

export async function enqueueWithdrawal(input: {
  walletAddress: string;
  withdrawAmount: number;
}): Promise<{ jobId: string; signature: string }> {
  await connectDatabase();
  const signature = randomUUID();
  const doc = await InboundTransactionModel.create({
    type: "withdrawal", signature,
    walletAddress: input.walletAddress,
    withdrawAmount: input.withdrawAmount,
    status: "pending", retryCount: 0,
  });
  return { jobId: String(doc._id), signature };
}

export async function enqueueDeposit(input: {
  walletAddress: string;
  depositAmount:  number;
  depositTxId:    string;
}): Promise<{ jobId: string; duplicate: boolean }> {
  await connectDatabase();
  try {
    const doc = await InboundTransactionModel.create({
      type: "deposit", signature: input.depositTxId,
      walletAddress: input.walletAddress,
      depositAmount: input.depositAmount,
      depositTxId:   input.depositTxId,
      status: "pending", retryCount: 0,
    });
    return { jobId: String(doc._id), duplicate: false };
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) return { jobId: "", duplicate: true };
    throw err;
  }
}

export async function enqueueCratePurchase(input: {
  walletAddress: string;
  crateRarity:   string;
  crateCount:    number;
  depositTxId:   string;
}): Promise<{ jobId: string; duplicate: boolean }> {
  await connectDatabase();
  try {
    const doc = await InboundTransactionModel.create({
      type: "crate_purchase", signature: input.depositTxId,
      walletAddress: input.walletAddress,
      crateRarity:   input.crateRarity,
      crateCount:    input.crateCount,
      status: "pending", retryCount: 0,
    });
    return { jobId: String(doc._id), duplicate: false };
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) return { jobId: "", duplicate: true };
    throw err;
  }
}

export async function enqueueMarketPurchase(input: {
  walletAddress: string;
  itemNumber:    number;
  itemType:      string;
  depositTxId:   string;
}): Promise<{ jobId: string; duplicate: boolean }> {
  await connectDatabase();
  try {
    const doc = await InboundTransactionModel.create({
      type: "market_purchase", signature: input.depositTxId,
      walletAddress: input.walletAddress,
      itemNumber:    input.itemNumber,
      itemType:      input.itemType,
      status: "pending", retryCount: 0,
    });
    return { jobId: String(doc._id), duplicate: false };
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) return { jobId: "", duplicate: true };
    throw err;
  }
}

export async function listPendingOldestFirst(limit = 0): Promise<IInboundTransaction[]> {
  await connectDatabase();
  const q = InboundTransactionModel.find({
    status: { $in: ["pending", "failed"] satisfies InboundTxStatus[] },
  }).sort({ createdAt: 1 });
  if (limit > 0) q.limit(limit);
  return q.exec();
}

export async function completeJob(id: string): Promise<void> {
  await connectDatabase();
  await InboundTransactionModel.deleteOne({ _id: id });
}

export async function failJob(
  id: string, message: string, maxRetries = DEFAULT_MAX_RETRIES
): Promise<boolean> {
  await connectDatabase();
  const doc = await InboundTransactionModel.findById(id);
  if (!doc) return false;
  doc.retryCount += 1;
  doc.lastError = message.slice(0, 500);
  const dead = doc.retryCount >= maxRetries;
  doc.status = dead ? "dead" : "failed";
  await doc.save();
  return dead;
}

export async function countJobsByStatus(): Promise<Record<string, number>> {
  await connectDatabase();
  const rows = await InboundTransactionModel.aggregate<{ _id: string; n: number }>([
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  return rows.reduce<Record<string, number>>((acc, r) => { acc[r._id] = r.n; return acc; }, {});
}
```

---

## Step 3.2 — transactions-processed Module

```
lib/modules/transactions-processed/
  types.server.ts
  model.server.ts
  repository.server.ts
```

**`types.server.ts`:**
```ts
import type { Document } from "mongoose";

export type ProcessedTxType =
  | "withdrawal"
  | "deposit"
  | "crate_purchase"
  | "market_purchase";

export type ProcessedTxMetadata =
  | { type: "withdrawal";     payoutTxHash: string }
  | { type: "deposit";        creditedAmount: number }
  | { type: "crate_purchase"; crateNumbers: number[]; rarity: string }
  | { type: "market_purchase"; itemNumber: number; itemType: string };

export interface IProcessedTransaction extends Document {
  txHash:      string;         // unique idempotency key
  wallet:      string;
  type:        ProcessedTxType;
  amount:      number;         // negative for withdrawals, positive for deposits
  processedAt: number;         // Unix ms
  metadata?:   ProcessedTxMetadata;
}
```

**`model.server.ts`:**
```ts
import mongoose, { Schema, Model } from "mongoose";
import type { IProcessedTransaction } from "./types.server";

const ProcessedTransactionSchema = new Schema<IProcessedTransaction>({
  txHash:      { type: String, required: true, unique: true, index: true },
  wallet:      { type: String, required: true },
  type:        { type: String, required: true,
                 enum: ["withdrawal", "deposit", "crate_purchase", "market_purchase"] },
  amount:      { type: Number, required: true },
  processedAt: { type: Number, required: true },
  metadata:    { type: Schema.Types.Mixed },
}, { collection: "transactions_processed" });

ProcessedTransactionSchema.index({ wallet: 1, processedAt: -1 });

export const ProcessedTransactionModel: Model<IProcessedTransaction> =
  mongoose.models.ProcessedTransaction ??
  mongoose.model<IProcessedTransaction>("ProcessedTransaction", ProcessedTransactionSchema);
```

**`repository.server.ts` — key functions:**
```ts
import { ProcessedTransactionModel } from "./model.server";
import type { IProcessedTransaction, ProcessedTxType, ProcessedTxMetadata } from "./types.server";
import { connectDatabase } from "@/lib/config/database";

function isDuplicate(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    "code" in err && (err as { code?: number }).code === 11000;
}

export async function insertProcessedTransaction(input: {
  txHash: string; wallet: string; type: ProcessedTxType;
  amount: number; metadata?: ProcessedTxMetadata;
}): Promise<void> {
  await connectDatabase();
  try {
    await ProcessedTransactionModel.create({
      txHash: input.txHash, wallet: input.wallet,
      type: input.type, amount: input.amount,
      processedAt: Date.now(),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  } catch (err) {
    if (isDuplicate(err)) return; // idempotent no-op
    throw err;
  }
}

export async function claimProcessedTransaction(input: {
  txHash: string; wallet: string; type: ProcessedTxType;
  amount: number; metadata?: ProcessedTxMetadata;
}): Promise<{ claimed: boolean }> {
  await connectDatabase();
  try {
    await ProcessedTransactionModel.create({
      txHash: input.txHash, wallet: input.wallet,
      type: input.type, amount: input.amount,
      processedAt: Date.now(),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
    return { claimed: true };
  } catch (err) {
    if (isDuplicate(err)) return { claimed: false };
    throw err;
  }
}

export async function isTransactionProcessed(txHash: string): Promise<boolean> {
  await connectDatabase();
  const count = await ProcessedTransactionModel.countDocuments({ txHash }).limit(1);
  return count > 0;
}

export async function getTransactionHistory(
  wallet: string, limit: number, cursor?: number, type?: ProcessedTxType,
): Promise<{ transactions: IProcessedTransaction[]; nextCursor: number | null }> {
  await connectDatabase();
  const filter: Record<string, unknown> = { wallet };
  if (type) filter.type = type;
  if (cursor != null) filter.processedAt = { $lt: cursor };
  const rows = await ProcessedTransactionModel.find(filter)
    .sort({ processedAt: -1 }).limit(limit + 1).lean<IProcessedTransaction[]>();
  const hasMore = rows.length > limit;
  const transactions = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? transactions[transactions.length - 1].processedAt : null;
  return { transactions, nextCursor };
}
```

---

## Step 3.3 — Chain Transfer Adapters (Server)

Each file sends tokens from the treasury to a player on-chain.
Create one file per chain — they all export the same function signature.

```
lib/chain/
  verify.ts         — chain-agnostic deposit verifier (routes to sub-adapters)
  hive/
    transfer.ts     — treasury → player HE token transfer
    verify.ts       — verify player → treasury HE transfer (deposit)
    memo.ts         — build/parse memo strings
    rpc.ts          — Hive node helpers
  solana/
    transfer.ts
    verify.ts
    memo.ts
    rpc.ts
  robinhood/
    transfer.ts
    verify.ts
    memo.ts
    rpc.ts
```

**`lib/chain/verify.ts` — chain-agnostic router:**
```ts
// lib/chain/verify.ts
import { config } from "@/lib/config/config";

export async function verifyDepositFromPlayer(
  txId: string,
  expectedWallet: string,
  expectedAmount: number,
): Promise<{ ok: boolean; amount?: number; error?: string }> {
  const chain = config.blockchain.chain;
  if (chain === "hive") {
    const { verifyDepositFromPlayer: verify } = await import("./hive/verify");
    return verify(txId, expectedWallet, expectedAmount);
  }
  if (chain === "robinhood") {
    const { verifyDepositFromPlayer: verify } = await import("./robinhood/verify");
    return verify(txId, expectedWallet, expectedAmount);
  }
  const { verifyDepositFromPlayer: verify } = await import("./solana/verify");
  return verify(txId, expectedWallet, expectedAmount);
}
```

**`lib/chain/hive/transfer.ts` — Hive-Engine treasury payout:**
```ts
// lib/chain/hive/transfer.ts
// Uses dhive or @hiveio/dhive to broadcast custom_json tokens.transfer
// from TREASURY_ADDRESS (active key = TREASURY_KEY in WIF) to playerWallet.
// Returns { signature: hiveTxId }.

import { config } from "@/lib/config/config";

export async function sendHiveTransfer(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<{ signature: string }> {
  const { Client, PrivateKey } = await import("@hiveio/dhive");
  const client = new Client(config.blockchain.hive.rpcNodes);
  const key    = PrivateKey.fromString(config.blockchain.treasuryKey);
  const symbol = config.blockchain.hive.tokenSymbol;
  const qty    = amount.toFixed(config.blockchain.hive.precision);

  const json = JSON.stringify({
    contractName:    "tokens",
    contractAction:  "transfer",
    contractPayload: {
      symbol, to: playerWallet.toLowerCase(),
      quantity: qty, memo: ref,
    },
  });

  const tx = await client.broadcast.json({
    required_auths:           [config.blockchain.treasuryAddress],
    required_posting_auths:   [],
    id:                        config.blockchain.hive.engineId,
    json,
  }, key);

  return { signature: tx.id };
}
```

---

## Step 3.4 — Transaction API Routes

```
POST /api/bank/withdraw     — enqueue withdrawal
POST /api/bank/deposit      — verify on-chain deposit → enqueue credit
POST /api/bank/transactions — paginated history (GET)
```

**`app/api/bank/withdraw/route.ts`:**
```ts
import { apiOk, apiError }        from "@/lib/api/error-response";
import { getWallet }              from "@/lib/api/get-wallet";
import { enqueueWithdrawal }      from "@/lib/modules/transactions-pending/repository.server";
import { findPlayerByWallet }     from "@/lib/modules/players/repository.server";

export async function POST(req: Request): Promise<Response> {
  if (process.env.NEXT_PUBLIC_WALLET_ENABLED !== "true") {
    return apiError("Withdrawals are currently disabled", "WITHDRAWALS_DISABLED", 503);
  }
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const { amount } = await req.json() as { amount: number };
  if (!Number.isInteger(amount) || amount < 1) {
    return apiError("Amount must be an integer >= 1", "INVALID_AMOUNT", 400);
  }

  const player = await findPlayerByWallet(wallet);
  if (!player) return apiError("Player not found", "NOT_FOUND", 404);
  if ((player as { coins: number }).coins < amount) {
    return apiError("Insufficient balance", "INSUFFICIENT_COINS", 422);
  }

  const { jobId } = await enqueueWithdrawal({ walletAddress: wallet, withdrawAmount: amount });
  return apiOk({ status: "queued", jobId }, 202);
}
```

**`app/api/bank/deposit/route.ts`:**
```ts
import { apiOk, apiError }        from "@/lib/api/error-response";
import { getWallet }              from "@/lib/api/get-wallet";
import { verifyDepositFromPlayer } from "@/lib/chain/verify";
import { enqueueDeposit }         from "@/lib/modules/transactions-pending/repository.server";
import { isTransactionProcessed } from "@/lib/modules/transactions-processed/repository.server";

export async function POST(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const { txId, amount } = await req.json() as { txId: string; amount: number };
  if (!txId || !amount) return apiError("Missing txId or amount", "INVALID_BODY", 400);

  // Idempotency: if already processed, ack without re-crediting.
  if (await isTransactionProcessed(txId)) {
    return apiOk({ status: "already_processed", txId });
  }

  // Verify on-chain that the player actually sent the expected amount.
  const verification = await verifyDepositFromPlayer(txId, wallet, amount);
  if (!verification.ok) {
    return apiError(
      verification.error ?? "Deposit not confirmed on-chain",
      "VERIFICATION_FAILED", 422
    );
  }

  const { duplicate } = await enqueueDeposit({
    walletAddress: wallet,
    depositAmount:  amount,
    depositTxId:    txId,
  });

  return apiOk({ status: duplicate ? "already_queued" : "queued", txId }, 202);
}
```

**`app/api/bank/transactions/route.ts`:**
```ts
import { apiOk, apiError }      from "@/lib/api/error-response";
import { getWallet }            from "@/lib/api/get-wallet";
import { getTransactionHistory } from "@/lib/modules/transactions-processed/repository.server";
import type { ProcessedTxType } from "@/lib/modules/transactions-processed/types.server";
import { NextRequest } from "next/server";

const VALID_TYPES: ProcessedTxType[] = [
  "withdrawal", "deposit", "crate_purchase", "market_purchase"
];

export async function GET(req: NextRequest): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const limit  = Math.min(25, Number(req.nextUrl.searchParams.get("limit") ?? 25));
  const rawCursor = req.nextUrl.searchParams.get("cursor");
  const cursor = rawCursor ? Number(rawCursor) : undefined;
  const rawType = req.nextUrl.searchParams.get("type");
  const type = rawType && VALID_TYPES.includes(rawType as ProcessedTxType)
    ? rawType as ProcessedTxType : undefined;

  const { transactions, nextCursor } = await getTransactionHistory(wallet, limit, cursor, type);
  return apiOk({ transactions, nextCursor });
}
```

---

## Step 3.5 — Smart Contract Worker

```
server/game-smart-contract/
  index.ts                          — entry point (run one instance only)
  lib/
    transfers.ts                    — sendOnChain dispatcher (routes to chain adapter)
    logger.ts                       — structured logging
  workers/
    transaction-worker.ts           — drains queue, settles each job type
```

**`server/game-smart-contract/lib/transfers.ts`:**
```ts
// Routes the sendOnChain call to the active chain's transfer module.
import { config } from "@/lib/config/config";

export async function sendOnChain(
  playerWallet: string, amount: number, ref: string,
): Promise<{ signature: string }> {
  const chain = config.blockchain.chain;
  if (chain === "hive") {
    const { sendHiveTransfer } = await import("@/lib/chain/hive/transfer");
    return sendHiveTransfer(playerWallet, amount, ref);
  }
  if (chain === "robinhood") {
    const { sendRobinhoodTransfer } = await import("@/lib/chain/robinhood/transfer");
    return sendRobinhoodTransfer(playerWallet, amount, ref);
  }
  const { sendSolanaTransfer } = await import("@/lib/chain/solana/transfer");
  return sendSolanaTransfer(playerWallet, amount, ref);
}
```

**`server/game-smart-contract/workers/transaction-worker.ts` — worker flow:**
```ts
// Processes each job type from transactions_pending:
//
// withdrawal:
//   1. sendOnChain(wallet, amount, signature)
//   2. deductCoins(wallet, amount) — atomic $gte guard
//   3. insertProcessedTransaction({ type: "withdrawal", txHash, amount: -amount })
//   4. completeJob(id)
//
// deposit:
//   1. verifyDepositFromPlayer(depositTxId, wallet, depositAmount) — confirm on chain
//   2. claimProcessedTransaction({ type: "deposit", txHash: depositTxId, amount })
//   3. If claimed: addCoins(wallet, depositAmount)
//   4. completeJob(id)
//
// crate_purchase:
//   1. deductCoins(wallet, cost)
//   2. Mint crateCount crates → write to crates collection + nft-mints log
//   3. insertProcessedTransaction({ type: "crate_purchase", metadata: { crateNumbers, rarity } })
//   4. completeJob(id)
//
// market_purchase:
//   1. deductCoins(wallet, price)
//   2. Transfer item/crate/consumable/relic ownership → update owner field
//   3. Credit seller coins: addCoins(seller, price * (1 - fee))
//   4. insertProcessedTransaction({ type: "market_purchase", metadata: { itemNumber, itemType } })
//   5. Write marketplace-logs entry
//   6. completeJob(id)
//
// Retry policy:
//   Non-retryable codes (INSUFFICIENT_COINS, VERIFICATION_FAILED, NOT_FOUND):
//     failJob(id, message, 1) → dead-lettered immediately
//   Transient (RPC/network):
//     failJob(id, message, maxRetries) → retried until maxRetries, then dead
```

**`server/game-smart-contract/index.ts`:**
```ts
import { connectDatabase } from "@/lib/config/database";
import { TransactionWorker } from "./workers/transaction-worker";
import { sendOnChain }       from "./lib/transfers";
import { config }            from "@/lib/config/config";

async function main() {
  console.log(`[worker] Starting on chain: ${config.blockchain.chain}`);
  await connectDatabase();
  const worker = new TransactionWorker(sendOnChain);
  worker.start();
  process.on("SIGTERM", () => { worker.stop(); setTimeout(() => process.exit(0), 500); });
  process.on("SIGINT",  () => { worker.stop(); setTimeout(() => process.exit(0), 500); });
}
main().catch(err => { console.error("[worker] fatal:", err); process.exit(1); });
```

---

## Step 3.6 — Client Deposit Helpers

```
lib/client/
  chain.ts              — activeChain constant (already in Phase 1)
  types.ts              — DepositParams / DepositResult interfaces
  hive/deposit.ts       — Keychain requestCustomJson tokens.transfer
  solana/deposit.ts     — SPL token transfer via wallet adapter
  robinhood/deposit.ts  — ERC-20 transfer via EIP-6963 provider
```

These are `"use client"` files. Copy the pattern from
`reference/boom-miner/lib/client/hive/deposit.ts` exactly — it is the
canonical Hive Keychain tokens.transfer implementation.

**`lib/client/types.ts`:**
```ts
export interface DepositParams {
  chain:      string;
  treasury:   string;
  token:      string;
  decimals:   number;
  amount:     number;
  memo?:      string;
  engineId?:  string;  // Hive only
}
export interface DepositResult {
  txId: string;
}
```

---

---

# Phase 4 — Inventory, Items, Crates, Shop

**Goal:** Items, crates, consumables and relics are live from MongoDB.
The shop (crate purchase) and marketplace (buy/list/delist) use the
transaction queue.

---

## Step 4.1 — Item & Crate Modules

Follow the same `types / model / repository` pattern from Phase 2.
One folder per domain:

```
lib/modules/
  items/
    types.server.ts
    model.server.ts
    repository.server.ts
  crates/
    types.server.ts
    model.server.ts
    repository.server.ts
  consumables/
    types.server.ts
    model.server.ts
    repository.server.ts
  relics/
    types.server.ts
    model.server.ts
    repository.server.ts
  item-templates/
    types.server.ts
    model.server.ts
    repository.server.ts
```

Field shapes mirror the TerraCore reference exactly (see `/reference/TerraCore-Smart-Contract`).

---

## Step 4.2 — Inventory Read Route

```
GET /api/inventory          — authenticated player's full inventory
```

```ts
// app/api/inventory/route.ts
import { apiOk, apiError } from "@/lib/api/error-response";
import { getWallet }        from "@/lib/api/get-wallet";
import { connectDatabase }  from "@/lib/config/database";
import { ItemModel }        from "@/lib/modules/items/model.server";
import { CrateModel }       from "@/lib/modules/crates/model.server";
import { ConsumableModel }  from "@/lib/modules/consumables/model.server";
import { RelicModel }       from "@/lib/modules/relics/model.server";

export async function GET(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);
  await connectDatabase();
  const [items, crates, consumables, relics] = await Promise.all([
    ItemModel.find({ owner: wallet, burnt: { $ne: true } }).lean(),
    CrateModel.find({ owner: wallet }).lean(),
    ConsumableModel.find({ wallet, amount: { $gt: 0 } }).lean(),
    RelicModel.find({ wallet, amount: { $gt: 0 } }).lean(),
  ]);
  return apiOk({ items, crates, consumables, relics });
}
```

---

## Step 4.3 — Crate Shop (Crate Purchase Flow)

**Client-side flow:**
1. Player clicks Buy Crate in the shop.
2. Client calls `sendHiveDeposit()` (or Solana/Robinhood equivalent) to pay the treasury.
3. Client receives `txId` from the wallet.
4. Client calls `POST /api/shop/crate` with `{ txId, rarity, count }`.
5. Route calls `enqueueCratePurchase(...)` → worker processes it.
6. Client polls `GET /api/bank/transactions?type=crate_purchase` to detect settlement.

**`app/api/shop/crate/route.ts`:**
```ts
import { apiOk, apiError }         from "@/lib/api/error-response";
import { getWallet }               from "@/lib/api/get-wallet";
import { verifyDepositFromPlayer }  from "@/lib/chain/verify";
import { enqueueCratePurchase }    from "@/lib/modules/transactions-pending/repository.server";
import { isTransactionProcessed }  from "@/lib/modules/transactions-processed/repository.server";

const CRATE_PRICES: Record<string, number> = {
  common: 100, uncommon: 500, rare: 1500, epic: 5000, legendary: 20000,
};

export async function POST(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Not authenticated", "UNAUTHORIZED", 401);

  const { txId, rarity, count } = await req.json() as {
    txId: string; rarity: string; count: number;
  };

  if (!txId || !rarity || !count) {
    return apiError("Missing txId, rarity or count", "INVALID_BODY", 400);
  }

  if (await isTransactionProcessed(txId)) {
    return apiOk({ status: "already_processed", txId });
  }

  const expectedAmount = (CRATE_PRICES[rarity] ?? 0) * count;
  const verification = await verifyDepositFromPlayer(txId, wallet, expectedAmount);
  if (!verification.ok) {
    return apiError(verification.error ?? "Payment not confirmed", "VERIFICATION_FAILED", 422);
  }

  const { duplicate } = await enqueueCratePurchase({
    walletAddress: wallet, crateRarity: rarity,
    crateCount: count, depositTxId: txId,
  });

  return apiOk({ status: duplicate ? "already_queued" : "queued", txId }, 202);
}
```

---

## Step 4.4 — Marketplace Routes

```
GET  /api/market/:type           — list items for sale (type = items | crates | consumables | relics)
POST /api/market/:type/:id/list  — list item for sale
POST /api/market/:type/:id/delist — delist item
POST /api/market/buy             — buy listed item (verifies on-chain payment → enqueue)
```

**`POST /api/market/buy` flow:**
```ts
// 1. Verify on-chain payment (verifyDepositFromPlayer)
// 2. Idempotency check (isTransactionProcessed)
// 3. enqueueMarketPurchase({ walletAddress, itemNumber, itemType, depositTxId })
// 4. Return { status: "queued" }
// Worker handles: transfer ownership, credit seller, write marketplace-logs
```

---

---

# Phase 5 — Game Actions (Claim, Attack, Boss, Upgrade, Forge, Salvage)

**Goal:** All player actions are server-authoritative. Every action writes to
the correct log collection. No game logic runs in the browser.

---

## Step 5.1 — Claim Mining Rewards

```
POST /api/player/claim
```

```ts
// Server-side logic:
// 1. Load player by wallet
// 2. Compute claimsAvail and qty using the same formulas as stores/formulas/mining.ts
// 3. If claimsAvail <= 0 → write claims log {status:"rejected"}, return 409
// 4. Optimistic update with version check:
//    findOneAndUpdate({ wallet, version: player.version, scrap: { $gt: 0 } }, {
//      $set: { scrap: 0, cooldown: now, lastclaim: now },
//      $inc: { claims: -1, hiveEngineScrap: qty, version: 1 }
//    })
// 5. Write claims log: { wallet, qty: qty.toFixed(8), status: "success", time }
// 6. Return { ok: true, qty }
```

---

## Step 5.2 — PvP Attack

```
POST /api/player/attack
Body: { target: string }
```

```ts
// 1. Load attacker + defender
// 2. Check cooldowns, dodge stat, protection_time
// 3. Server RNG: seed = crypto.randomUUID() — no client-supplied seed
// 4. Compute steal: based on attacker.damage, defender.defense, defender.stats.luck
// 5. Apply dodge roll vs defender.stats.dodge
// 6. Atomic updates for attacker and defender (findOneAndUpdate with version check)
// 7. Write battle_logs:
await db.collection("battle_logs").insertOne({
  wallet: attackerWallet, attacked: target, scrap: stolen,
  seed, roll, dodged, reason: dodged ? "dodge" : null, timestamp: Date.now()
});
```

---

## Step 5.3 — Boss Fight

```
POST /api/player/boss
Body: { planet: string }
```

```ts
// 1. Load planet-config for planet
// 2. Check boss_data[planet].lastBattle cooldown
// 3. Deduct flux cost
// 4. Server RNG → determine rarity + drop type
// 5. If item drop: mint via items module (increment item-count, write nft-mints)
// 6. If consumable drop: increment consumables.amount for that type
// 7. Update player boss_data[planet].lastBattle
// 8. Write boss-log: { wallet, planet, result, roll, luck, rarity, drop, amount, time }
// 9. If drop: write nft-drops: { name, rarity, owner, item_number?, amount?, time }
```

---

## Step 5.4 — Upgrades (Engineering / Damage / Defense)

```
POST /api/player/upgrade
Body: { kind: "engineering" | "damage" | "defense" }
```

```ts
// 1. Load player
// 2. Compute cost (same formula as stores/formulas/upgrades.ts)
// 3. findOneAndUpdate with version check:
//    { wallet, version, hiveEngineScrap: { $gte: cost } },
//    { $inc: { [kind]: 1, hiveEngineScrap: -cost, experience: xpGain, version: 1 },
//      $set: { last_upgrade_time: now } }
// No log — upgrade history is on the player doc itself
```

---

## Step 5.5 — Forge Item

```
POST /api/items/:itemNumber/forge
```

```ts
// 1. Find item by item_number, verify owner === wallet
// 2. Snapshot item before upgrade
// 3. Verify player has enough flux
// 4. Increment item.level, update attributes
// 5. Deduct flux from player
// 6. Write forge-log: { wallet, item: snapshot, flux, time }
```

---

## Step 5.6 — Salvage Item

```
POST /api/items/:itemNumber/salvage
```

```ts
// 1. Find item, verify owner, not equipped, not salvaged
// 2. Compute scrap value based on rarity + level
// 3. Mark item as salvaged: { salvaged: true, owner: null }
// 4. Credit player hiveEngineScrap += value
// 5. Write salvage-log: { wallet, item_number, value, time }
```

---

## Step 5.7 — Equip / Unequip Item

```
POST /api/items/:itemNumber/equip
POST /api/items/:itemNumber/unequip
```

```ts
// equip:
// 1. Verify owner, not salvaged, not burnt
// 2. Unequip current item in that slot (if any)
// 3. Set item.item_equipped = true
// 4. Set player.items[slot] = { item_number, ...attributes }
//
// unequip:
// 1. Verify owner
// 2. Set item.item_equipped = false
// 3. Clear player.items[slot]
```

---

---

# Phase 6 — Quest System

**Goal:** Quest board is seeded, daily cron replaces it, players can start and
collect quests.

---

## Step 6.1 — Quest Modules

```
lib/modules/
  quest-templates/  — types / model / repository
  quest-board/      — types / model / repository
  active-quests/    — types / model / repository
```

---

## Step 6.2 — Quest Board Cron

```
app/api/cron/quest-board/route.ts    — replaces the board daily
```

Register in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/quest-board", "schedule": "0 0 * * *" },
    { "path": "/api/cron/stats-reset", "schedule": "0 0 * * *" }
  ]
}
```

**Board generation logic:**
```ts
// 1. Pick 6 random quest-templates (where active = true)
// 2. Compose slot objects (duration_hours, base_rolls, etc.)
// 3. Upsert quest-board doc for today's date
// 4. Return { ok: true, date, slots: 6 }
```

---

## Step 6.3 — Quest Routes

```
GET  /api/quests/board               — today's board
GET  /api/quests/active              — authenticated player's in-progress quests
POST /api/quests/start               — start a quest
POST /api/quests/:questId/collect    — collect completed quest
```

**Start logic:**
```ts
// 1. Load board for today, find the requested slot
// 2. Check player has no active quest for this board_date slot
// 3. Snapshot player stats at start time
// 4. Compute multiplier based on required_item_type and equipped item
// 5. Insert active-quests doc
// 6. Deduct scrap_paid from player
// 7. Write quest-log: { wallet, action: "start", quest_type, tier, name, board_date, time }
```

**Collect logic:**
```ts
// 1. Load active-quest by _id + wallet, verify completes_at <= now
// 2. Mark collected = true
// 3. Compute reward from rolls × multiplier × tier
// 4. Credit player hiveEngineScrap += reward
// 5. Write quest-log: { wallet, action: "collect", ... }
```

---

---

# Phase 7 — All Log Read Routes

**Goal:** Every log collection has a read route. The in-game Logs dropdown
and history pages all use real data.

---

## Log Routes

All follow this pattern: `GET /api/logs/:type` or `GET /api/logs/:type/:wallet`.

| Route | Collection | Filter | Sort |
|---|---|---|---|
| `GET /api/logs/claims` | `claims` | `{ wallet }` | `{ time: -1 }` |
| `GET /api/logs/battles` | `battle_logs` | `{ $or: [{ wallet }, { attacked }] }` | `{ timestamp: -1 }` |
| `GET /api/logs/boss` | `boss-log` | `{ wallet }` | `{ time: -1 }` |
| `GET /api/logs/forge` | `forge-log` | `{ wallet }` | `{ time: -1 }` |
| `GET /api/logs/salvage` | `salvage-log` | `{ wallet }` | `{ time: -1 }` |
| `GET /api/logs/mints` | `nft-mints` | `{ owner: wallet }` | `{ timestamp: -1 }` |
| `GET /api/logs/drops` | `nft-drops` | `{ owner: wallet }` | `{ time: -1 }` |
| `GET /api/logs/market` | `marketplace-logs` | `{ $or: [{ buyer }, { seller }] }` | `{ created: -1 }` |
| `GET /api/logs/quests` | `quest-log` | `{ wallet }` | `{ time: -1 }` |

All routes:
- Require `Authorization: Bearer <token>` header
- Accept `?limit=100&cursor=<timestamp>` for keyset pagination
- Project out `_id`
- Return `{ logs: [...], nextCursor }`

---

---

# Phase 8 — Seeding & Seed Scripts

**Goal:** Static data is seeded into MongoDB once.

---

## Seed Scripts

```
scripts/
  create-indexes.ts        — Phase 1 (already written above)
  seed-item-templates.ts   — mirrors TerraCore reference seed data
  seed-quest-templates.ts  — mirrors TerraCore reference seed data
  seed-planet-config.ts    — boss planet configuration
  seed-price-feed.ts       — initial price_feed doc
  seed-stats.ts            — initial stats doc { date: "global" }
  seed-counters.ts         — item-count and crate-count initial docs
```

Each script:
```ts
// scripts/seed-item-templates.ts
import { connectDatabase } from "@/lib/config/database";
import { ItemTemplateModel } from "@/lib/modules/item-templates/model.server";
import { ITEM_TEMPLATES } from "./data/item-templates";

async function run() {
  await connectDatabase();
  for (const t of ITEM_TEMPLATES) {
    await ItemTemplateModel.updateOne({ id: t.id }, { $setOnInsert: t }, { upsert: true });
  }
  console.log(`Seeded ${ITEM_TEMPLATES.length} item templates.`);
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
```

---

---

# Implementation Order Summary

| Phase | What gets built | Prompt scope |
|---|---|---|
| **1** | Config, DB, Auth, JWT, Chain signatures, index script | One prompt |
| **2** | Player module, read routes, leaderboard/stats, frontend auth migration | One prompt |
| **3** | Transaction modules, withdraw/deposit routes, chain transfers, smart contract worker, client deposit helpers | One prompt per chain adapter + one for worker |
| **4** | Item/crate/consumable/relic modules, inventory route, shop crate flow, marketplace routes | One prompt |
| **5** | Claim, attack, boss, upgrade, forge, salvage, equip routes | One prompt |
| **6** | Quest modules, board cron, start/collect routes | One prompt |
| **7** | All 9 log read routes | One prompt |
| **8** | All seed scripts + data files | One prompt |

**Do not skip phases.** Each phase depends on the modules from the previous phase.
The smart contract worker (Phase 3) must be deployed as a separate long-running
Node process — it is not a Next.js route. Run exactly one instance per deployment.
