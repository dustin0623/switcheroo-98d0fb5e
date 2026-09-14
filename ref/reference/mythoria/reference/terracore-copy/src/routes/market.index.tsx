import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { Pill, fmt } from "@/components/logs";
import type { ItemType, Rarity } from "@/mock/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/market/")({
  component: MarketItems,
});

const RARITY_TONE: Record<Rarity, "muted" | "success" | "info" | "warning" | "danger"> = {
  common: "muted",
  uncommon: "success",
  rare: "info",
  epic: "warning",
  legendary: "danger",
};

const CATEGORIES: { key: "all" | ItemType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ship", label: "Ship" },
  { key: "weapon", label: "Weapon" },
  { key: "armor", label: "Armor" },
  { key: "avatar", label: "Avatar" },
  { key: "special", label: "Special" },
];

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

const ATTR_ORDER: (keyof import("@/mock/types").Attributes)[] = [
  "damage",
  "defense",
  "engineering",
  "dodge",
  "crit",
  "luck",
];

function MarketItems() {
  const items = useGameStore((s) => s.marketItems);
  const fetchMarketItems = useGameStore((s) => s.fetchMarketItems);

  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["key"]>("all");
  const [rarities, setRarities] = useState<Set<Rarity>>(new Set());

  useEffect(() => {
    void fetchMarketItems();
  }, [fetchMarketItems]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (cat !== "all" && it.type !== cat) return false;
      if (rarities.size && !rarities.has(it.rarity)) return false;
      return true;
    });
  }, [items, cat, rarities]);

  const toggleRarity = (r: Rarity) => {
    setRarities((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  };

  return (
    <div className="bracket-frame p-0 overflow-hidden">
      {/* Category underline tabs */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border/60 px-6 pt-4">
        {CATEGORIES.map((c) => {
          const active = cat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`pb-3 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Rarity filters */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-b border-border/40">
        <span className="text-xs text-muted-foreground mr-1">Rarity</span>
        {RARITIES.map((r) => {
          const active = rarities.has(r);
          return (
            <button
              key={r}
              onClick={() => toggleRarity(r)}
              className={`px-2.5 py-1 rounded border text-[10px] font-semibold tracking-[0.2em] uppercase transition-colors ${
                active
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Edition</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Rarity</th>
              <th className="px-4 py-3 text-right">Minted</th>
              <th className="px-4 py-3 text-left">Attributes</th>
              <th className="px-4 py-3 text-left">Seller</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!filtered.length && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                  {items.length ? "No listings match your filters." : "Loading listings…"}
                </td>
              </tr>
            )}
            {filtered.map((it) => {
              const hue = (it.item_number * 47) % 360;
              const active = ATTR_ORDER
                .map((k) => [k, it.attributes?.[k] ?? 0] as const)
                .filter(([, v]) => v > 0);
              return (
                <tr key={`${it.item_number}-${it.owner}`} className="border-t border-border/40 hover:bg-secondary/40 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded border border-border/60 shrink-0 mt-0.5"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.75 0.16 ${hue}) 0%, oklch(0.3 0.08 260) 100%)`,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {it.name} <span className="text-[11px] text-muted-foreground">#{it.item_number}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground line-clamp-2 max-w-md">
                          {it.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Pill tone="success">{it.edition}</Pill></td>
                  <td className="px-4 py-3"><Pill tone="muted">{it.type}</Pill></td>
                  <td className="px-4 py-3"><Pill tone={RARITY_TONE[it.rarity]}>{it.rarity}</Pill></td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    <div>{it.print} of</div>
                    <div className="text-muted-foreground">{fmt(it.max_supply, 0)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {active.length ? (
                      <div className="flex flex-col gap-0.5 font-mono">
                        {active.map(([k, v]) => (
                          <div key={k} className="whitespace-nowrap">
                            <span className="text-muted-foreground capitalize">{k}:</span>{" "}
                            <span className="text-primary">
                              +{fmt(v, k === "damage" || k === "defense" ? 2 : 3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-primary">{it.market.seller}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono font-semibold">{fmt(Number(it.market.price), 3)}</div>
                    <div className="text-[10px] text-muted-foreground">HIVE</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline">Buy</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
