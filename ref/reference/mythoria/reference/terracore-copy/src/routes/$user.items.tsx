import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { InventoryShell, FilterTabs } from "@/components/inventory";
import { Pill, fmt } from "@/components/logs";
import { useGameStore } from "@/stores/game-store";
import { equipItem, forgeItem, salvageItem, unequipSlot } from "@/stores/actions/items";
import type { Item, ItemType, Rarity } from "@/mock/types";
import { toast } from "sonner";


const CATEGORIES = ["All", "Equipped", "ship", "weapon", "armor", "avatar", "special", "For Sale"] as const;

const RARITY_TONE: Record<Rarity, "muted" | "success" | "info" | "warning" | "danger"> = {
  common: "muted",
  uncommon: "success",
  rare: "info",
  epic: "warning",
  legendary: "danger",
};

export const Route = createFileRoute("/$user/items")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.user}'s Items — Mythoria` },
      { name: "description", content: `${params.user}'s Mythoria inventory.` },
      { property: "og:title", content: `${params.user}'s Items — Mythoria` },
      { property: "og:description", content: `${params.user}'s Mythoria inventory.` },
    ],
  }),
  component: ItemsPage,
});

function ItemsPage() {
  const { user } = Route.useParams();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const inventory = useGameStore((s) => s.inventory[user] ?? null);
  const fetchInventory = useGameStore((s) => s.fetchInventory);
  const activeUser = useGameStore((s) => s.activeUser);
  const player = useGameStore((s) => s.players[user] ?? null);
  const fetchPlayer = useGameStore((s) => s.fetchPlayer);
  const isMe = activeUser === user;

  useEffect(() => {
    void fetchInventory(user);
    if (!player) void fetchPlayer(user);
  }, [user, fetchInventory, fetchPlayer, player]);

  const items: Item[] = inventory?.items ?? [];

  const filtered = items.filter((it) => {
    if (cat === "All") return true;
    if (cat === "Equipped") return it.equiped;
    if (cat === "For Sale") return it.market.listed;
    return it.type === cat;
  });

  return (
    <InventoryShell user={user} active="items" titleWord="Items">
      <FilterTabs
        tabs={CATEGORIES as unknown as string[]}
        active={cat}
        onChange={(v) => setCat(v as typeof cat)}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Edition</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Rarity</th>
              <th className="px-4 py-3 text-right">Minted</th>
              <th className="px-4 py-3 text-right">Attributes</th>
              <th className="px-4 py-3 text-right">{isMe ? "Actions" : "For Sale"}</th>
            </tr>
          </thead>

          <tbody>
            {!inventory && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading inventory…
                </td>
              </tr>
            )}
            {inventory && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No records found
                </td>
              </tr>
            )}
            {filtered.map((it, i) => {
              const hue = (it.item_number * 47) % 360;
              const active = (Object.entries(it.attributes) as [keyof typeof it.attributes, number][])
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1]);
              return (
                <tr
                  key={it._id}
                  className={`border-t border-border/40 hover:bg-secondary/40 ${
                    it.equiped ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 min-w-[280px]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded border border-border/60 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.75 0.16 ${hue}) 0%, oklch(0.3 0.08 260) 100%)`,
                        }}
                      />
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {it.name}
                          <span className="text-primary text-xs">★ {it.level}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">#{it.item_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone="muted">{it.edition}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone="muted">{it.type}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={RARITY_TONE[it.rarity]}>{it.rarity}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    <span className="text-foreground">{it.print}</span> of
                    <br />
                    {it.max_supply.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs whitespace-pre-line">
                    {active.length
                      ? active
                          .map(([k, v]) => `${k}: +${v.toFixed(k === "damage" || k === "defense" ? 2 : 3)}`)
                          .join("\n")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right" data-item-index={i}>
                    {isMe ? (
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {it.equiped ? (
                          <button
                            onClick={() => {
                              const r = unequipSlot(user, it.type);
                              if (r.ok) toast.success(`Unequipped ${it.name}`);
                              else toast.error(r.reason ?? "Unequip failed");
                            }}
                            className="px-2 py-1 text-[10px] font-bold tracking-widest border border-primary text-primary rounded hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            Unequip
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                const r = equipItem(user, it.item_number);
                                if (r.ok) toast.success(`Equipped ${it.name}`);
                                else toast.error(r.reason ?? "Equip failed");
                              }}
                              disabled={it.burnt}
                              className="px-2 py-1 text-[10px] font-bold tracking-widest border border-primary text-primary rounded hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
                            >
                              Equip
                            </button>
                            <button
                              onClick={() => {
                                const r = forgeItem(user, it.item_number);
                                if (r.ok) toast.success(`Forged ${it.name}`);
                                else toast.error(r.reason ?? "Forge failed");
                              }}
                              disabled={it.burnt || it.equiped}
                              className="px-2 py-1 text-[10px] font-bold tracking-widest border border-border text-muted-foreground rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
                            >
                              Forge
                            </button>
                            <button
                              onClick={() => {
                                const r = salvageItem(user, it.item_number);
                                if (r.ok) toast.success(`Salvaged ${it.name} for ${r.flux?.toFixed(3)} FLUX`);
                                else toast.error(r.reason ?? "Salvage failed");
                              }}
                              disabled={it.burnt || it.equiped}
                              className="px-2 py-1 text-[10px] font-bold tracking-widest border border-border text-muted-foreground rounded hover:border-destructive hover:text-destructive transition-colors disabled:opacity-40"
                            >
                              Salvage
                            </button>
                          </>
                        )}
                      </div>
                    ) : it.equiped ? (
                      <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-widest border border-primary text-primary rounded">
                        EQUIPPED
                      </span>
                    ) : it.market.listed ? (
                      <div>
                        <div className="font-mono">{fmt(it.market.price, 3)}</div>
                        <div className="text-[10px] text-muted-foreground">HIVE</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </InventoryShell>
  );
}
