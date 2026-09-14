# CryptoCore Backend

Server-authoritative backend for CryptoCore. Built for a Node.js + MongoDB + Solana stack, matching the architecture of the Mythoria reference.

---

## What is in this folder

```text
src/lib/
  config/
    config.ts           # single process.env reader
    database.ts         # Mongoose cached connection
  modules/<collection>/
    types.server.ts     # TypeScript interfaces
    model.server.ts     # Mongoose schema
    repository.server.ts # data access
  game/
    mining.server.ts    # vault tick + decay
    claim.server.ts     # claim charges
    chest.server.ts     # seeded RNG chest opening
    upgrade.server.ts   # stat / item upgrades
    burn.server.ts      # HASH burn sink
    raid.server.ts      # PvP raid simulation
    market.server.ts    # player market buy logic
    rng.ts              # seedable PRNG
  chain/solana/
    client.ts           # RPC + public keys
    verify.ts           # wallet signature verification
    transfer.ts         # treasury token transfer
  auth/
    jwt.ts              # JWT session sign/verify
    login.server.ts     # nonce challenge + verify

server/
  game-api/
    index.ts            # Express game API
    routes/             # /api/* route handlers
    middleware/           # auth, cors, error
  game-smart-contract/
    index.ts            # withdrawal/deposit worker process

scripts/
  create-indexes.ts     # ensure MongoDB indexes
```

---

## Modules

Every module folder is named after its MongoDB collection. The folder is the single owner of that collection.

| Collection | Module path | Notes |
|---|---|---|
| `players` | `src/lib/modules/players/` | balances, stats, charges, totals |
| `items` | `src/lib/modules/items/` | minted gear |
| `marketListings` | `src/lib/modules/market-listings/` | player listings |
| `transactions-pending` | `src/lib/modules/transactions-pending/` | job queue |
| `transactions-processed` | `src/lib/modules/transactions-processed/` | settled ledger + idempotency |
| `logs` | `src/lib/modules/logs/` | unified activity/audit log |
| `loginNonces` | `src/lib/modules/login-nonces/` | Solana auth challenges (5-min TTL) |

---

## Environment variables

Create a `.env` file at the project root:

```env
MONGODB_URI=your_atlas_connection_string
MONGODB_DB=cryptocore
JWT_SECRET=at_least_32_random_chars
TREASURY_ADDRESS=your_treasury_wallet_address
TREASURY_KEY=your_treasury_private_key_base58
CONTRACT_ADDRESS=your_hash_token_mint_address
SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## Scripts

```bash
# Ensure indexes
pnpm db:indexes

# Run the game API
pnpm server:api

# Run the withdrawal/deposit worker
pnpm server:smart-contract
```

---

## Migrating to Next.js

The backend is intentionally framework-agnostic. To move it to Next.js:

1. Copy `src/lib/**/*` into the Next.js project unchanged.
2. Replace `server/game-api/routes/*` with `app/api/**/route.ts` handlers.
3. Move `server/game-smart-contract/index.ts` to a standalone worker script (e.g., `worker/drain.ts`) run by `tsx` or `pm2`.
4. Keep the same `.env` variables and `pnpm` scripts.
5. Update `src/lib/config/config.ts` to read `process.env` safely in Next.js (it already does).

The logic modules in `src/lib/modules/` and `src/lib/game/` do not depend on TanStack Start.

---

## Important notes

- **No `chests` collection.** Chests are bought and resolved in one server call; items are minted directly into the `items` collection.
- **No `itemTemplates` collection.** Item names are picked procedurally from per-slot pools in `src/features/game/item-names.ts`; stats are rolled from rarity tables.
- **All money movement goes through transactions modules.** Deposits and withdrawals start in `transactions-pending` and end in `transactions-processed`. The unique `txHash` index prevents double-crediting.
- **Logs are append-only.** The `logs` collection is never the source of truth for balances; it is used for audit trails and activity feeds only.
- **Chests and raids use seeded RNG.** Every outcome stores its seed so it can be reproduced later.
- **Treasury key never leaves the server.** The `TREASURY_KEY` is only read inside the worker and transfer functions.
