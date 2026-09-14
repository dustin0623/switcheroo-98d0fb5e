# CryptoCore Next.js App Router migration

## Goal

Create a complete, self-contained Next.js 16 App Router project under `/nextjs` that mirrors the current TanStack Start CryptoCore app and its Express game API. The new folder will be a drop-in Node.js hostable codebase, styled and structured like the `reference/mythoria` project.

## Why

The current repo is a TanStack Start + Express hybrid. The user wants a Next.js version that can run on a VPS (Coolify) with the frontend and API in one process, while keeping the existing backend logic intact.

## Target folder layout

```text
nextjs/
  app/
    layout.tsx                 # root layout, fonts, providers, Toaster
    page.tsx                   # / dashboard (redirects or renders DashboardPage)
    globals.css                # Tailwind v4 entry + theme tokens
    (game)/
      layout.tsx               # game shell with sidebar/nav
      dashboard/page.tsx
      rig/page.tsx
      stats/page.tsx
      raid/page.tsx
      chests/page.tsx
      marketplace/page.tsx
      profile/page.tsx
      settings/page.tsx
    api/
      health/route.ts          # GET /api/health
      auth/
        challenge/route.ts     # POST /api/auth/challenge
        verify/route.ts        # POST /api/auth/verify
      player/
        me/route.ts            # GET/POST /api/player/me
      game/
        tick/route.ts
        claim/route.ts
        chest/route.ts
        upgrade/
          stat/route.ts
          item/route.ts
        burn/route.ts
        raid/route.ts
      items/
        route.ts               # GET /api/items
        equip/route.ts
        unequip/route.ts
        salvage/route.ts
      market/
        route.ts               # GET /api/market
        list/route.ts
        buy/route.ts
        cancel/route.ts
      logs/
        route.ts               # GET /api/logs
        market/route.ts
        market/sales/route.ts
      transactions/route.ts    # GET /api/transactions
  components/
    ui/                        # shadcn/ui components (copied)
    layout/                    # AppShell, SidebarNav, PageHeader, etc.
    game/                      # game-specific components
    auth/                      # ConnectGate, WalletModal, etc.
  lib/                         # copied from src/lib (framework-agnostic)
    config/
    modules/
    game/
    chain/solana/
    auth/
    api/                       # thin fetch client (from src/lib/api/client.ts)
    utils.ts
    format.ts
  features/                    # copied from src/features
    stores/
    game/
    pages/                     # page components reused in app/ routes
    constants/
    types/
  server/                      # standalone worker process
    game-smart-contract/
      index.ts
      lib/
      workers/
  public/                      # assets
  scripts/
    create-indexes.ts
  package.json
  next.config.ts
  tsconfig.json
  postcss.config.mjs
  components.json
  .env.example
  README.md
```

## Migration steps

### 1. Scaffold Next.js project

- Create `nextjs/package.json` based on `reference/mythoria/package.json`.
- Keep the same package manager (`pnpm`) and workspace style.
- Install Next.js 16, React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), Radix/shadcn deps, Zustand, Framer Motion, Lucide, Recharts, Solana libs, Mongoose, jose, zod, dotenv, tsx.
- Copy `components.json`, `tsconfig.json`, `postcss.config.mjs`, `next.config.ts` from `reference/mythoria` and adapt paths.

### 2. Copy framework-agnostic backend

- Copy `src/lib/config`, `src/lib/modules`, `src/lib/game`, `src/lib/chain/solana`, `src/lib/auth` into `nextjs/lib/`.
- These modules are already framework-agnostic; only import paths need updating.
- Copy `server/game-smart-contract` into `nextjs/server/game-smart-contract`.
- Copy `scripts/create-indexes.ts` into `nextjs/scripts/create-indexes.ts`.

### 3. Convert Express API to Next.js route handlers

For each `server/game-api/routes/*.ts` file, create the corresponding `nextjs/app/api/**/*.ts` route handler using the Next.js App Router convention:

| Express route | Next.js App Router file | HTTP method |
|---|---|---|
| `/api/health` | `app/api/health/route.ts` | GET |
| `/api/auth/challenge` | `app/api/auth/challenge/route.ts` | POST |
| `/api/auth/verify` | `app/api/auth/verify/route.ts` | POST |
| `/api/player/me` | `app/api/player/me/route.ts` | GET, POST |
| `/api/game/tick` | `app/api/game/tick/route.ts` | POST |
| `/api/game/claim` | `app/api/game/claim/route.ts` | POST |
| `/api/game/chest` | `app/api/game/chest/route.ts` | POST |
| `/api/game/upgrade/stat` | `app/api/game/upgrade/stat/route.ts` | POST |
| `/api/game/upgrade/item` | `app/api/game/upgrade/item/route.ts` | POST |
| `/api/game/burn` | `app/api/game/burn/route.ts` | POST |
| `/api/game/raid` | `app/api/game/raid/route.ts` | POST |
| `/api/items` | `app/api/items/route.ts` | GET |
| `/api/items/equip` | `app/api/items/equip/route.ts` | POST |
| `/api/items/unequip` | `app/api/items/unequip/route.ts` | POST |
| `/api/items/salvage` | `app/api/items/salvage/route.ts` | POST |
| `/api/market` | `app/api/market/route.ts` | GET |
| `/api/market/list` | `app/api/market/list/route.ts` | POST |
| `/api/market/buy` | `app/api/market/buy/route.ts` | POST |
| `/api/market/cancel` | `app/api/market/cancel/route.ts` | POST |
| `/api/logs` | `app/api/logs/route.ts` | GET |
| `/api/logs/market` | `app/api/logs/market/route.ts` | GET |
| `/api/logs/market/sales` | `app/api/logs/market/sales/route.ts` | GET |
| `/api/transactions` | `app/api/transactions/route.ts` | GET |

