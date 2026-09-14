'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InventoryShell, FilterTabs } from "@/components/inventory";
import { Pill, seedFromString, mulberry32, fmt } from "@/components/logs";
import { useGameStore } from "@/features/game-store/game-store";

const CATEGORIES = ["All", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Shards"] as const;

const SHARD_RARITIES = [
  { key: "common",    label: "Common",    tone: "muted"    as const, hue: 260, color: "text-muted-foreground",   border: "border-border/60" },
  { key: "uncommon",  label: "Uncommon",  tone: "success"  as const, hue: 160, color: "text-emerald-400",        border: "border-emerald-500/40" },
  { key: "rare",      label: "Rare",      tone: "info"     as const, hue: 240, color: "text-sky-400",            border: "border-sky-500/40" },
  { key: "epic",      label: "Epic",      tone: "warning"  as const, hue: 300, color: "text-fuchsia-400",        border: "border-fuchsia-500/40" },
  { key: "legendary", label: "Legendary", tone: "danger"   as const, hue:  60, color: "text-amber-400",          border: "border-amber-500/40" },
] as const;

const RELICS = [
  { name: "Common", tone: "muted" as const, hue: 260, drop: [["COMMON", "90%"], ["UNCOMMON", "9%"], ["RARE", "0.75%"], ["EPIC", "0.20%"], ["LEGENDARY", "0.05%"]] },
  { name: "Uncommon", tone: "success" as const, hue: 160, drop: [["UNCOMMON", "95%"], ["RARE", "4%"], ["EPIC", "0.90%"], ["LEGENDARY", "0.10%"]] },
  { name: "Rare", tone: "info" as const, hue: 240, drop: [["RARE", "95%"], ["EPIC", "4%"], ["LEGENDARY", "1%"]] },
  { name: "Epic", tone: "warning" as const, hue: 300, drop: [["EPIC", "98%"], ["LEGENDARY", "2%"]] },
  { name: "Legendary", tone: "danger" as const, hue: 60, drop: [["LEGENDARY", "100%"]] },
] as const;

export default function RelicsPage({ params }: { params: Promise<{ user: string }> }) {
  const [user, setUser] = useState<string>("");
  useEffect(() => {
    params.then((p) => setUser(p.user));
  }, [params]);

  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const inventory = useGameStore((s) => (user ? s.inventory[user] ?? null : null));

  const rows = useMemo(() => {
    if (!user) return [];
    const rand = mulberry32(seedFromString(`${user}-relics`));
    return RELICS.map((r) => ({ ...r, qty: +(rand() * 100 + 5).toFixed(3) }));
  }, [user]);

  // Shard counts — seeded mock if not yet loaded from API
  const shardCounts = useMemo(() => {
    if (!user) return {} as Record<string, number>;
    const stored = inventory?.shards ?? {};
    const rand = mulberry32(seedFromString(`${user}-shards`));
    return Object.fromEntries(
      SHARD_RARITIES.map((s) => [
        s.key,
        (stored as Record<string, number>)[s.key] ?? Math.floor(rand() * 800 + 10),
      ])
    );
  }, [user, inventory]);

  const filtered = rows.filter((r) => (cat === "All" ? true : r.name === cat));

  if (!user) return null;

  return (
    <InventoryShell user={user} active="relics" titleWord="Artifacts" showLogs={false}>
      <FilterTabs
        tabs={CATEGORIES as unknown as string[]}
        active={cat}
        onChange={(v) => setCat(v as typeof cat)}
        rightSlot={
          <Link href="/market/relics" className="px-3 py-1.5 text-xs font-semibold border border-purple-500 text-purple-400 rounded-md">
            Check Market
          </Link>
        }
      />

      {cat === "Shards" ? (
        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground max-w-xl">
            Shards are rarity-tiered crystals earned by completing artifact quests. Accumulate enough shards of the same tier to craft a matching crate.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SHARD_RARITIES.map((s) => {
              const count = shardCounts[s.key] ?? 0;
              return (
                <div
                  key={s.key}
                  className={`bracket-frame flex flex-col items-center gap-3 py-5 px-4 border ${s.border}`}
                >
                  {/* Shard icon — double-diamond clip */}
                  <div
                    className="w-12 h-12 shrink-0"
                    style={{
                      background: `linear-gradient(135deg, oklch(0.8 0.22 ${s.hue}), oklch(0.35 0.10 ${s.hue}))`,
                      clipPath: "polygon(50% 0%, 85% 15%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%, 15% 15%)",
                    }}
                  />
                  <div className="text-center">
                    <div className={`text-2xl font-bold font-mono ${s.color}`}>
                      {count.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                      {s.label} Shard{count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border/40 pt-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Craft Progress</div>
            <div className="space-y-2">
              {SHARD_RARITIES.map((s) => {
                const count = shardCounts[s.key] ?? 0;
                const needed = 200;
                const pct = Math.min(100, (count / needed) * 100);
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className={`w-20 text-[10px] uppercase tracking-wider font-semibold ${s.color}`}>{s.label}</div>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary/60">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: `oklch(0.75 0.20 ${s.hue})`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground w-24 text-right">
                      {count.toLocaleString()} / {needed.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Rarity</th>
                <th className="px-4 py-3 text-left">Drop Rates</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.name} className="border-t border-border/40 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded border border-border/60"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.75 0.18 ${r.hue}) 0%, oklch(0.2 0.05 260) 100%)`,
                          clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                        }}
                      />
                      <div>
                        <div className="font-semibold">{r.name} Artifacts</div>
                        <div className="text-[11px] text-muted-foreground max-w-sm">
                          Artifacts can be combined to get a crate of the corresponding rarity. Artifacts required: 100
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Pill tone={r.tone}>{r.name}</Pill></td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-mono space-y-0.5">
                      {r.drop.map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground">{k}:</span>{" "}
                          <span className="text-foreground">{v}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-lg">{fmt(r.qty, 3)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </InventoryShell>
  );
}
