import { createFileRoute } from "@tanstack/react-router";
import {
  LogsPage,
  RecordsBox,
  LogsTable,
  Pill,
  Dot,
  seedFromString,
  mulberry32,
  pick,
  timeAgo,
  fmt,
} from "@/components/logs";

const RARITIES = [
  { name: "Common", tone: "muted" as const, price: [0.03, 0.15] as const },
  { name: "Uncommon", tone: "success" as const, price: [0.08, 0.9] as const },
  { name: "Rare", tone: "info" as const, price: [0.4, 1.2] as const },
  { name: "Epic", tone: "warning" as const, price: [1.0, 2.5] as const },
  { name: "Legendary", tone: "danger" as const, price: [2.0, 5.0] as const },
];

const SELLERS = [
  "lynliss6", "ig1-faithhh", "ig1-keziah", "sana-japan", "astaroth0828",
  "cents2", "chaeyoungvsyixn", "hanudummy07", "dvpm08", "rhiaji", "mirafun",
  "bengbenggg", "c0ff33a", "kipo1", "donchate",
];

function generateRows(count: number, seedStr: string) {
  const rand = mulberry32(seedFromString(seedStr));
  const rows = [];
  let minutes = 5;
  for (let i = 0; i < count; i++) {
    const r = pick(rand, RARITIES);
    const qty = +(rand() * 4 + 0.1).toFixed(2);
    const price = +(r.price[0] + rand() * (r.price[1] - r.price[0])).toFixed(3);
    const seller = pick(rand, SELLERS);
    let buyer = pick(rand, SELLERS);
    while (buyer === seller) buyer = pick(rand, SELLERS);
    const action = rand() > 0.4 ? "Purchased item" : "Listed item";
    rows.push({
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
          <div className="font-semibold">{r.name} Artifacts</div>
        </div>
      ),
      qty: <span className="font-mono">{qty.toFixed(2)}</span>,
      action: (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Dot tone={action === "Purchased item" ? "success" : "warning"} />
          {action}
        </span>
      ),
      seller: <span className="text-primary">{seller}</span>,
      buyer:
        action === "Purchased item" ? (
          <span className="text-primary">{buyer}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      time: <span className="text-muted-foreground">{timeAgo(minutes)}</span>,
      price: (
        <span className="font-mono">{fmt(price, 3)} HIVE</span>
      ),
    });
    minutes += Math.floor(rand() * 180) + 20;
  }
  return rows;
}

export const Route = createFileRoute("/market_logs")({
  head: () => ({
    meta: [
      { title: "Market Logs — Mythoria" },
      { name: "description", content: "Latest 200 marketplace transactions across Mythoria." },
      { property: "og:title", content: "Market Logs — Mythoria" },
      { property: "og:description", content: "Latest 200 marketplace transactions across Mythoria." },
    ],
  }),
  component: MarketLogsPage,
});

function MarketLogsPage() {
  const rows = generateRows(80, "global-market");
  return (
    <LogsPage
      title="Market Logs"
      headerRight={
        <div className="flex gap-2">
          <button className="px-4 py-2 text-xs font-semibold tracking-widest border border-border rounded-md text-muted-foreground hover:text-foreground">
            Previous
          </button>
          <button className="px-4 py-2 text-xs font-semibold tracking-widest border border-primary text-primary rounded-md">
            Next
          </button>
        </div>
      }
    >
      <RecordsBox title="Records 1 - 200">
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
      </RecordsBox>
    </LogsPage>
  );
}
