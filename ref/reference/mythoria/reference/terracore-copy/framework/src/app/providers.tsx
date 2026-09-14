"use client";

// `"use client"` is the Next.js App Router equivalent of everything below
// `Route.component = ...` in TanStack Start — it marks the boundary between
// server components (default) and client components.
//
// TanStack Start wires TanStack Query into the router context inside
// `src/router.tsx` (`getRouter()` builds a new QueryClient per request).
// In Next.js we don't have a router-context slot, so we create the
// QueryClient inside a client provider component that wraps the tree.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Match the TanStack Start config (defaultPreloadStaleTime: 0).
            staleTime: 0,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
