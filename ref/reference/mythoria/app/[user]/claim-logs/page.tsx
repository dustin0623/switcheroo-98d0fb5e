'use client';

import { useEffect, useState } from "react";
import {
  LogsPage, RecordsBox, LogsTable, Dot,
  seedFromString, mulberry32, timeAgo, fmt,
} from "@/components/logs";

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export default function ClaimLogsPage({ params }: { params: Promise<{ user: string }> }) {
  const [user, setUser] = useState<string>("");
  useEffect(() => { params.then((p) => setUser(p.user)); }, [params]);

  if (!user) return null;

  const rand = mulberry32(seedFromString(`${user}-claim`));
  let minutes = 20;
  const records = Array.from({ length: 100 }, () => {
    const amount = +(rand() * 300 + 200).toFixed(3);
    const t = minutes;
    minutes += Math.floor(rand() * 300) + 200;
    return { amount, minutes: t };
  });

  const total = records.reduce((s, r) => s + r.amount, 0);
  const byDay = new Map<number, { claims: number; scrap: number }>();
  for (const r of records) {
    const day = Math.floor(r.minutes / (60 * 24));
    const cur = byDay.get(day) ?? { claims: 0, scrap: 0 };
    cur.claims += 1; cur.scrap += r.amount;
    byDay.set(day, cur);
  }
  const days = Array.from(byDay.entries()).slice(0, 5);
  const today = new Date();
  function dayLabel(offset: number) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  const rows = records.map((r) => {
    const d = new Date(today.getTime() - r.minutes * 60000);
    return {
      action: <span className="inline-flex items-center gap-2"><Dot tone="success" /><span className="font-semibold">Claim</span></span>,
      rel: <span className="text-muted-foreground">{timeAgo(r.minutes)}</span>,
      abs: <span className="text-muted-foreground">{d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>,
      empty: null,
      amount: <span className="font-mono text-primary">+{fmt(r.amount, 3)} $AETHER</span>,
    };
  });

  return (
    <LogsPage title={`${cap(user)}'s Claim Logs`}>
      <div className="bracket-frame">
        <div className="flex items-baseline gap-2">
          <span className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Claimed $AETHER</span>
          <span className="text-xs text-muted-foreground">(past 100 claims)</span>
        </div>
        <div className="mt-2 text-3xl font-bold tracking-wide">{fmt(total, 3)} <span className="text-primary">$AETHER</span></div>
        <div className="mt-6 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Last days</div>
        <div className="mt-3 space-y-2">
          {days.map(([day, info]) => (
            <div key={day} className="flex items-center justify-between border-t border-border/40 py-2">
              <div>
                <div className="text-sm font-semibold">{dayLabel(day)}</div>
                <div className="text-xs text-muted-foreground">{info.claims} claims</div>
              </div>
              <div className="font-mono text-primary">+ {fmt(info.scrap, 3)} $AETHER</div>
            </div>
          ))}
        </div>
      </div>
      <RecordsBox title="Latest 100 Records">
        <LogsTable
          columns={[
            { key: "action", label: "Action" },
            { key: "rel", label: "When" },
            { key: "abs", label: "Timestamp" },
            { key: "empty", label: "" },
            { key: "amount", label: "Amount", align: "right" },
          ]}
          rows={rows}
        />
      </RecordsBox>
    </LogsPage>
  );
}
