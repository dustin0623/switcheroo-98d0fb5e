"use client";

import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { TokenIcon } from "@/components/brand/TokenIcon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ConnectGate } from "@/components/auth/ConnectGate";
import { ApiStatusIndicator } from "@/components/layout/ApiStatusIndicator";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useHydrated } from "@/hooks/useHydrated";
import { useMiningTick } from "@/hooks/useMiningTick";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/stores/authStore";

function GameLoop() {
  useMiningTick();
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const connected = useAuthStore((state) => state.address !== null && state.username !== null);
  const isPublicRoute = pathname === "/" || pathname === "/marketplace" || pathname === "/wiki";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <aside
          className={cn(
            "relative hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col",
            collapsed ? "w-[56px]" : "w-[240px]",
          )}
        >
          <SidebarNav
            collapsed={collapsed}
            showBalances={hydrated && connected}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[80vw] max-w-[280px] border-0 bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarNav showBalances={hydrated && connected} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <Menu className="size-4" />
            </button>
            <Link href="/" className="ml-auto flex items-center gap-2 focus:outline-none">
              <TokenIcon className="size-7" />
              <BrandLogo className="h-6" />
            </Link>
            <div className="ml-2">
              <ApiStatusIndicator />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {hydrated ? (
              isPublicRoute ? (
                <div className="mx-auto min-h-full w-full min-w-0 max-w-6xl px-4 py-6 md:px-8 md:py-8">
                  {children}
                </div>
              ) : connected ? (
                <>
                  <GameLoop />
                  <div className="mx-auto min-h-full w-full min-w-0 max-w-6xl px-4 py-6 md:px-8 md:py-8">
                    {children}
                  </div>
                </>
              ) : (
                <ConnectGate />
              )
            ) : (
              <div className="grid min-h-[60vh] place-items-center px-4 py-20">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-14 w-14 rounded-full border border-primary/20" />
                    <div className="absolute h-14 w-14 rounded-full border-t-2 border-primary animate-spin" />
                    <div className="h-3 w-3 rounded-full bg-primary" />
                  </div>
                  <p className="mt-5 text-sm font-medium text-muted-foreground animate-pulse">
                    Loading your rig…
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
