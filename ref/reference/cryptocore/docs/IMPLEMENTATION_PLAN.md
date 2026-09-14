# CryptoCore — Backend Implementation Plan (Solana only)

Status: **Phase 1 backend built. Not wired to the frontend yet.**  
Reference studied: `reference/mythoria` (Next.js + MongoDB + Solana).  
Target runtime: **Node.js** — the user has decided to migrate this project to Next.js + Node hosting, so the backend is authored as a reusable Node/Mongo layer. The TanStack Start server functions in this repo are thin wrappers for verification only; the real logic is framework-agnostic and can be moved directly into a Next.js `app/api/**` route layer.

---

## 1. Decision log

| Decision | What we picked | Why |
|---|---|---|
| Framework | Next.js + Node host | Original Lovable template uses Cloudflare Workers (no raw TCP), so MongoDB driver cannot connect. Next.js on a Node host can hold a persistent TCP socket to Atlas. |
| Database | MongoDB + Mongoose | Matches the Mythoria reference; modules already mirror its model/repository/types pattern. |
| Backend layout | `src/lib/modules/<collection>/`, `src/lib/game/`, `src/lib/chain/solana/`, `src/lib/auth/`, `server/game-smart-contract/` | `src/lib/*` is framework-agnostic and can be copied into Next.js. `server/game-smart-contract/` is the withdrawal/deposit worker process, analogous to Mythoria's `server/game-smart-contract`. |
| Chests | **No `chests` collection** | Chests are bought and resolved in one call: HASH is debited, server RNG rolls, items are minted directly into `items`. |
| Money modules | `transactions-pending` + `transactions-processed` | Every deposit/withdrawal starts as a pending job and ends as a processed transaction. Unique index on `txHash` prevents double-crediting. |
| Logs | **Single `logs` collection** | TerraCore uses many log collections; we collapse them into one collection with a `type` field. |
| Auth | Solana wallet signature + 5-min nonce + 7-day JWT | No email/password. Replay protection via single-use nonces. |
| Server functions | Thin wrappers in `src/lib/*.functions.ts` | They are only present to test the backend in the current TanStack repo. When migrating to Next.js, replace them with `app/api/**` route handlers. |

---

## 2. Folder-to-collection mapping

> **Module folder name = collection name.** Each collection is owned by exactly one folder at `src/lib/modules/<collection>/`. No collection has two writers.

| Folder | Collection | What it owns |
|---|---|---|
| `src/lib/modules/players/` | `players` | Profile, balances, stats, charges, totals. |
| `src/lib/modules/items/` | `items` | Minted gear, ownership, equip/salvage state. |
| `src/lib/modules/item-templates/` | `itemTemplates` | Static loot table definitions. |
| `src/lib/modules/market-listings/` | `marketListings` | Player-to-player listings. |
| `src/lib/modules/transactions-pending/` | `transactions-pending` | Deposit/withdrawal job queue. |
| `src/lib/modules/transactions-processed/` | `transactions-processed` | Settled ledger + idempotency. |
| `src/lib/modules/logs/` | `logs` | Unified activity/audit log. |
| `src/lib/modules/login-nonces/` | `loginNonces` | Solana auth challenges (5-min TTL). |

---

## 3. Data model

### `players`

```ts
{
  wallet: string            // unique index
  username: string          // unique index
  registrationTime: number
  xp: number
  level: number
  hash: number
  sparks: number
  vault: number
  vaultStaked: number
  notoriety: number
  totalBurned: number
  statLevels: { hashRate, hackPower, security, luck, firewall, exploit }
  lastTickAt: number
  lastSinkAt: number
  claimCharges: number
  lastClaimRegenAt: number
  raidCharges: number
  lastRaidRegenAt: number
  totalClaimed: number
  totalMined: number
  raids: number
  raidWins: number
  totalStolen: number
  bestHashRate: number
  protectionUntil: number
  createdAt: Date
  updatedAt: Date
}
```

### `items`

```ts
{
  itemNumber: number       // unique index
  owner: string
  name: string
  slot: SlotKey
  rarity: Rarity
  level: number
  stats: Record<string, number>
  equipped: boolean
  salvaged: boolean
  image: string
  createdAt: number
  lastTransfer: number
}
```

### `transactions-pending`

```ts
{
  type: "deposit" | "withdrawal"
  signature: string        // withdrawal job id; deposit tx signature
  walletAddress: string
  depositAmount?: number
  depositTxId?: string     // Solana tx signature for deposits
  withdrawAmount?: number
  status: "pending" | "failed" | "dead"
  retryCount: number
  lastError?: string
  createdAt: Date
}
```

### `transactions-processed`

```ts
{
  txHash: string           // unique index — prevents double-crediting
  wallet: string
  type: "deposit" | "withdrawal" | "chest" | "market" | ...
  amount: number
  processedAt: number
  metadata?: Record<string, unknown>
}
```

### `logs`

```ts
{
  type: LogType
  wallet: string | null
  target?: string
  amount?: number
  seed?: string
  txHash?: string
  data: Record<string, unknown>
  error?: string
  createdAt: Date
}
```

