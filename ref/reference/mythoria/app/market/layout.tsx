'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageShell } from "@/components/site-layout";
import { LogsDropdown } from "@/components/logs-dropdown";
import { useGameStore } from "@/features/game-store/game-store";

const tabs: { href: string; label: string; exact?: boolean }[] = [
  { href: "/market", label: "Items", exact: true },
  { href: "/market/crates", label: "Chests" },
  { href: "/market/relics", label: "Artifacts" },
  { href: "/market/consumables", label: "Potions" },
];

export default function MarketLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeUser = useGameStore((s) => s.activeUser);

  return (
    <PageShell>
      <div className="container-tc py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wider text-foreground">
            Market
          </h1>
          <div className="flex items-center gap-2">
            <LogsDropdown
              items={[
                { to: "/$user/market-logs", params: { user: activeUser }, label: "My Logs" },
                { to: "/market-logs", label: "All Market Logs" },
              ]}
            />
            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs font-semibold tracking-widest">
              {tabs.map((t) => {
                const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`px-4 py-1.5 transition-colors ${
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        {children}
      </div>
    </PageShell>
  );
}
