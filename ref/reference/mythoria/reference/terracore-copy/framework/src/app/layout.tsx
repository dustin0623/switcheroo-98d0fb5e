import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

// In TanStack Start, this metadata lives in `src/routes/__root.tsx` via
// createRootRouteWithContext({ head: () => ({ meta: [...] }) }).
// In Next.js App Router, the root layout exports a `metadata` object.
export const metadata: Metadata = {
  title: "TerraCore — Next.js Port",
  description: "Side-by-side Next.js App Router port of the TanStack Start app.",
  openGraph: {
    title: "TerraCore — Next.js Port",
    description: "Side-by-side Next.js App Router port of the TanStack Start app.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// The root layout replaces TanStack's `shellComponent`. It owns <html> and <body>
// and wraps every route with providers.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/play">Play</Link>
            <Link href="/citizen1/items">Citizen1 items</Link>
            <span className="muted" style={{ marginLeft: "auto" }}>
              Next.js App Router
            </span>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
