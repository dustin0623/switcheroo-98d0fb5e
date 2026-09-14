import { createFileRoute } from "@tanstack/react-router";
import {
  LogsPage,
  StatCard,
  RecordsBox,
  Pill,
  seedFromString,
  mulberry32,
  pick,
  timeAgo,
} from "@/components/logs";

const BOSSES = ["Solisar", "Neptolith", "Arborealis", "Celestia", "Oceana"];
const DROPS = [
  { label: "Common Artifacts", tone: "muted" as const },
  { label: "Uncommon Artifacts", tone: "success" as const },
  { label: "Rare Artifacts", tone: "info" as const },
  { label: "Attack Pot", tone: "success" as const },
  { label: "Attack Pot", tone: "warning" as const },
  { label: "Chest", tone: "danger" as const },
];

export const Route = createFileRoute("/$user/boss_logs")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.user}'s Boss Logs — Mythoria` },
      { name: "description", content: `Boss encounter history for ${params.user}.` },
      { property: "og:title", content: `${params.user}'s Boss Logs — Mythoria` },
      { property: "og:description", content: `Boss encounter history for ${params.user}.` },
    ],
  }),
  component: BossLogsPage,
});

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function BossLogsPage() {
  const { user } = Route.useParams();
  const rand = mulberry32(seedFromString(`${user}-boss`));

  const luck = +(rand() * 40 + 30).toFixed(2);
  let minutes = 180;
  const records = Array.from({ length: 50 }, () => {
    const boss = pick(rand, BOSSES);
    const roll = +(rand() * 100).toFixed(2);
    const win = roll > 45;
    const drop = pick(rand, DROPS);
    const t = minutes;
    minutes += Math.floor(rand() * 500) + 240;
    return { boss, roll, win, drop, minutes: t };
  });

  const wins = records.filter((r) => r.win).length;
  const crates = records.filter((r) => r.drop.label === "Chest").length;

  return (
    <LogsPage title={`${cap(user)}'s Boss Logs`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Fights" value={records.length} />
        <StatCard label="Wins" value={wins} accent="text-primary" />
        <StatCard label="Drops" value={records.length} accent="text-yellow-400" />
        <StatCard label="Chests" value={crates} accent="text-destructive" />
      </div>

      <RecordsBox title="Latest 50 Records">
        <ul className="divide-y divide-border/40">
          {records.map((r, i) => (
            <li
              key={i}
              className={`flex items-center gap-4 px-4 py-3 ${
                r.win ? "bg-primary/5" : ""
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                  r.win
                    ? "bg-primary/20 text-primary"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                {r.win ? "✓" : "✕"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{r.boss}</div>
                <div className="text-xs text-muted-foreground">
                  VS · {timeAgo(r.minutes)}
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                  Luck
                </div>
                <div className="text-sm font-mono">{luck.toFixed(2)}%</div>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                  Roll
                </div>
                <div className="text-sm font-mono">{r.roll.toFixed(2)}%</div>
              </div>
              <div className="w-32 text-right">
                <Pill tone={r.drop.tone}>{r.drop.label}</Pill>
              </div>
            </li>
          ))}
        </ul>
      </RecordsBox>
    </LogsPage>
  );
}
