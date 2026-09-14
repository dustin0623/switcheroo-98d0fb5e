'use client';

import { useEffect, useMemo, useState } from "react";
import { Pill, fmt, seedFromString, mulberry32 } from "@/components/logs";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/features/game-store/game-store";

const RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const;
const TONE: Record<(typeof RARITIES)[number], "muted" | "success" | "info" | "warning" | "danger"> = {
  COMMON: "muted",
  UNCOMMON: "success",
  RARE: "info",
  EPIC: "warning",
  LEGENDARY: "danger",
};
const HUE: Record<(typeof RARITIES)[number], number> = {
  COMMON: 260,
  UNCOMMON: 160,
  RARE: 240,
  EPIC: 300,
  LEGENDARY: 60,
};

const SHARD_SELLERS = ["lynliss7", "donchate", "baldric797", "admiralendor455", "kipo1", "mmlzl", "annihill"];

function useShardListings() {
  return useMemo(() => {
    const rand = mulberry32(seedFromString("market-shards-v1"));
    return RARITIES.flatMap((rarity) =>
      Array.from({ length: Math.floor(rand() * 4) + 2 }, (_, i) => ({
        id: `${rarity}-${i}`,
        rarity,
        qty: Math.floor(rand() * 500) + 10,
        seller: SHARD_SELLERS[Math.floor(rand() * SHARD_SELLERS.length)],
        price: +(rand() * 0.08 + 0.005).toFixed(4),
        listed: Date.now() - Math.floor(rand() * 7 * 86400000),
      }))
    ).sort((a, b) => a.price - b.price);
  }, []);
}

export default function MarketRelicsPage() {
  const listings = useGameStore((s) => s.marketRelics);
  const fetchMarketRelics = useGameStore((s) => s.fetchMarketRelics);
  const [filter, setFilter] = useState<"ALL" | "SHARDS" | (typeof RARITIES)[number]>("ALL");

  useEffect(() => {
    void fetchMarketRelics();
  }, [fetchMarketRelics]);

  const filtered = useMemo(
    () => listings.filter((l) => filter === "ALL" || String(l.type).toUpperCase() === filter),
    [listings, filter],
  );

  const shardListings = useShardListings();
  const filteredShards = useMemo(
    () => filter === "SHARDS" ? shardListings : shardListings.filter((s) => s.rarity === filter),
    [filter, shardListings],
  );

  const ALL_TABS = ["ALL", ...RARITIES, "SHARDS"] as const;

  return (
    <div className="bracket-frame p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-6 border-b border-border/60 px-6 pt-4">
        {ALL_TABS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f as typeof filter)}
              className={`pb-3 text-sm tracking-wide border-b-2 -mb-px capitalize transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "SHARDS" ? "Shards" : f.toLowerCase()}
            </button>
          );
        })}
      </div>

      {filter === "SHARDS" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                <th className="px-4 py-3 text-left">Shard</th>
                <th className="px-4 py-3 text-left">Rarity</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-left">Seller</th>
                <th className="px-4 py-3 text-right">Listed</th>
                <th className="px-4 py-3 text-right">Price / shard</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredShards.map((s) => (
                <tr key={s.id} className="border-t border-border/40 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.8 0.22 ${HUE[s.rarity]}), oklch(0.35 0.10 ${HUE[s.rarity]}))`,
                          clipPath: "polygon(50% 0%, 85% 15%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%, 15% 15%)",
                        }}
                      />
                      <div className="font-semibold capitalize">{s.rarity.toLowerCase()} Shard</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={TONE[s.rarity]}>{s.rarity}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{s.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-primary">{s.seller}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                    {new Date(s.listed).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono font-semibold">{fmt(s.price, 4)}</div>
                    <div className="text-[10px] text-muted-foreground">HIVE</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline">Buy</Button>
                  </td>
                </tr>
              ))}
              {filteredShards.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    No shard listings available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
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
                    <td className="px-4 py-3">
                      <Pill tone={TONE[type] ?? "muted"}>{type}</Pill>
                    </td>
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
      )}
    </div>
  );
}
