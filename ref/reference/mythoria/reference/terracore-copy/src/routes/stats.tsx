import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/site-layout";
import type { StatsResponse } from "@/mock/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — Mythoria" },
      { name: "description", content: "Live in-game economy stats: players, $MGOLD flows, raids, and market activity." },
      { property: "og:title", content: "Stats — Mythoria" },
      { property: "og:description", content: "Live in-game economy stats for Mythoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

function fmt(n: number, d = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function StatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  useEffect(() => {
    fetch("/api/mock/stats")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data)
    return (
      <PageShell>
        <div className="container-tc py-24 text-center text-muted-foreground">Loading stats…</div>
      </PageShell>
    );

  const t = data.totals;

  return (
    <PageShell>
      <div className="container-tc py-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-wider mb-8">Stats</h1>

        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="Players" value={fmt(t.players)} icon="👥" />
          <Kpi label="Liquid" value={`${fmt(t.liquidScrap)} $MGOLD`} sub={`${fmt(t.liquidFlux)} ESSENCE`} icon="◆" />
          <Kpi label="Staked $MGOLD" value={fmt(t.stakedScrap)} icon="🔒" />
          <Kpi label="Burned" value={`${fmt(t.burnedScrap)} $MGOLD`} sub={`${fmt(t.burnedFlux)} ESSENCE`} icon="🔥" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <ChartCard title="Players">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.series.players}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" dataKey="value" name="New Players" fill="hsl(var(--primary))" />
                <Line yAxisId="r" type="monotone" dataKey="cumulative" name="Total Players" stroke="hsl(var(--muted-foreground))" dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Salvaged Items">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.series.salvagedItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="items" name="Item Count" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="generatedFlux" name="Generated ESSENCE" fill="#ec4899" />
                <Bar dataKey="burntFlux" name="Burnt ESSENCE" fill="#38bdf8" />
                <Bar dataKey="spentFlux" name="Spent ESSENCE" fill="#a78bfa" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Daily Raids / Quests">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.series.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="battles" name="Daily Raids" fill="#ef4444" />
                <Bar dataKey="quests" name="Daily Quests" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Boss Raids">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.series.bossBattles}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="losses" name="Boss Losses" fill="#f59e0b" />
                <Bar dataKey="wins" name="Boss Wins" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="$MGOLD Staked (cumulative)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.series.scrapStaked}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tipStyle} />
                <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="$MGOLD Burned (cumulative)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.series.scrapBurned}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tipStyle} />
                <Line type="monotone" dataKey="cumulative" stroke="#f59e0b" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Market Volume (HIVE)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.series.marketVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tipStyle} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Market Transactions">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.series.marketTransactions}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tipStyle} />
                <Bar dataKey="value" fill="#a78bfa" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </PageShell>
  );
}

const tipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  fontSize: 11,
};

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: string }) {
  return (
    <div className="bracket-frame p-5 flex items-start justify-between gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tracking-wider">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      {icon && <div className="text-3xl opacity-60">{icon}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bracket-frame p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">{title}</div>
      {children}
    </div>
  );
}
