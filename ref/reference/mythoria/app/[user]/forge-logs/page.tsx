'use client';

import { useEffect, useState } from "react";
import {
  LogsPage, RecordsBox, LogsTable, Pill,
  seedFromString, mulberry32, pick, timeAgo, fmt,
} from "@/components/logs";

const CATS = ["weapon", "armor", "avatar", "mount", "artifact"] as const;
const RARITIES = [
  { name: "common", tone: "muted" as const },
  { name: "uncommon", tone: "success" as const },
  { name: "rare", tone: "info" as const },
  { name: "epic", tone: "warning" as const },
  { name: "legendary", tone: "danger" as const },
];

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export default function ForgeLogsPage({ params }: { params: Promise<{ user: string }> }) {
  const [user, setUser] = useState<string>("");
  useEffect(() => { params.then((p) => setUser(p.user)); }, [params]);

  if (!user) return null;

  const rand = mulberry32(seedFromString(`${user}-forge`));
  let minutes = 60 * 24 * 11;
  const rows = Array.from({ length: 44 }, (_, i) => {
    const cat = pick(rand, CATS);
    const rarity = pick(rand, RARITIES);
    const fromLvl = Math.floor(rand() * 11) + 1;
    const toLvl = fromLvl + 1;
    const cost = +(rand() * 100 + 5).toFixed(3);
    const id = 14326 - i * 3;
    const t = minutes;
    minutes += Math.floor(rand() * 60 * 24 * 3) + 60 * 6;
    return {
      item: (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-border/60 shrink-0" style={{ background: `linear-gradient(135deg, oklch(0.75 0.16 ${(i * 53) % 360}) 0%, oklch(0.3 0.08 260) 100%)` }} />
          <div className="text-xs text-muted-foreground">#{id}</div>
        </div>
      ),
      user: <span className="text-primary">{user}</span>,
      when: <span className="text-muted-foreground">{timeAgo(t)}</span>,
      cat: <Pill tone="muted">{cat}</Pill>,
      rarity: <Pill tone={rarity.tone}>{rarity.name}</Pill>,
      level: <span className="font-mono">Lvl <span className="text-foreground">{fromLvl}</span><span className="text-muted-foreground mx-2">→</span><span className="text-primary">{toLvl}</span></span>,
      cost: <span className="font-mono text-primary">{fmt(cost, 3)} ⛽</span>,
    };
  });

  return (
    <LogsPage title={`${cap(user)}'s Upgrade Logs`}>
      <RecordsBox title="Latest 44 Records">
        <LogsTable
          columns={[
            { key: "item", label: "Item" },
            { key: "user", label: "Owner" },
            { key: "when", label: "When" },
            { key: "cat", label: "Category" },
            { key: "rarity", label: "Rarity" },
            { key: "level", label: "Level" },
            { key: "cost", label: "Cost", align: "right" },
          ]}
          rows={rows}
        />
      </RecordsBox>
    </LogsPage>
  );
}
