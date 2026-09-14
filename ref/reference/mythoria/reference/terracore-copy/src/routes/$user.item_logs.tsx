import { createFileRoute } from "@tanstack/react-router";
import {
  LogsPage,
  RecordsBox,
  LogsTable,
  Pill,
  seedFromString,
  mulberry32,
  pick,
  timeAgo,
} from "@/components/logs";

const CATS = [
  { name: "weapon", stats: ["Attack", "Crit"] },
  { name: "armor", stats: ["Defense", "Attack", "Gathering", "Luck"] },
  { name: "avatar", stats: ["Attack", "Speed", "Defense", "Gathering"] },
  { name: "ship", stats: ["Attack", "Luck", "Defense"] },
  { name: "special", stats: ["Speed", "Luck"] },
] as const;

const RARITIES = [
  { name: "common", tone: "muted" as const },
  { name: "uncommon", tone: "success" as const },
  { name: "rare", tone: "info" as const },
  { name: "epic", tone: "warning" as const },
  { name: "legendary", tone: "danger" as const },
];

export const Route = createFileRoute("/$user/item_logs")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.user}'s Item Logs — Mythoria` },
      { name: "description", content: `Item drop history for ${params.user}.` },
      { property: "og:title", content: `${params.user}'s Item Logs — Mythoria` },
      { property: "og:description", content: `Item drop history for ${params.user}.` },
    ],
  }),
  component: ItemLogsPage,
});

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ItemLogsPage() {
  const { user } = Route.useParams();
  const rand = mulberry32(seedFromString(`${user}-items`));

  let minutes = 120;
  let itemId = 14841;
  const rows = Array.from({ length: 100 }, (_, i) => {
    const cat = pick(rand, CATS);
    const rarity = pick(rand, RARITIES);
    const stats = cat.stats
      .filter(() => rand() > 0.4)
      .slice(0, 2)
      .map((s) => `${s}: +${(rand() * 15 + 0.5).toFixed(4)}`);
    if (stats.length === 0) stats.push(`${cat.stats[0]}: +${(rand() * 10).toFixed(4)}`);
    const id = itemId--;
    const t = minutes;
    minutes += Math.floor(rand() * 400) + 120;
    return {
      item: (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded border border-border/60 shrink-0"
            style={{
              background: `linear-gradient(135deg, oklch(0.7 0.16 ${
                (i * 37) % 360
              }) 0%, oklch(0.3 0.08 260) 100%)`,
            }}
          />
          <div>
            <div className="text-xs text-muted-foreground">#{id}</div>
          </div>
        </div>
      ),
      user: <span className="text-primary">{user}</span>,
      when: <span className="text-muted-foreground">{timeAgo(t)}</span>,
      cat: <Pill tone="muted">{cat.name}</Pill>,
      rarity: <Pill tone={rarity.tone}>{rarity.name}</Pill>,
      stats: (
        <div className="text-xs font-mono text-foreground/90 whitespace-pre-line">
          {stats.join("\n")}
        </div>
      ),
    };
  });

  return (
    <LogsPage title={`${cap(user)}'s Item Logs`}>
      <RecordsBox title="Latest 100 Records">
        <LogsTable
          columns={[
            { key: "item", label: "Item" },
            { key: "user", label: "Owner" },
            { key: "when", label: "When" },
            { key: "cat", label: "Category" },
            { key: "rarity", label: "Rarity" },
            { key: "stats", label: "Stats", align: "right" },
          ]}
          rows={rows}
        />
      </RecordsBox>
    </LogsPage>
  );
}