`LogType` union: `login`, `claim`, `upgrade`, `vault`, `burn`, `chest`, `item`, `raid`, `market`, `deposit`, `withdrawal`, `error`.

---

## 4. What is built now

### Modules (reusable in Next.js)

- `src/lib/config/config.ts` — single `process.env` reader.
- `src/lib/config/database.ts` — Mongoose singleton connection.
- `src/lib/modules/*/types.server.ts` — interfaces.
- `src/lib/modules/*/model.server.ts` — Mongoose schemas.
- `src/lib/modules/*/repository.server.ts` — data access.

### Game logic (reusable in Next.js)

- `src/lib/game/mining.server.ts` — tick player, apply decay, compute vault.
- `src/lib/game/claim.server.ts` — claim vault to HASH balance.
- `src/lib/game/chest.server.ts` — seeded RNG loot, instant item mint.
- `src/lib/game/upgrade.server.ts` — stat and item upgrades.
- `src/lib/game/burn.server.ts` — HASH burn → notoriety/firewall/exploit.
- `src/lib/game/raid.server.ts` — charge regen, raid simulation, PvP.
- `src/lib/game/market.server.ts` — player-to-player market buys.
- `src/lib/game/rng.ts` — seedable PRNG for deterministic rolls.

### Auth + chain (reusable in Next.js)

- `src/lib/auth/jwt.ts` — sign/verify JWT session.
- `src/lib/auth/login.server.ts` — nonce challenge + signature verification.
- `src/lib/chain/solana/client.ts` — RPC connection, treasury/mint public keys.
- `src/lib/chain/solana/verify.ts` — message signature verification.
- `src/lib/chain/solana/transfer.ts` — treasury payout + confirmation.

### Worker process

- `server/game-smart-contract/index.ts` — polls `transactions-pending`, verifies deposits on-chain, sends withdrawals from treasury, archives to `transactions-processed`.

### TanStack-only wrappers (will be replaced by Next.js routes)

- `src/lib/auth/functions.ts`
- `src/lib/modules/players/functions.ts`
- `src/lib/modules/items/functions.ts`
- `src/lib/modules/market-listings/functions.ts`
- `src/lib/game/functions.ts`
- `src/lib/transactions/functions.ts`

These exist only to exercise the backend in the current repo before migration.

### Scripts

- `scripts/create-indexes.ts` — ensures Mongoose indexes.
- `scripts/seed-item-templates.ts` — seeds the loot table.

---

## 5. Migration notes for Next.js

When moving to Next.js:

1. Copy `src/lib/**/*` into the new Next.js project unchanged.
2. Replace `src/lib/**/*.functions.ts` with `app/api/**/route.ts` handlers.
3. Move `server/game-smart-contract/index.ts` to a standalone worker script (e.g., `worker/drain.ts`) run by `tsx` or `pm2`.
4. Keep `package.json` scripts `server:worker`, `db:indexes`, `db:seed:templates`.
5. Update `src/lib/config/config.ts` to read `process.env` safely in Next.js (it already does).

The server functions are intentionally thin so the migration is mostly copy-paste plus renaming the file conventions.

---

## 6. Remaining work (phases)

| Phase | Scope | Status |
|---|---|---|
| 0 | Add secrets, install deps (`mongoose`, `@solana/web3.js`, `@solana/spl-token`, `bs58`, `tweetnacl`, `jose`, `dotenv`, `tsx`) | ✅ Done |
| 1 | Config, DB, repositories, indexes, seed | ✅ Done |
| 2 | Auth: nonce, sign verify, JWT | ✅ Done |
| 3 | Game logic: mining, claim, upgrade, burn, chest, raid, market | ✅ Done |
| 4 | Transaction modules + worker | ✅ Done |
| 5 | Logs collection + logging from every mutation | ✅ Done |
| 6 | Wire to frontend | **Not started — waiting for Next.js migration** |
| 7 | Deposit/withdraw UX, Phantom signing, real mainnet | Not started |
| 8 | Rate limits, security scan, hardening | Not started |

---

## 7. Open questions

1. **Next.js hosting:** Vercel, Railway, Fly, or VPS? This determines whether the worker runs as a separate process or a cron job.
2. **HASH token:** Existing mainnet Token-2022 mint, or devnet test mint?
3. **Existing localStorage progress:** Wipe on launch, or one-time import?
4. **Raid shielding:** How long after being raided before a player can be raided again? (Current code uses 60 seconds for testing.)
5. **Username policy:** Immutable after registration, or rename allowed for a HASH cost?

---

## 8. Running the backend locally

```bash
# 1. Install deps
pnpm install

# 2. Set env vars in .env
MONGODB_URI=
MONGODB_DB=cryptocore
JWT_SECRET=
TREASURY_ADDRESS=
TREASURY_KEY=
CONTRACT_ADDRESS=
SOLANA_RPC_URL=https://api.devnet.solana.com

# 3. Ensure indexes
pnpm db:indexes

# 4. Seed templates
pnpm db:seed:templates

# 5. Start the withdrawal/deposit worker
pnpm server:worker
```

The frontend is not connected yet. The server functions can be invoked manually from TanStack routes for testing.