Each route handler will:
- Read `process.env` via `nextjs/lib/config/config.ts`.
- Validate input with Zod.
- Reuse the existing repository and game logic.
- Return `Response.json({ ok, ... })` or `Response.json({ error }, { status })`.
- Apply CORS headers for the standalone API use case.

### 4. Migrate frontend routes

Map each TanStack Start route file to a Next.js App Router page:

| TanStack route | Next.js page |
|---|---|
| `src/routes/index.tsx` | `app/page.tsx` |
| `src/routes/chests.tsx` | `app/(game)/chests/page.tsx` |
| `src/routes/inventory.tsx` | `app/(game)/rig/page.tsx` |
| `src/routes/marketplace.tsx` | `app/(game)/marketplace/page.tsx` |
| `src/routes/profile.tsx` | `app/(game)/profile/page.tsx` |

The `src/routes/index.tsx` dashboard content will be split:
- `app/page.tsx` can redirect to `/dashboard` or render the dashboard directly.
- `app/(game)/dashboard/page.tsx` will hold the main dashboard.

### 5. Migrate layout and shell

- Convert `src/routes/__root.tsx` into `nextjs/app/layout.tsx`.
- Convert `src/components/layout/AppShell.tsx` and navigation components into `nextjs/components/layout/`.
- Use Next.js `Metadata` API in each page for SEO instead of TanStack `head()`.
- Wrap client-only providers (Zustand hydration, wallet connection, API status) in a client component mounted in the root layout.

### 6. Migrate components

- Copy `src/components/auth/*` → `nextjs/components/auth/`.
- Copy `src/components/game/*` → `nextjs/components/game/`.
- Copy `src/components/layout/*` → `nextjs/components/layout/`.
- Add `"use client"` to every component that uses browser APIs, Zustand stores, React hooks, or wallet adapters.

### 7. Migrate features and stores

- Copy `src/features/stores/*` → `nextjs/features/stores/`.
- Copy `src/features/game/*` → `nextjs/features/game/`.
- Copy `src/features/pages/*` → `nextjs/features/pages/`.
- Copy `src/features/constants/*` → `nextjs/features/constants/`.
- Copy `src/features/types/*` → `nextjs/features/types/`.
- Update `src/lib/api/client.ts` to live at `nextjs/lib/api/client.ts` and read `process.env.NEXT_PUBLIC_SERVER_API_URL` for the browser URL.

### 8. Migrate styles and theme

- Copy `src/styles.css` into `nextjs/app/globals.css`.
- Ensure Tailwind v4 is configured with `@tailwindcss/postcss` in `postcss.config.msh`.
- Keep the dark theme tokens, Bitcoin Orange / Solana Purple palette, and shadcn variables.
- Load fonts via `next/font` or `<link>` in `app/layout.tsx`.

### 9. Update environment configuration

- Create `nextjs/.env.example` with:
  - `NEXT_PUBLIC_SERVER_API_URL`
  - `MONGODB_URI`
  - `MONGODB_DB`
  - `JWT_SECRET`
  - `TREASURY_ADDRESS`
  - `TREASURY_KEY`
  - `CONTRACT_ADDRESS`
  - `SOLANA_RPC_URL`
  - `HELIUS_API_KEY`
  - `WORKER_POLL_MS`
  - `WORKER_MAX_RETRIES`
- Update `nextjs/lib/config/config.ts` to read `NEXT_PUBLIC_*` and server-only variables correctly for Next.js.

### 10. Add package scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "server:smart-contract": "tsx server/game-smart-contract/index.ts",
  "db:indexes": "tsx scripts/create-indexes.ts"
}
```

### 11. Wire authentication

- Keep Solana wallet signature + JWT flow.
- `app/api/auth/challenge` and `app/api/auth/verify` reuse `lib/auth/login.server.ts`.
- Client auth store stores the JWT in `localStorage` and sends `Authorization: Bearer <token>`.
- Protect game API routes with a Next.js-compatible auth middleware helper.

### 12. Hydration and client/server boundaries

- Mark all interactive game UI, wallet components, and Zustand-consuming components with `"use client"`.
- Keep API route handlers server-only.
- Use `next/dynamic` or a client boundary for the heavy game shell if needed.

### 13. Verification

- `cd nextjs && pnpm install` succeeds.
- `cd nextjs && pnpm build` succeeds.
- `cd nextjs && pnpm dev` starts the app on `http://localhost:3000`.
- `GET /api/health` returns `{ ok: true }`.
- A Playwright flow connects a demo wallet, loads the dashboard, and triggers a claim via the API.

## Out of scope

- Replacing Solana with another chain.
- Adding new gameplay features beyond what exists in the TanStack repo.
- Real mainnet treasury configuration (devnet defaults remain).
- Rewriting the withdrawal/deposit worker logic; it is copied as-is.

## Open questions

1. Should the Next.js app run the API under `/api` and the pages under root, or should the API be a separate process?
2. Do you want `app/page.tsx` to be a landing page with a separate `/dashboard` route, or should `/` directly render the dashboard?
3. Should the `nextjs` folder become a pnpm workspace package, or remain a standalone folder?
