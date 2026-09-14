import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pill, fmt } from "@/components/logs";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

const RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const;
const TONE: Record<(typeof RARITIES)[number], "muted" | "success" | "info" | "warning" | "danger"> = {
  COMMON: "muted",
  UNCOMMON: "success",
  RARE: "info",
  EPIC: "warning",
  LEGENDARY: "danger",
};
const HUE: Record<(typeof RARITIES)[number], number> = {
  COMMON: 260, UNCOMMON: 160, RARE: 240, EPIC: 300, LEGENDARY: 60,
};

export const Route = createFileRoute("/market/relics")({
  component: MarketRelics,
});

function MarketRelics() {
  const listings = useGameStore((s) => s.marketRelics);
  const fetchMarketRelics = useGameStore((s) => s.fetchMarketRelics);
  const [filter, setFilter] = useState<"ALL" | (typeof RARITIES)[number]>("ALL");

  useEffect(() => { void fetchMarketRelics(); }, [fetchMarketRelics]);

  const filtered = useMemo(
    () => listings.filter((l) => filter === "ALL" || String(l.type).toUpperCase() === filter),
    [listings, filter],
  );

  return (
    <div className="bracket-frame p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-6 border-b border-border/60 px-6 pt-4">
        {(["ALL", ...RARITIES] as const).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pb-3 text-sm tracking-wide border-b-2 -mb-px capitalize transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.toLowerCase()}
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-4 py-3 text-left">Artifact</th>
              <th className="px-4 py-3 text-left">Rarity</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-left">Seller</th>
              <th className="px-4 py-3 text-right">Listed</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                  {listings.length ? "No artifacts match your filter." : "Loading listings…"}
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const type = String(r.type).toUpperCase() as (typeof RARITIES)[number];
              return (
                <tr key={r._id} className="border-t border-border/40 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded border border-border/60 shrink-0"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, oklch(0.75 0.18 ${HUE[type] ?? 260}), oklch(0.22 0.05 260))`,
                        }}
                      />
                      <div className="font-semibold capitalize">{type.toLowerCase()} Artifact</div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Pill tone={TONE[type] ?? "muted"}>{type}</Pill></td>
                  <td className="px-4 py-3 text-right font-mono">{r.market.amount}</td>
                  <td className="px-4 py-3 text-primary">{r.market.seller}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                    {new Date(r.market.created).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono font-semibold">{fmt(Number(r.market.price), 3)}</div>
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