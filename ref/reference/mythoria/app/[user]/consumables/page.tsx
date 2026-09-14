'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InventoryShell, FilterTabs } from "@/components/inventory";
import { seedFromString, mulberry32, fmt } from "@/components/logs";

const CATEGORIES = [
  "All", "Claim", "Attack", "Crit", "Speed",
  "Protection", "Focus", "Raid", "Impenetrable", "Overload",
  "Rage", "Rogue", "Fury",
] as const;

const POTIONS = [
  { name: "Claim Potion", cat: "Claim", desc: `Grant 1 additional "Claim".`, price: 4.0, hue: 170 },
  { name: "Attack Potion", cat: "Attack", desc: `Grant 1 additional "Attack".`, price: 7.0, hue: 20 },
  { name: "Crit Potion", cat: "Crit", desc: `Boost "Critical Hit" by 5% for 24 hours.`, price: 5.0, hue: 300 },
  { name: "Speed Potion", cat: "Speed", desc: `Boost "Speed" by 5% for 24 hours.`, price: 5.0, hue: 200 },
  { name: "Protection Potion", cat: "Protection", desc: `Other players cannot attack you for 24 hours.`, price: 19.0, hue: 220 },
  { name: "Focus Potion", cat: "Focus", desc: `Grant 1 charge to use an attack on ANY player.`, price: 8.0, hue: 260 },
  { name: "Impenetrable Potion", cat: "Impenetrable", desc: `Boost "Defense" by +200.`, price: 15.0, hue: 190 },
  { name: "Rage Potion", cat: "Rage", desc: `Boost "Critical Hit" by 10% for 24 hours.`, price: 12.0, hue: 10 },
  { name: "Raid Potion", cat: "Raid", desc: `Grant 3 additional attacks.`, price: 10.0, hue: 40 },
  { name: "Overload Potion", cat: "Overload", desc: `Double claim rewards for the next claim.`, price: 14.0, hue: 90 },
  { name: "Rogue Potion", cat: "Rogue", desc: `Steal an extra 25% on your next attack.`, price: 11.0, hue: 280 },
  { name: "Fury Potion", cat: "Fury", desc: `Boost "Attack" by 25% for 12 hours.`, price: 13.0, hue: 350 },
];

export default function ConsumablesPage({ params }: { params: Promise<{ user: string }> }) {
  const [user, setUser] = useState<string>("");
  useEffect(() => {
    params.then((p) => setUser(p.user));
  }, [params]);

  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const rows = useMemo(() => {
    if (!user) return [];
    const rand = mulberry32(seedFromString(`${user}-potions`));
    return POTIONS.map((p) => ({
      ...p,
      qty: Math.floor(rand() * 320) + 8,
      active: rand() > 0.7 ? Math.floor(rand() * 5) + 1 : 0,
    }));
  }, [user]);

  const filtered = rows.filter((r) => (cat === "All" ? true : r.cat === cat));

  if (!user) return null;

  return (
    <InventoryShell user={user} active="consumables" titleWord="Potions">
      <FilterTabs
        tabs={CATEGORIES as unknown as string[]}
        active={cat}
        onChange={(v) => setCat(v as typeof cat)}
        rightSlot={
          <Link href="/market/consumables" className="px-3 py-1.5 text-xs font-semibold border border-purple-500 text-purple-400 rounded-md">
            Check Market
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.name + p.cat} className="border-t border-border/40 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border border-border/60 shrink-0"
                      style={{ background: `radial-gradient(circle at 40% 30%, oklch(0.75 0.22 ${p.hue}), oklch(0.2 0.05 260))` }}
                    />
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground max-w-md">{p.desc}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {p.active > 0 ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <span className="font-mono">{p.active}</span>
                      <span aria-hidden>⏱</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-lg">{p.qty}</td>
                <td className="px-4 py-3 text-right">
                  <div className="font-mono">{fmt(p.price, 3)} HIVE</div>
                  <div className="text-[10px] text-muted-foreground">QTY: 1</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InventoryShell>
  );
}
