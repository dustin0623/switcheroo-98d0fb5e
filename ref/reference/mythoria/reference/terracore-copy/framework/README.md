# TerraCore — Next.js (App Router) Port

A side-by-side reimplementation of the parent TanStack Start app so you can
compare the two frameworks feature-for-feature. **Not** wired into the parent
workspace — this folder is a standalone Next.js 15 project. Install and run
inside `/framework`:

```bash
cd framework
npm install     # or pnpm / bun / yarn
npm run dev     # http://localhost:3001
```

The parent TanStack app keeps running on `http://localhost:8080`, so you can
open both side-by-side.

---

## What was ported

| Layer            | TanStack Start (parent)                         | Next.js App Router (here)                        |
| ---------------- | ----------------------------------------------- | ------------------------------------------------ |
| Routing          | `src/routes/*.tsx` (flat, dot-separated)        | `src/app/**/page.tsx` (folder = URL segment)     |
| Root shell       | `src/routes/__root.tsx` + `shellComponent`      | `src/app/layout.tsx` (default export)            |
| Metadata         | `head: () => ({ meta, links })`                 | `export const metadata` or `generateMetadata`    |
| API routes       | `createFileRoute("/api/…")({ server: { handlers } })` | `app/api/…/route.ts` exporting `GET`/`POST`/… |
| Dynamic segment  | `$user` in filename, `params.user`              | `[user]` folder, `params: Promise<{ user }>` (Next 15) |
| Navigation       | `<Link to="/…" params={{…}}>` from `@tanstack/react-router` | `<Link href="/…">` from `next/link`  |
| Route context    | `createRootRouteWithContext<{ queryClient }>()` | Client `<Providers>` (React context)             |
| Server functions | `createServerFn` + middleware chain             | Server components + Server Actions               |
| Runtime          | Cloudflare Workers via TanStack Start           | Node.js (default) or Edge runtime                |
| Shared code      | `src/mock/*`, `src/stores/*`                    | Copied verbatim — framework-agnostic             |

**Every API route from `src/routes/api/mock/*.ts` is present at the same URL
under `src/app/api/mock/*/route.ts`.** Hit any of them:

```
GET /api/mock/player/citizen1
GET /api/mock/leaderboard?limit=25
GET /api/mock/items_archive?type=weapon&sort=damage
GET /api/mock/marketplace_logs?limit=200&offset=0
… etc.
```

Pages ported for demonstration: `/`, `/leaderboard`, `/play`, `/[user]/items`.
The rest follow the exact same patterns — copy any TanStack page into
`src/app/<name>/page.tsx`, swap `@tanstack/react-router` imports for
`next/link` + `next/navigation`, and you're done.

---

## Concept map (read this first)

### 1. File-based routing

**TanStack Start** uses flat filenames with dot-separated segments:

```
src/routes/
  __root.tsx                 → shell for every route
  index.tsx                  → /
  leaderboard.tsx            → /leaderboard
  $user.items.tsx            → /:user/items
  api/mock/player.$user.ts   → /api/mock/player/:user
```

**Next.js App Router** uses folders where the folder name is the URL segment:

```
src/app/
  layout.tsx                 → shell for every route
  page.tsx                   → /
  leaderboard/page.tsx       → /leaderboard
  [user]/items/page.tsx      → /:user/items
  api/mock/player/[user]/route.ts → /api/mock/player/:user
```

Rules of thumb:
- **`page.tsx` = a page**, **`route.ts` = an HTTP endpoint**, **`layout.tsx` = nested layout**.
- Dynamic segments: `$name` (TanStack) ↔ `[name]` (Next).
- Catch-all: `$` (TanStack) ↔ `[...slug]` (Next).
- Route groups (URL-invisible folders): `_authenticated/` (TanStack, prefix `_`) ↔ `(group)/` (Next, parentheses).

### 2. API routes

TanStack:
```ts
// src/routes/api/mock/battle.ts
export const Route = createFileRoute("/api/mock/battle")({
  server: {
    handlers: {
      GET: async ({ request }) => Response.json({ ok: true }),
    },
  },
});
```

Next.js:
```ts
// src/app/api/mock/battle/route.ts
export async function GET(request: Request) {
  return Response.json({ ok: true });
}
```

Both handlers speak the **standard Web Fetch API** (`Request` → `Response`).
That's why porting is mechanical — the surrounding boilerplate is different,
the handler body is identical.

Dynamic params:

```ts
// TanStack — src/routes/api/mock/player.$user.ts
GET: async ({ params }) => Response.json(fetch(params.user))

// Next.js — src/app/api/mock/player/[user]/route.ts
export async function GET(_: Request, { params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  return Response.json(fetch(user));
}
```

Notes on Next 15: `params` is a **Promise** — you must `await` it. Same for
`searchParams` on pages. This is new in v15 and unlocks streaming.

### 3. Server code vs client code

- **TanStack Start** — every route is isomorphic. To force server-only code,
  wrap it in `createServerFn` or a `server: { handlers }` block. Files named
  `*.server.ts` are stripped from client bundles.
- **Next.js App Router** — every file under `app/` is a **server component by
  default**. The first line `"use client"` opts a file into client rendering.
  There is no "isomorphic" middle ground — files are one or the other.

Practical mapping:

