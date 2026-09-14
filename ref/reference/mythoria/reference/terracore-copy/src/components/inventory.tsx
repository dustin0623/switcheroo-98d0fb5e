import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { PageShell } from "@/components/site-layout";
import { LogsDropdown } from "@/components/logs-dropdown";

const TABS = [
  { key: "items", label: "Items", to: "/$user/items" as const },
  { key: "crates", label: "Chests", to: "/$user/crates" as const },
  { key: "relics", label: "Artifacts", to: "/$user/relics" as const },
  { key: "consumables", label: "Potions", to: "/$user/consumables" as const },
];

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function InventoryShell({
  user,
  active,
  titleWord,
  showLogs = true,
  children,
}: {
  user: string;
  active: "items" | "crates" | "relics" | "consumables";
  titleWord: string;
  showLogs?: boolean;
  children: ReactNode;
}) {
  return (
    <PageShell>
      <div className="container-tc py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full border border-border/60 shrink-0"
              style={{
                background: `radial-gradient(circle at 30% 30%, oklch(0.75 0.16 170), oklch(0.2 0.05 260))`,
              }}
            />
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider">
              {cap(user)}'s {titleWord}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {showLogs && (
              <LogsDropdown
                items={[
                  { to: "/$user/item_logs", params: { user }, label: "Item Logs" },
                  { to: "/$user/forge_logs", params: { user }, label: "Upgrade Logs" },
                  { to: "/$user/salvage_logs", params: { user }, label: "Dismantle Logs" },
                ]}
              />
            )}
            <div className="flex rounded-md border border-border overflow-hidden">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  to={t.to}
                  params={{ user }}
                  className={`px-3 md:px-4 py-2 text-xs font-semibold tracking-widest transition-colors ${
                    active === t.key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="bracket-frame p-0">{children}</div>
      </div>
    </PageShell>
  );
}

export function FilterTabs({
  tabs,
  active,
  onChange,
  rightSlot,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 flex-wrap">
      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map((t) => {
          const isActive = active === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`px-3 py-1.5 text-xs font-semibold tracking-widest uppercase border-b-2 transition-colors ${
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
      {rightSlot}
    </div>
  );
}

/* Helper hook to use current pathname if needed */
export function usePathname() {
  const router = useRouter();
  return router.state.location.pathname;
}
