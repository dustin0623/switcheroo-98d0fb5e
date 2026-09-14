'use client';

import { useEffect, useState } from "react";
import {
  LogsPage, RecordsBox, LogsTable, Dot,
  seedFromString, mulberry32, pick, timeAgo, fmt,
} from "@/components/logs";

const TARGETS = [
  "lynliss7", "donchate", "lynliss1", "lynliss2", "lynliss4", "lynliss6",
  "mmlzl", "annihill", "bibgeonosis433", "dnrxgwp0629", "katysavage",
  "baldric797", "admiralendor455", "exchange.dao", "goforbroke", "kipo1",
];

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function groupTop(records: { target: string; amount: number }[]): [string, { count: number; total: number }][] {
  const map = new Map<string, { count: number; total: number }>();
  for (const r of records) {
    const cur = map.get(r.target) ?? { count: 0, total: 0 };
    cur.count += 1; cur.total += r.amount;
    map.set(r.target, cur);
  }
  return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 3);
}

export default function BattleLogsPage({ params }: { params: Promise<{ user: string }> }) {
  const [user, setUser] = useState<string>("");
  useEffect(() => { params.then((p) => setUser(p.user)); }, [params]);

  if (!user) return null;

  const rand = mulberry32(seedFromString(`${user}-battle`));
  type Kind = "hit" | "dodge" | "cooldown";
  type Rec = { username: string; attacked: string; scrap: number; roll: number; dodged?: boolean; reason?: "dodge" | "cooldown"; minutes: number };

  let minutes = 240;
  const records: Rec[] = Array.from({ length: 200 }, () => {
    const other = pick(rand, TARGETS);
    const outgoing = rand() < 0.6;
    const r = rand();
    const kind: Kind = r < 0.12 ? "cooldown" : r < 0.3 ? "dodge" : "hit";
    const roll = kind === "cooldown" ? 0 : +(rand() * 100).toFixed(2);
    const scrap = kind === "hit" ? +(rand() * 450 + 5).toFixed(3) : 0;
    const t = minutes;
    minutes += Math.floor(rand() * 400) + 120;
    return { username: outgoing ? user : other, attacked: outgoing ? other : user, scrap, roll, dodged: kind === "hit" ? undefined : kind === "dodge", reason: kind === "hit" ? undefined : kind, minutes: t };
  });

  const kindOf = (r: Rec): Kind => r.reason === "cooldown" ? "cooldown" : r.dodged ? "dodge" : "hit";
  const wins = records.filter((r) => r.username === user && kindOf(r) === "hit");
  const losses = records.filter((r) => r.attacked === user && kindOf(r) === "hit");
  const totalWin = wins.reduce((s, r) => s + r.scrap, 0);
  const totalLost = losses.reduce((s, r) => s + r.scrap, 0);
  const winPct = (totalWin / (totalWin + totalLost || 1)) * 100;
  const topTargets = groupTop(wins.map((r) => ({ target: r.attacked, amount: r.scrap })));
  const topRobbers = groupTop(losses.map((r) => ({ target: r.username, amount: r.scrap })));

  const rows = records.map((r) => {
    const k = kindOf(r);
    const outgoing = r.username === user;
    const other = outgoing ? r.attacked : r.username;
    const label = k === "cooldown" ? "Target was on cooldown" : outgoing ? k === "hit" ? "You attacked" : "You missed your target" : k === "hit" ? "You were robbed" : "You dodged an attack";
    const tone: "success" | "danger" | "warning" = k === "cooldown" ? "warning" : outgoing ? k === "hit" ? "success" : "warning" : k === "hit" ? "danger" : "success";
    return {
      action: <span className="inline-flex items-center gap-2"><Dot tone={tone} /><span className="font-semibold">{label}</span></span>,
      target: <span>{other}</span>,
      time: <span className="text-muted-foreground">{timeAgo(r.minutes)}</span>,
      roll: k === "cooldown" ? <span className="text-muted-foreground">—</span> : <span className="text-muted-foreground">Roll: <span className="text-foreground">{r.roll.toFixed(2)}%</span></span>,
      amount: k !== "hit" ? <span className="font-mono text-muted-foreground">+0 $AETHER</span> : outgoing ? <span className="font-mono text-primary">+{fmt(r.scrap, 5)} $AETHER</span> : <span className="font-mono text-destructive">-{fmt(r.scrap, 5)} $AETHER</span>,
    };
  });

  return (
    <LogsPage title={`${cap(user)}'s Raid Logs`}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bracket-frame">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Win $AETHER</div>
              <div className="text-xs text-muted-foreground">(past 200 battles)</div>
            </div>
            <div className="text-2xl font-bold text-primary">{winPct.toFixed(2)}%</div>
          </div>
          <div className="mt-2 text-3xl font-bold tracking-wide">{fmt(totalWin, 3)} <span className="text-primary">$AETHER</span></div>
          <div className="mt-6 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Top targets</div>
          <div className="mt-3 space-y-2">
            {topTargets.map(([name, info]) => (
              <div key={name} className="flex items-center justify-between border-t border-border/40 py-2">
                <div><div className="text-sm font-semibold">{name}</div><div className="text-xs text-muted-foreground">{info.count} attacks</div></div>
                <div className="font-mono text-primary">+ {fmt(info.total, 3)} $AETHER</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bracket-frame">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Lost $AETHER</div>
              <div className="text-xs text-muted-foreground">(past 200 battles)</div>
            </div>
            <div className="text-2xl font-bold text-destructive">{(100 - winPct).toFixed(2)}%</div>
          </div>
          <div className="mt-2 text-3xl font-bold tracking-wide">{fmt(totalLost, 3)} <span className="text-destructive">$AETHER</span></div>
          <div className="mt-6 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Top robbers</div>
          <div className="mt-3 space-y-2">
            {topRobbers.map(([name, info]) => (
              <div key={name} className="flex items-center justify-between border-t border-border/40 py-2">
                <div><div className="text-sm font-semibold">{name}</div><div className="text-xs text-muted-foreground">{info.count} attacks</div></div>
                <div className="font-mono text-destructive">- {fmt(info.total, 3)} $AETHER</div>
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
            { key: "amount", label: "$AETHER", align: "right" },
          ]}
          rows={rows}
        />
      </RecordsBox>
    </LogsPage>
  );
}
