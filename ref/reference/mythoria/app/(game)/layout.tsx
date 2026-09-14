'use client';
// app/(game)/layout.tsx
// Client-side auth guard for all gated game routes.
// The middleware handles the server-side redirect; this is a belt-and-suspenders
// client check so the shell never renders protected content without a token.
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameStore } from "@/features/game-store/game-store";
import type { ReactNode } from "react";

function GameLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoggedIn = useGameStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) {
      const current = window.location.pathname;
      router.replace(`/login?redirect=${encodeURIComponent(current)}`);
    }
  }, [isLoggedIn, router, searchParams]);

  if (!isLoggedIn) {
    // Render nothing while the redirect fires
    return null;
  }

  return <>{children}</>;
}

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GameLayoutContent>{children}</GameLayoutContent>
    </Suspense>
  );
}
