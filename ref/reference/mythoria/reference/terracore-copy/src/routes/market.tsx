import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageShell } from "@/components/site-layout";
import { LogsDropdown } from "@/components/logs-dropdown";
import { useGameStore } from "@/stores/game-store";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market — Mythoria" },
      { name: "description", content: "Buy, sell, and trade Mythoria items, crates, relics and potions." },
      { property: "og:title", content: "Market — Mythoria" },
      { property: "og:description", content: "Web3 marketplace for Mythoria assets." },
    ],
  }),
  component: MarketLayout,
});

const tabs: { to: "/market" | "/market/crates" | "/market/relics" | "/market/consumables"; label: string; exact?: boolean }[] = [
  { to: "/market", label: "Items", exact: true },
  { to: "/market/crates", label: "Chests" },
  { to: "/market/relics", label: "Artifacts" },
  { to: "/market/consumables", label: "Potions" },
];

function MarketLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
                { to: "/$user/market_logs", params: { user: activeUser }, label: "My Logs" },
                { to: "/market_logs", label: "All Market Logs" },
              ]}
            />
            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs font-semibold tracking-widest">
              {tabs.map((t) => {
                const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
                return (
                  <Link
                    key={t.to}
                    to={t.to}
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
        <Outlet />
      </div>
    </PageShell>
  );
}
