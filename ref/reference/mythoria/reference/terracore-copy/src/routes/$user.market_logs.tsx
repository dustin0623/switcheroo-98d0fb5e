import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LogsPage,
  RecordsBox,
  LogsTable,
  Dot,
  timeAgo,
  fmt,
} from "@/components/logs";
import { useGameStore } from "@/stores/game-store";
import type { UserMarketLogEntry } from "@/mock/types";

const CATEGORIES = [
  { label: "Items", to: "/market" as const },
  { label: "Chests", to: "/market/crates" as const },
  { label: "Artifacts", to: "/market/relics" as const },
  { label: "Consumables", to: "/market/consumables" as const },
];

export const Route = createFileRoute("/$user/market_logs")({
  head: ({ params }) => {
    const u = params.user;
    const title = `${u}'s Market Logs — Mythoria`;
    return {
      meta: [
        { title },
        { name: "description", content: `Marketplace activity for ${u} on Mythoria.` },
        { property: "og:title", content: title },
        { property: "og:description", content: `Marketplace activity for ${u} on Mythoria.` },
      ],
    };
  },
  component: UserMarketLogs,
});

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function actionLabel(action: string) {
  if (action === "purchase") return "Purchased item";
  if (action === "transfer") return "Transferred item";
  if (action === "cancel") return "Cancelled listing";
  return action;
}

function actionTone(action: string): "success" | "warning" | "danger" | "muted" {
  if (action === "purchase") return "success";
  if (action === "transfer") return "warning";
  if (action === "cancel") return "danger";
  return "muted";
}

function itemLabel(entry: UserMarketLogEntry) {
  const rarity = entry.rarity ?? (typeof entry.id === "string" ? entry.id.split("_")[0] : null);
  if (entry.action === "purchase" && typeof entry.id === "string" && entry.id.endsWith("_relics")) {
    const r = entry.id.replace("_relics", "");
    return `${capital(r)} Artifacts`;
  }
  return `#${entry.item_number}${rarity ? ` · ${capital(rarity)}` : ""}`;
}

function UserMarketLogs() {
  const { user } = Route.useParams();
  const cached = useGameStore((s) => s.userMarketLogs[user]);
  const fetchUserMarketLogs = useGameStore((s) => s.fetchUserMarketLogs);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    setLoading(true);
    fetchUserMarketLogs(user).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, cached, fetchUserMarketLogs]);

  const entries = cached ?? [];
  const now = Date.now();

  const rows = entries.slice(0, 100).map((entry, i) => {
    const minutes = Math.max(1, Math.floor((now - entry.created) / 60_000));
    const rarity = entry.rarity ?? (typeof entry.id === "string" ? entry.id.split("_")[0] : "common");
    return {
      item: (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded border border-border/60"
            style={{
              background: `linear-gradient(135deg, oklch(0.82 0.16 ${
                (i * 47) % 360
              }) 0%, oklch(0.4 0.1 260) 100%)`,
            }}
          />
          <div>
            <div className="font-semibold">{itemLabel(entry)}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {rarity}
            </div>
          </div>
        </div>
      ),
      qty: <span className="font-mono">{fmt(entry.qty, 2)}</span>,
      action: (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Dot tone={actionTone(entry.action)} />
          {actionLabel(entry.action)}
        </span>
      ),
      seller: entry.seller ? (
        <span className={entry.seller === user ? "text-primary" : ""}>{entry.seller}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
      buyer: entry.buyer ? (
        <span className={entry.buyer === user ? "text-primary" : ""}>{entry.buyer}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
      time: <span className="text-muted-foreground">{timeAgo(minutes)}</span>,
      price:
        entry.price != null && entry.price > 0 ? (
          <span className="font-mono">{fmt(entry.price, 3)} HIVE</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    };
  });

  return (
    <LogsPage
      title={`${capital(user)}'s Market Logs`}
      headerRight={
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="px-3 py-1.5 text-xs font-semibold tracking-widest border border-border rounded-md text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      }
    >
      <RecordsBox title={`Latest ${rows.length} Records`}>
        {loading && !rows.length ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No marketplace activity yet.</div>
        ) : (
          <LogsTable
            columns={[
              { key: "item", label: "Item" },
              { key: "qty", label: "Quantity", align: "right" },
              { key: "action", label: "Action" },
              { key: "seller", label: "Owner / Seller" },
              { key: "buyer", label: "Buyer / Recipient" },
              { key: "time", label: "Timestamp" },
              { key: "price", label: "Price", align: "right" },
            ]}
            rows={rows}
          />
        )}
      </RecordsBox>
    </LogsPage>
  );
}
