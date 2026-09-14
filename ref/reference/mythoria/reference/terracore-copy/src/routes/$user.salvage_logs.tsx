import { createFileRoute } from "@tanstack/react-router";
import {
  LogsPage,
  RecordsBox,
  LogsTable,
  Pill,
  seedFromString,
  mulberry32,
  timeAgo,
  fmt,
} from "@/components/logs";

export const Route = createFileRoute("/$user/salvage_logs")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.user}'s Dismantle Logs — Mythoria` },
      { name: "description", content: `Dismantle history for ${params.user}.` },
      { property: "og:title", content: `${params.user}'s Dismantle Logs — Mythoria` },
      { property: "og:description", content: `Dismantle history for ${params.user}.` },
    ],
  }),
  component: SalvageLogsPage,
});

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SalvageLogsPage() {
  const { user } = Route.useParams();
  const rand = mulberry32(seedFromString(`${user}-salvage`));

  let minutes = 420;
  let itemId = 14841;
  const rows = Array.from({ length: 100 }, () => {
    const id = itemId--;
    const flux = +(rand() * 25 + 1).toFixed(5);
    const t = minutes;
    minutes += Math.floor(rand() * 60 * 12) + 60;
    return {
      item: <span className="font-semibold">Item: #{id}</span>,
      user: <span className="text-primary">{user}</span>,
      action: <Pill tone="danger">SALVAGE</Pill>,
      when: <span className="text-muted-foreground">{timeAgo(t)}</span>,
      flux: (
        <span className="font-mono text-primary">ESSENCE: {fmt(flux, 5)}</span>
      ),
    };
  });

  return (
    <LogsPage title={`${cap(user)}'s Dismantle Logs`}>
      <RecordsBox title="Latest 100 Records">
        <LogsTable
          columns={[
            { key: "item", label: "Item" },
            { key: "user", label: "Owner" },
            { key: "action", label: "Action" },
            { key: "when", label: "When" },
            { key: "flux", label: "Flux", align: "right" },
          ]}
          rows={rows}
        />
      </RecordsBox>
    </LogsPage>
  );
}
