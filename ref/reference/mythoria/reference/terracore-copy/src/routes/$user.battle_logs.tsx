import { createFileRoute } from "@tanstack/react-router";
import {
  LogsPage,
  RecordsBox,
  LogsTable,
  Dot,
  seedFromString,
  mulberry32,
  pick,
  timeAgo,
  fmt,
} from "@/components/logs";

const TARGETS = [
  "lynliss7", "donchate", "lynliss1", "lynliss2", "lynliss4", "lynliss6",
  "mmlzl", "annihill", "bibgeonosis433", "dnrxgwp0629", "katysavage",
  "baldric797", "admiralendor455", "exchange.dao", "goforbroke", "kipo1",
  "darthsolo477", "captainbespin949", "counttatooine557",
];

export const Route = createFileRoute("/$user/battle_logs")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.user}'s Raid Logs — Mythoria` },
      { name: "description", content: `PvP battle history for ${params.user}.` },
      { property: "og:title", content: `${params.user}'s Raid Logs — Mythoria` },
      { property: "og:description", content: `PvP battle history for ${params.user}.` },
    ],
  }),
  component: BattleLogsPage,
});

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function BattleLogsPage() {
  const { user } = Route.useParams();
  const rand = mulberry32(seedFromString(`${user}-battle`));

  // Mock generator shaped like GET /battle_logs/{user}:
  // each record has username (attacker) + attacked (defender), scrap, roll,
  // and optional { dodged, reason } discriminators. See
  // docs/api/battle_logs.schema.json.
  type Kind = "hit" | "dodge" | "cooldown";
  type Rec = {
    username: string;
    attacked: string;
    scrap: number;
    roll: number;
    dodged?: boolean;
    reason?: "dodge" | "cooldown";
    minutes: number;
  };

  let minutes = 240;
  const records: Rec[] = Array.from({ length: 200 }, () => {
    const other = pick(rand, TARGETS);
    // 60% outgoing (viewer attacks), 40% incoming (viewer defends)
    const outgoing = rand() < 0.6;
    const r = rand();
    const kind: Kind = r < 0.12 ? "cooldown" : r < 0.3 ? "dodge" : "hit";
    const roll = kind === "cooldown" ? 0 : +(rand() * 100).toFixed(2);
    const scrap = kind === "hit" ? +(rand() * 450 + 5).toFixed(3) : 0;
    const t = minutes;
    minutes += Math.floor(rand() * 400) + 120;
    return {
      username: outgoing ? user : other,
      attacked: outgoing ? other : user,
      scrap,
      roll,
      dodged: kind === "hit" ? undefined : kind === "dodge",
      reason: kind === "hit" ? undefined : kind,
      minutes: t,
    };
  });

  const kindOf = (r: Rec): Kind =>
    r.reason === "cooldown" ? "cooldown" : r.dodged ? "dodge" : "hit";

  const wins = records.filter((r) => r.username === user && kindOf(r) === "hit");
  const losses = records.filter((r) => r.attacked === user && kindOf(r) === "hit");
  const totalWin = wins.reduce((s, r) => s + r.scrap, 0);
  const totalLost = losses.reduce((s, r) => s + r.scrap, 0);
  const total = totalWin + totalLost || 1;
  const winPct = (totalWin / total) * 100;

  const topTargets = groupTop(
    wins.map((r) => ({ target: r.attacked, amount: r.scrap })),
    "target",
  );
  const topRobbers = groupTop(
    losses.map((r) => ({ target: r.username, amount: r.scrap })),
    "target",
  );

  const rows = records.map((r) => {
    const k = kindOf(r);
    const outgoing = r.username === user;
    const other = outgoing ? r.attacked : r.username;
    const label =
      k === "cooldown"
        ? "Target was on cooldown"
        : outgoing
        ? k === "hit"
          ? "You attacked"
          : "You missed your target"
        : k === "hit"
        ? "You were robbed"
        : "You dodged an attack";
    const tone: "success" | "danger" | "warning" =
      k === "cooldown"
        ? "warning"
        : outgoing
        ? k === "hit"
          ? "success"
          : "warning"
        : k === "hit"
        ? "danger"
        : "success";
    return {
      action: (
        <span className="inline-flex items-center gap-2">
          <Dot tone={tone} />
          <span className="font-semibold">{label}</span>
        </span>
      ),
      target: <span>{other}</span>,
      time: <span className="text-muted-foreground">{timeAgo(r.minutes)}</span>,
      roll:
        k === "cooldown" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="text-muted-foreground">
            Roll: <span className="text-foreground">{r.roll.toFixed(2)}%</span>
          </span>
        ),
      amount:
        k !== "hit" ? (
          <span className="font-mono text-muted-foreground">+0 $MGOLD</span>
        ) : outgoing ? (
          <span className="font-mono text-primary">+{fmt(r.scrap, 5)} $MGOLD</span>
        ) : (
          <span className="font-mono text-destructive">-{fmt(r.scrap, 5)} $MGOLD</span>
        ),
    };
  });



  return (
    <LogsPage title={`${cap(user)}'s Raid Logs`}>
      <div className="grid md:grid-cols-2 gap-4">
          <div className="bracket-frame">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Win $MGOLD
              </div>
              <div className="text-xs text-muted-foreground">
                (past 200 battles)
              </div>
            </div>
            <div className="text-2xl font-bold text-primary">
              {winPct.toFixed(2)}%
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold tracking-wide">
            {fmt(totalWin, 3)} <span className="text-primary">$MGOLD</span>
          </div>
          <div className="mt-6 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Top targets
          </div>
          <div className="mt-3 space-y-2">
            {topTargets.map(([name, info]) => (
              <div
                key={name}
                className="flex items-center justify-between border-t border-border/40 py-2"
              >
                <div>
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-muted-foreground">
                    {info.count} attacks
                  </div>
                </div>
                <div className="font-mono text-primary">+ {fmt(info.total, 3)} $MGOLD</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bracket-frame">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Lost $MGOLD
              </div>
              <div className="text-xs text-muted-foreground">
                (past 200 battles)
              </div>
            </div>
            <div className="text-2xl font-bold text-destructive">
              {(100 - winPct).toFixed(2)}%
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold tracking-wide">
            {fmt(totalLost, 3)} <span className="text-destructive">$MGOLD</span>
          </div>
          <div className="mt-6 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Top robbers
          </div>
          <div className="mt-3 space-y-2">
            {topRobbers.map(([name, info]) => (
              <div
                key={name}
                className="flex items-center justify-between border-t border-border/40 py-2"
              >
                <div>
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-muted-foreground">
                    {info.count} attacks
                  </div>
                </div>
                <div className="font-mono text-destructive">- {fmt(info.total, 3)} $MGOLD</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RecordsBox title="Latest 200 Records">
        <LogsTable
          columns={[
            { key: "action", label: "Action" },
            { key: "target", label: "Target" },
            { key: "time", label: "When" },
            { key: "roll", label: "Roll" },
            { key: "amount", label: "$MGOLD", align: "right" },
          ]}
          rows={rows}
        />
      </RecordsBox>
    </LogsPage>
  );
}

function groupTop(
  records: { target: string; amount: number }[],
  _key: "target",
): [string, { count: number; total: number }][] {
  const map = new Map<string, { count: number; total: number }>();
  for (const r of records) {
    const cur = map.get(r.target) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += r.amount;
    map.set(r.target, cur);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3);
}
