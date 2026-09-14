'use client';

import type { Metadata } from "next";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/site-layout";
import type { ItemTemplate, ItemType, Rarity } from "@/features/types";

const TYPES: ItemType[] = ["mount", "weapon", "armor", "avatar", "accessory"];
const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
const SORTS = [
  { v: "item_asc", l: "Item Number (ASC)" },
  { v: "item_desc", l: "Item Number (DESC)" },
  { v: "damage", l: "Attack (DESC)" },
  { v: "guardian", l: "Defense (DESC)" },
  { v: "arcane", l: "Gathering (DESC)" },
  { v: "crit", l: "Crit (DESC)" },
  { v: "dodge", l: "Speed (DESC)" },
  { v: "luck", l: "Luck (DESC)" },
];

const rarityColor: Record<Rarity, string> = {
  common: "bg-muted text-muted-foreground",
  uncommon: "bg-emerald-500/20 text-emerald-300",
  rare: "bg-sky-500/20 text-sky-300",
  epic: "bg-fuchsia-500/20 text-fuchsia-300",
  legendary: "bg-amber-500/20 text-amber-300",
};

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded border text-[10px] uppercase tracking-widest transition-colors ${
        active
          ? "border-primary text-primary bg-primary/10"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function topAttribute(i: ItemTemplate): { key: string; value: number } {
  const a = i.attributes;
  const entries = Object.entries(a) as [keyof typeof a, number][];
  const top = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  return { key: top[0][0]!.toUpperCase() + top[0].slice(1), value: top[1] };
}

export default function ItemsArchivePage() {
  const [type, setType] = useState<ItemType | "">("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [edition, setEdition] = useState<string>("");
  const [sort, setSort] = useState("item_asc");
  const [data, setData] = useState<ItemTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (rarity) params.set("rarity", rarity);
    if (edition) params.set("edition", edition);
    params.set("sort", sort);
    params.set("limit", "200");
    return `/api/mock/items_archive?${params}`;
  }, [type, rarity, edition, sort]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((j) => alive && setData(j.data ?? []))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <PageShell>
      <div className="container-tc py-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-wider">Items Archive</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every item template in Mythoria. Some copies may have been salvaged over time.
        </p>

        <div className="bracket-frame mt-6 p-5 grid gap-5 md:grid-cols-4">
          <FilterGroup label="Type">
            {TYPES.map((t) => (
              <Pill key={t} active={type === t} onClick={() => setType(type === t ? "" : t)}>
                {t}
              </Pill>
            ))}
          </FilterGroup>
          <FilterGroup label="Rarity">
            {RARITIES.map((r) => (
              <Pill key={r} active={rarity === r} onClick={() => setRarity(rarity === r ? "" : r)}>
                {r[0]!.toUpperCase()}
                <span className="hidden sm:inline">{r.slice(1)}</span>
              </Pill>
            ))}
          </FilterGroup>
          <FilterGroup label="Edition">
            <Pill active={edition === "beta"} onClick={() => setEdition(edition === "beta" ? "" : "beta")}>
              Beta
            </Pill>
          </FilterGroup>
          <FilterGroup label="Sort By">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-input/40 border border-border rounded-md px-3 py-1.5 text-xs w-full"
            >
              {SORTS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
          </FilterGroup>
        </div>

        <div className="bracket-frame mt-6 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-muted-foreground uppercase tracking-widest">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Rarity</th>
                <th className="px-3 py-3">Edition</th>
                <th className="px-3 py-3 text-right">Max Supply</th>
                <th className="px-3 py-3 text-right">Top Stat</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={7}>
                    No items found
                  </td>
                </tr>
              )}
              {data.map((item) => {
                const hue = (item.item_number * 47) % 360;
                const top = topAttribute(item);
                return (
                  <tr key={item.item_number} className="border-t border-border/50 hover:bg-accent/20">
                    <td className="px-3 py-2 text-primary font-semibold">#{item.item_number}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded border border-border/60 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, oklch(0.75 0.16 ${hue}) 0%, oklch(0.3 0.08 260) 100%)`,
                          }}
                        />
                        <span className="font-semibold">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 capitalize">{item.type}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-widest uppercase ${rarityColor[item.rarity]}`}>
                        {item.rarity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{item.edition}</td>
                    <td className="px-3 py-2 text-right">{item.max_supply.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-primary">
                      {top.key}: +{top.value.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
