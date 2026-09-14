import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pill, fmt, seedFromString, mulberry32 } from "@/components/logs";
import { Button } from "@/components/ui/button";
import { CITIZENS } from "@/mock/types";

const RARITIES = [
  { name: "Common", tone: "muted" as const, hue: 260, price: [40, 120] as const },
  { name: "Uncommon", tone: "success" as const, hue: 160, price: [120, 300] as const },
  { name: "Rare", tone: "info" as const, hue: 240, price: [300, 800] as const },
  { name: "Epic", tone: "warning" as const, hue: 300, price: [800, 2000] as const },
  { name: "Legendary", tone: "danger" as const, hue: 60, price: [2000, 5000] as const },
];

type ChestListing = {
  id: string;
  name: string;
  tone: (typeof RARITIES)[number]["tone"];
  hue: number;
  seller: string;
  price: number;
  created: number;
};

function buildChestListings(): ChestListing[] {
  const rand = mulberry32(seedFromString("market-chests-v1"));
  const out: ChestListing[] = [];
  for (let i = 0; i < 40; i++) {
    const r = RARITIES[Math.floor(rand() * RARITIES.length)]!;
    const seller = CITIZENS[Math.floor(rand() * CITIZENS.length)]!;
    const [lo, hi] = r.price;
    out.push({
      id: `chest-${i}-${Math.floor(rand() * 1e9)}`,
      name: r.name,
      tone: r.tone,
      hue: r.hue,
      seller,
      price: +(rand() * (hi - lo) + lo).toFixed(3),
      created: Date.now() - Math.floor(rand() * 1000 * 60 * 60 * 24 * 14),
    });
  }
  return out;
}

export const Route = createFileRoute("/market/crates")({
  component: MarketChests,
});

const FILTERS = ["All", "Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;

function MarketChests() {
  const listings = useMemo(buildChestListings, []);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = listings.filter((l) => filter === "All" || l.name === filter);

  return (
    <div className="bracket-frame p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-6 border-b border-border/60 px-6 pt-4">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pb-3 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-4 py-3 text-left">Chest</th>
              <th className="px-4 py-3 text-left">Rarity</th>
              <th className="px-4 py-3 text-left">Seller</th>
              <th className="px-4 py-3 text-right">Listed</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  No chests listed.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border/40 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded border border-border/60 shrink-0"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, oklch(0.75 0.18 ${c.hue}), oklch(0.25 0.05 260))`,
                      }}
                    />
                    <div className="font-semibold">{c.name} Chest</div>
                  </div>
                </td>
                <td className="px-4 py-3"><Pill tone={c.tone}>{c.name}</Pill></td>
                <td className="px-4 py-3 text-primary">{c.seller}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                  {new Date(c.created).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-mono font-semibold">{fmt(c.price, 3)}</div>
                  <div className="text-[10px] text-muted-foreground">HIVE</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline">Buy</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}