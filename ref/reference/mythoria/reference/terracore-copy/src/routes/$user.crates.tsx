import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { InventoryShell, FilterTabs } from "@/components/inventory";
import { Pill } from "@/components/logs";
import { useGameStore } from "@/stores/game-store";
import { openCrate } from "@/stores/actions/crates";
import type { Crate, Rarity } from "@/mock/types";
import { toast } from "sonner";

const CATEGORIES = ["All", "Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;

const RARITY_META: Record<
  Rarity,
  { tone: "muted" | "success" | "info" | "warning" | "danger"; drop: string; label: string }
> = {
  common: { tone: "muted", label: "Common", drop: "Common: 90% · Uncommon: 9% · Rare: 0.75% · Epic: 0.20% · Legendary: 0.05%" },
  uncommon: { tone: "success", label: "Uncommon", drop: "Uncommon: 90% · Rare: 9% · Epic: 0.90% · Legendary: 0.10%" },
  rare: { tone: "info", label: "Rare", drop: "Rare: 95% · Epic: 4% · Legendary: 1%" },
  epic: { tone: "warning", label: "Epic", drop: "Epic: 98% · Legendary: 2%" },
  legendary: { tone: "danger", label: "Legendary", drop: "Legendary: 100%" },
};

export const Route = createFileRoute("/$user/crates")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.user}'s Chests — Mythoria` },
      { name: "description", content: `${params.user}'s crate inventory.` },
      { property: "og:title", content: `${params.user}'s Chests — Mythoria` },
      { property: "og:description", content: `${params.user}'s crate inventory.` },
    ],
  }),
  component: CratesPage,
});

function CratesPage() {
  const { user } = Route.useParams();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const inventory = useGameStore((s) => s.inventory[user] ?? null);
  const fetchInventory = useGameStore((s) => s.fetchInventory);
  const activeUser = useGameStore((s) => s.activeUser);
  const isMe = activeUser === user;

  useEffect(() => {
    void fetchInventory(user);
  }, [user, fetchInventory]);

  const crates: Crate[] = useMemo(() => inventory?.crates ?? [], [inventory?.crates]);

  const filtered = crates.filter((c) =>
    cat === "All" ? true : RARITY_META[c.rarity].label === cat,
  );

  return (
    <InventoryShell user={user} active="crates" titleWord="Chests">
      <FilterTabs
        tabs={CATEGORIES as unknown as string[]}
        active={cat}
        onChange={(v) => setCat(v as typeof cat)}
        rightSlot={
          <div className="flex items-center gap-2">
            <Link
              to="/shop"
              className="px-3 py-1.5 text-xs font-semibold border border-primary text-primary rounded-md"
            >
              Mint Chests
            </Link>
            <Link
              to="/market/crates"
              className="px-3 py-1.5 text-xs font-semibold border border-purple-500 text-purple-400 rounded-md"
            >
              Check Market
            </Link>
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Rarity</th>
              <th className="px-4 py-3 text-left">Drop Rates</th>
              <th className="px-4 py-3 text-right">Acquired</th>
              {isMe && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {!inventory && (
              <tr>
                <td colSpan={isMe ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground border-t border-border/40">
                  Loading chests…
                </td>
              </tr>
            )}
            {inventory && filtered.length === 0 && (
              <tr>
                <td colSpan={isMe ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground border-t border-border/40">
                  No chests found
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const meta = RARITY_META[c.rarity];
              return (
                <tr key={c._id} className="border-t border-border/40 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded border border-border/60"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, oklch(0.75 0.18 ${
                            meta.label === "Legendary" ? 60 :
                            meta.label === "Epic" ? 300 :
                            meta.label === "Rare" ? 240 :
                            meta.label === "Uncommon" ? 160 : 260
                          }), oklch(0.25 0.05 260))`,
                        }}
                      />
                      <div className="font-semibold">{meta.label} Chest</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-md">{meta.drop}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                    {new Date(c.acquired).toLocaleDateString()}
                  </td>
                  {isMe && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          const r = openCrate(user, c._id);
                          if (r.ok && r.item) toast.success(`Opened chest — minted ${r.item.name}`);
                          else toast.error(r.reason ?? "Open failed");
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold tracking-widest border border-primary text-primary rounded hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        Open
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-3 py-6 border-t border-border/60">
        <Link
          to="/shop"
          className="px-4 py-2 text-xs font-semibold border border-primary text-primary rounded-md"
        >
          Mint Chests
        </Link>
        <Link
          to="/market/crates"
          className="px-4 py-2 text-xs font-semibold border border-purple-500 text-purple-400 rounded-md"
        >
          Check Market
        </Link>
      </div>
    </InventoryShell>
  );
}
