# CryptoCore Express API + Frontend rewire

## Goal

Add a standalone Node.js Express server under `/server/game-api/` that reuses the existing game backend. Switch the frontend from `createServerFn` RPC to direct HTTP calls against a `SERVER_API_URL` environment variable. Simplify item templates into per-slot name pools + procedural rarity stats.

## Why

The current TanStack Start server functions work for local dev but run in a Cloudflare-Worker-shaped runtime. The user wants a classic Node.js API that can be hosted on their VPS (`pnpm server:api`) while the frontend remains a separate static/preview build. Treating the repo as a monorepo keeps all game logic in one place.

## Changes

### 0. Fix existing LogEntry type mismatch

The stub `LogEntry` interface in `src/lib/modules/logs/repository.server.ts` is missing fields the game logic already uses (`data`, `target`, `seed`) and the `LogType` union is missing `"vault"` and `"stat_upgrade"`. Update the interface and union so the current build passes before any new work is added.

### 1. New `/server/game-api/` Express application

```text
server/game-api/
  index.ts           # bootstrap: dotenv, connectDatabase, express, routes
  middleware/
    auth.ts          # JWT verification using src/lib/auth/jwt.ts
    cors.ts          # CORS headers for local dev and configured origin
    error.ts         # global error handler
  routes/
    auth.ts          # POST /api/auth/challenge, POST /api/auth/verify
    player.ts        # GET /api/player/:wallet, POST /api/player/:wallet
    game.ts          # POST /api/game/claim, /tick, /chest, /upgrade, /burn, /raid
    items.ts         # GET /api/items, POST /api/items/equip, unequip, salvage
    market.ts        # GET /api/market, POST /api/market/list, /buy
    health.ts        # GET /api/health
```

- All routes reuse existing repository and game logic in `src/lib/modules/` and `src/lib/game/`.
- Input validation uses Zod inside each route handler.
- Auth middleware verifies the JWT issued by the existing `src/lib/auth/jwt.ts` sign function.

### 2. Environment variable `SERVER_API_URL`

- Add `SERVER_API_URL` to `src/lib/config/config.ts` (server-side default `http://localhost:3000`).
- Add `VITE_SERVER_API_URL` to the frontend build so the browser can fetch the API.
- Update `docs/BACKEND.md` with the new variable.

### 3. Package script

Add to `package.json`:

```json
"server:api": "tsx server/game-api/index.ts"
```

Install `express` and `@types/express` if not already present.

### 4. Frontend rewire to HTTP API

- Replace `createServerFn` imports from `src/lib/game/functions.ts`, `src/lib/modules/players/functions.ts`, `src/lib/modules/items/functions.ts`, and `src/lib/auth/functions.ts` with a thin API client in `src/lib/api/client.ts`.
- The client reads `import.meta.env.VITE_SERVER_API_URL`, attaches `Authorization: Bearer <token>` from the auth store, and calls `fetch`.
- Update `src/features/stores/authStore.ts` to store the JWT token returned by `/api/auth/verify`.
- Update `src/features/stores/playerStore.ts` to load the server player profile after connection and sync actions to the API.
- Keep the existing optimistic UI where possible, but mutations go through the API.

### 5. Item template simplification

- Remove the `itemTemplates` collection dependency.
- Replace `scripts/seed-item-templates.ts` with a constant name pool in `src/features/game/item-names.ts` (or `server/game-api/lib/item-names.ts`) mapping each `SlotKey` to at least 5 flavour names.
- Update `src/lib/game/chest.server.ts`:
  - Roll rarity and slot as before.
  - Pick a random name from the slot pool.
  - Generate stats procedurally from `RARITY_META` min/max and `RARITY_STAT_COUNT`.
  - Delete `src/lib/modules/item-templates/` (model, repository, types, functions) once chest logic no longer imports it.
- Update `src/lib/modules/items/types.server.ts` so `name` is no longer derived from a template.

### 6. Docs and CORS

- Update `docs/BACKEND.md` to describe the new Express API layout and the `server:api` command.
- Update `docs/IMPLEMENTATION_PLAN.md` Phase 6 (wire to frontend) to reflect the API-first approach.
- Add CORS to the Express server so the frontend preview/published URL can call it.

### 7. Verification

- `pnpm server:api` starts and responds to `GET /api/health`.
- `pnpm build:dev` succeeds after deleting the unused `createServerFn` wrappers and item-templates module.
- A Playwright flow connects the wallet, opens the dashboard, and triggers a claim via the API.

## Out of scope

- Deposit/withdrawal worker (`server/game-smart-contract/index.ts`) remains unchanged; it will continue to run as a separate process.
- Real Solana mainnet integration; the API will still use the same devnet/mainnet config as the existing code.
- Rate limiting and IP allow-listing; can be added behind an nginx or Cloudflare layer.

## Open questions

1. Which port should the Express server default to? (proposed: 3000) yes as it should do on coolify vps thats already given there
2. Should the frontend still keep the optimistic local state when the API is unavailable, or fail hard? if there are no api available then show the server offline
3. Do you want to keep the `src/lib/auth/functions.ts` TanStack wrappers as dead code, or delete them? yes delete them