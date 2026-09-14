import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pill, fmt } from "@/components/logs";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

const POTION_META: Record<string, { label: string; hue: number; tone: "muted" | "success" | "info" | "warning" | "danger" }> = {
  crit: { label: "Crit Elixir", hue: 20, tone: "danger" },
  damage: { label: "Damage Draught", hue: 0, tone: "danger" },
  dodge: { label: "Dodge Tonic", hue: 200, tone: "info" },
  protection: { label: "Protection Brew", hue: 140, tone: "success" },
  focus: { label: "Focus Philter", hue: 260, tone: "info" },
  rage: { label: "Rage Potion", hue: 40, tone: "warning" },
  impenetrable: { label: "Impenetrable Balm", hue: 120, tone: "success" },
  overload: { label: "Overload Vial", hue: 300, tone: "warning" },
  rogue: { label: "Rogue Mixture", hue: 280, tone: "info" },
  fury: { label: "Fury Draught", hue: 15, tone: "danger" },
};

export const Route = createFileRoute("/market/consumables")({
  component: MarketConsumables,
});

function MarketConsumables() {
  const listings = useGameStore((s) => s.marketConsumables);
  const fetchMarketConsumables = useGameStore((s) => s.fetchMarketConsumables);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { void fetchMarketConsumables(); }, [fetchMarketConsumables]);

  const types = useMemo(() => Array.from(new Set(listings.map((l) => l.type))).sort(), [listings]);
  const filtered = useMemo(
    () => listings.filter((l) => filter === "all" || l.type === filter),
    [listings, filter],
  );

  return (
    <div className="bracket-frame p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-6 border-b border-border/60 px-6 pt-4">
        {["all", ...types].map((f) => {
          const active = filter === f;
          const label = f === "all" ? "All" : (POTION_META[f]?.label ?? f);
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pb-3 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-4 py-3 text-left">Potion</th>
              <th className="px-4 py-3 text-left">Effect</th>
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
                  {listings.length ? "No potions match your filter." : "Loading listings…"}
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const meta = POTION_META[c.type] ?? { label: c.type, hue: 260, tone: "muted" as const };
              return (
                <tr key={c._id} className="border-t border-border/40 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded border border-border/60 shrink-0"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, oklch(0.78 0.18 ${meta.hue}), oklch(0.22 0.05 260))`,
                        }}
                      />
                      <div className="font-semibold">{meta.label}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Pill tone={meta.tone}>{c.type}</Pill></td>
                  <td className="px-4 py-3 text-right font-mono">{c.market.amount}</td>
                  <td className="px-4 py-3 text-primary">{c.market.seller}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                    {new Date(c.market.created).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono font-semibold">{fmt(Number(c.market.price), 3)}</div>
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