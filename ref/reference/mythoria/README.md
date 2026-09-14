# Mythoria

A fantasy trading game built with Next.js 16, Zustand, and Tailwind CSS v4.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **UI:** React 19, Radix UI, shadcn/ui
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **State:** Zustand v5 (client-side persist, no Supabase)
- **Package manager:** pnpm

## Development

```sh
git clone <this-repository-url>
cd mythoria
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```sh
pnpm build
pnpm start
```

## Deploy

This project is configured for Vercel deployment.

- Framework preset: **Next.js**
- Build command: `pnpm build`
- Output directory: `.next` (auto-detected)
- Install command: `pnpm install`

Push to the `main` branch to trigger a production deployment.