| Need                             | TanStack Start                | Next.js App Router                 |
| -------------------------------- | ----------------------------- | ---------------------------------- |
| Fetch data before render         | `loader` on the route         | `async` server component           |
| Call server code from a client   | `createServerFn`              | Server Action (`"use server"` fn)  |
| Raw HTTP endpoint                | `server.handlers.GET`         | `route.ts` exporting `GET`         |
| Read env / DB from server        | Inside `.handler()`           | Inside a server component or route |
| Never runs on server             | `<ClientOnly>` / `useEffect`  | `"use client"` + `useEffect`       |

### 4. Root layout / shell

TanStack `__root.tsx`:
```ts
export const Route = createRootRouteWithContext<{ queryClient }>()({
  head: () => ({ meta: […], links: […] }),
  shellComponent: RootShell,    // <html>/<body>
  component: RootComponent,     // providers + <Outlet />
});
```

Next.js `layout.tsx`:
```ts
export const metadata = { title: "…", description: "…" };
export default function RootLayout({ children }) {
  return (
    <html><body><Providers>{children}</Providers></body></html>
  );
}
```

Next's `layout.tsx` **must render `<html>` and `<body>`** at the root; nested
layouts render `{children}`, which is the equivalent of TanStack's `<Outlet />`.

### 5. Metadata

- TanStack: per-route `head()` returning `{ meta, links, scripts }`. Concatenated top-down through the route tree.
- Next.js: per-page `export const metadata` (static) or `export async function generateMetadata()` (dynamic). Merged down the layout → page chain.

### 6. Data fetching in components

TanStack canonical pattern (per docs):
```ts
export const Route = createFileRoute("/posts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQueryOptions),
  component: PostsPage,
});
function PostsPage() {
  const { data } = useSuspenseQuery(postsQueryOptions);
}
```

Next.js canonical pattern:
```ts
// server component — no hooks needed
export default async function PostsPage() {
  const posts = await getPosts();          // direct DB / server-only fn call
  return <ul>{posts.map(…)}</ul>;
}
```

Both frameworks support TanStack Query on the client identically — see
`src/app/providers.tsx` (Next) and `src/router.tsx` (TanStack).

### 7. Navigation

```tsx
// TanStack
import { Link } from "@tanstack/react-router";
<Link to="/$user/items" params={{ user }}>Items</Link>

// Next.js
import Link from "next/link";
<Link href={`/${user}/items`}>Items</Link>
```

Programmatic:

```tsx
// TanStack: const nav = useNavigate(); nav({ to: "/x" });
// Next.js:  const router = useRouter(); router.push("/x");   // from next/navigation
```

### 8. Runtime & deployment

- TanStack Start (this project) targets **Cloudflare Workers** via nitro. That
  imposes limits — no `child_process`, no arbitrary Node native modules.
- Next.js defaults to **Node.js**. You can opt individual routes into the Edge
  runtime with `export const runtime = "edge"`.

---

## Directory map

```
framework/
  package.json               Standalone Next.js project (own deps)
  next.config.mjs
  tsconfig.json              Path alias @/* → src/*
  src/
    app/
      layout.tsx             Root shell + <Providers>
      providers.tsx          QueryClientProvider (client)
      page.tsx               / (server component)
      globals.css
      leaderboard/page.tsx   Server component that fetch()es the API route
      play/page.tsx          Client component using Zustand store
      [user]/items/page.tsx  Dynamic route + TanStack Query
      api/mock/…/route.ts    All 17 mock API routes (1-to-1 with TanStack)
    lib/                     clock, utils, rng-helpers (copied)
    mock/                    Same dataset + types as parent app
    stores/                  Same Zustand store, actions, formulas — untouched
```

## What's intentionally NOT ported

- **shadcn/ui + Tailwind v4**: the parent app uses Tailwind v4 through
  `src/styles.css`. Both frameworks handle Tailwind the same way; a plain CSS
  file is used here to keep the comparison focused on **routing + data**, not
  styling. Add Tailwind to Next.js with `npx create-next-app` defaults or the
  official Tailwind v4 guide.
- **Auth / Supabase**: parent uses a `requireSupabaseAuth` server-function
  middleware. Next.js equivalent = a middleware in `middleware.ts` at the
  project root, or a server action reading cookies via `next/headers`.
- **Every page**: 30+ pages exist in the parent app. This port covers home,
  leaderboard, play, and one dynamic route — enough to demonstrate all three
  rendering models (server, client, dynamic-params). Copy any remaining
  TanStack page into `src/app/<name>/page.tsx` and it will work identically
  once you swap the imports.

---

## Quick porting checklist

Given a TanStack route `src/routes/foo.bar.tsx`:

1. Create `src/app/foo/bar/page.tsx`.
2. Delete the `createFileRoute(...)` wrapper — export the component as `default`.
3. Replace `Route.head(...)` with `export const metadata`.
4. Swap `@tanstack/react-router` imports:
   - `Link` → from `next/link` (use `href` not `to`).
   - `useParams`, `useSearch`, `useRouter`, `useNavigate` → from `next/navigation` (`useParams`, `useSearchParams`, `useRouter`).
5. If the component uses hooks / state / effects, add `"use client"` at the top.
6. If the route needs data before render, mark the component `async` and
   fetch at the top (server component) — no need for a `loader`.

Given a TanStack API `src/routes/api/foo.$id.ts`:

1. Create `src/app/api/foo/[id]/route.ts`.
2. Copy the handler body.
3. Rewrite the signature: `export async function GET(request, { params })`.
4. `await params` before reading `params.id`.

That's it. Have fun.
