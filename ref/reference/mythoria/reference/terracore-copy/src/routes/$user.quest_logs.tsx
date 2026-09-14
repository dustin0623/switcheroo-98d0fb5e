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

const QUEST_TYPES = [
  { icon: "👁️", tier: "T2", name: "Op: Cold Insertion" },
  { icon: "🔧", tier: "T4", name: "Dismantle: The Colossus Fragments" },
  { icon: "🎲", tier: "T3", name: "Hunt: Sector Z Anomaly" },
  { icon: "⚔️", tier: "T3", name: "Raid: Nexus Station Delta" },
  { icon: "🛡️", tier: "T3", name: "Hold: The Orbital Tether" },
  { icon: "👁️", tier: "T3", name: "Op: The Long Silence" },
  { icon: "⚔️", tier: "T3", name: "Raid: The Iron Fortress" },
  { icon: "🎲", tier: "T2", name: "Hunt: Echo Station Lottery" },
  { icon: "🔧", tier: "T2", name: "Dismantle: Platform Seven-Whiskey" },
];

export const Route = createFileRoute("/$user/quest_logs")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.user}'s Quest Log — Mythoria` },
      { name: "description", content: `Quest completion history for ${params.user}.` },
      { property: "og:title", content: `${params.user}'s Quest Log — Mythoria` },
      { property: "og:description", content: `Quest completion history for ${params.user}.` },
    ],
  }),
  component: QuestLogsPage,
});

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function QuestLogsPage() {
  const { user } = Route.useParams();
  const rand = mulberry32(seedFromString(`${user}-quests`));

  let minutes = 60;
  const records = Array.from({ length: 25 }, () => {
    const q = pick(rand, QUEST_TYPES);
    const completed = rand() > 0.25;
    const t = minutes;
    minutes += Math.floor(rand() * 300) + 120;
    return {
      ...q,
      completed,
      minutes: t,
      xp: completed ? (rand() > 0.5 ? 100 : 50) : 0,
      drops: {
        common: Math.floor(rand() * 3),
        uncommon: Math.floor(rand() * 3),
        rare: Math.floor(rand() * 2),
        epic: rand() > 0.7 ? 1 : 0,
        legendary: rand() > 0.95 ? 1 : 0,
      },
    };
  });

  const completed = records.filter((r) => r.completed);
  const totalXP = completed.reduce((s, r) => s + r.xp, 0);
  const totalDrops = completed.reduce(
    (acc, r) => ({
      common: acc.common + r.drops.common,
      uncommon: acc.uncommon + r.drops.uncommon,
      rare: acc.rare + r.drops.rare,
      epic: acc.epic + r.drops.epic,
      legendary: acc.legendary + r.drops.legendary,
    }),
    { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
  );

  return (
    <LogsPage title={`${cap(user)}'s Quest Log`}>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Completed" value={completed.length} />
        <StatCard label="Total XP" value={totalXP} accent="text-yellow-400" />
        <StatCard label="Legendary" value={totalDrops.legendary} accent="text-destructive" />
        <StatCard label="Epic" value={totalDrops.epic} accent="text-purple-400" />
        <StatCard label="Rare" value={totalDrops.rare} accent="text-blue-400" />
        <StatCard label="Uncommon" value={totalDrops.uncommon} accent="text-primary" />
      </div>
      <StatCard label="Common" value={totalDrops.common} />

      <RecordsBox title="Latest 25 Records">
        <ul className="divide-y divide-border/40">
          {records.map((r, i) => (
            <li
              key={i}
              className={`flex items-center gap-4 px-4 py-3 ${
                r.completed ? "bg-primary/5" : ""
              }`}
            >
              <div className="text-2xl">{r.icon}</div>
              <div className="w-10 shrink-0">
                <Pill tone="warning">{r.tier}</Pill>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {r.completed ? (
                    <>
                      <span className="text-primary">✓ Completed</span>{" "}
                      {timeAgo(r.minutes)}
                    </>
                  ) : (
                    <>
                      <span className="text-yellow-400">▶ Started</span>{" "}
                      {timeAgo(r.minutes)}
                    </>
                  )}
                </div>
              </div>
              {r.completed && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {r.drops.common > 0 && (
                    <Pill tone="muted">{r.drops.common}× C</Pill>
                  )}
                  {r.drops.uncommon > 0 && (
                    <Pill tone="success">{r.drops.uncommon}× U</Pill>
                  )}
                  {r.drops.rare > 0 && <Pill tone="info">{r.drops.rare}× R</Pill>}
                  {r.drops.epic > 0 && <Pill tone="warning">{r.drops.epic}× E</Pill>}
                  {r.drops.legendary > 0 && (
                    <Pill tone="danger">{r.drops.legendary}× L</Pill>
                  )}
                  <Pill tone="warning">+{r.xp} XP</Pill>
                </div>
              )}
            </li>
          ))}
        </ul>
      </RecordsBox>
    </LogsPage>
  );
}
