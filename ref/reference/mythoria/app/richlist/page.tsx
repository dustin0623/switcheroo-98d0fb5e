'use client';

import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/site-layout";
import type { RichlistEntry } from "@/features/types";

type Sort = "total" | "staked" | "liquid" | "stash" | "essence";
const SORTS: { v: Sort; l: string }[] = [
  { v: "total", l: "Total $AETHER" },
  { v: "staked", l: "Staked" },
  { v: "liquid", l: "Liquid" },
  { v: "stash", l: "Stash" },
  { v: "essence", l: "ESSENCE" },
];

const fmt = (n: number, d = 3) =>
  n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tracking-wider">{value}</div>
    </div>
  );
}

export default function RichlistPage() {
  const [sort, setSort] = useState<Sort>("total");
  const [rows, setRows] = useState<RichlistEntry[]>([]);

  useEffect(() => {
    fetch(`/api/mock/richlist?sort=${sort}`)
      .then((r) => r.json())
      .then(setRows);
  }, [sort]);

  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <PageShell>
      <div className="container-tc py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wider">Richlist</h1>
          <div className="inline-flex rounded-md border border-border overflow-hidden text-[11px] font-semibold tracking-widest">
            {SORTS.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => setSort(s.v)}
                className={`px-3 py-1.5 transition-colors ${
                  sort === s.v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          In-game $AETHER holdings only — computed from local hero data.
        </p>

        <div className="bracket-frame p-5 mb-6 flex flex-wrap gap-6">
          <Stat label="Heroes tracked" value={rows.length.toString()} />
          <Stat label="Combined $AETHER" value={fmt(total, 0)} />
        </div>

        <div className="bracket-frame overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-muted-foreground uppercase tracking-widest">
              <tr>
                <th className="px-3 py-3">Rank</th>
                <th className="px-3 py-3">Hero</th>
                <th className="px-3 py-3 text-right">Staked</th>
                <th className="px-3 py-3 text-right">Liquid</th>
                <th className="px-3 py-3 text-right">Stash</th>
                <th className="px-3 py-3 text-right">ESSENCE</th>
                <th className="px-3 py-3 text-right">Total $AETHER</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.username} className="border-t border-border/50 hover:bg-accent/20">
                  <td className="px-3 py-2 font-semibold text-primary">#{r.rank}</td>
                  <td className="px-3 py-2 font-semibold">{r.username}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.staked)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.liquid)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.stash)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.essence)}</td>
                  <td className="px-3 py-2 text-right text-primary font-semibold">{fmt(r.total)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={7}>
                    Loading richlist…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
