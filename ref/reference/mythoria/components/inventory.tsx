'use client';

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageShell } from "@/components/site-layout";
import { LogsDropdown } from "@/components/logs-dropdown";

const TABS = [
  { key: "items", label: "Items", href: (user: string) => `/${user}/items` },
  { key: "crates", label: "Chests", href: (user: string) => `/${user}/crates` },
  { key: "relics", label: "Artifacts", href: (user: string) => `/${user}/relics` },
  { key: "consumables", label: "Potions", href: (user: string) => `/${user}/consumables` },
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
                width: "3.5rem",
                height: "3.5rem",
                background: `radial-gradient(circle at 30% 30%, oklch(0.75 0.16 170), oklch(0.2 0.05 260))`,
              }}
            />
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider">
              {cap(user)}&apos;s {titleWord}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {showLogs && (
              <LogsDropdown
                items={[
                  { to: "/$user/item-logs", params: { user }, label: "Item Logs" },
                  { to: "/$user/forge-logs", params: { user }, label: "Upgrade Logs" },
                  { to: "/$user/salvage-logs", params: { user }, label: "Dismantle Logs" },
                ]}
              />
            )}
            <div className="flex rounded-md border border-border overflow-hidden">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={t.href(user)}
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

/** Re-export for any component that still calls usePathname from this module. */
export { usePathname };
