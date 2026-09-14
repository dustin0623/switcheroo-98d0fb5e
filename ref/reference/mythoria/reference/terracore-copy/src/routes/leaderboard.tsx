import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageShell } from "@/components/site-layout";
import { useGameStore } from "@/stores/game-store";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Mythoria" },
      { name: "description", content: "Top Mythoria citizens ranked by experience, favor, and rewards." },
      { property: "og:title", content: "Leaderboard — Mythoria" },
      { property: "og:description", content: "Top Mythoria citizens ranked by experience, favor, and rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

const fmt = (n: number, d = 0) =>
  n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

function LeaderboardPage() {
  const rows = useGameStore((s) => s.leaderboard);
  const fetchLeaderboard = useGameStore((s) => s.fetchLeaderboard);
  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const totalReward = rows.reduce((s, r) => s + (r.reward || 0), 0);

  return (
    <PageShell>
      <div className="container-tc py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wider">Leaderboard</h1>
          <div className="bracket-frame px-6 py-2 text-xs font-semibold tracking-widest text-primary">
            Rewards: {fmt(totalReward, 2)} $MGOLD
          </div>
          <div className="text-xs font-semibold tracking-widest text-muted-foreground">
            1 – {rows.length}
          </div>
        </div>

        <div className="bracket-frame overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground uppercase tracking-widest">
                <th className="px-3 py-3">Rank</th>
                <th className="px-3 py-3">Player</th>
                <th className="px-3 py-3 text-right">Level</th>
                <th className="px-3 py-3 text-right">Gathering</th>
                <th className="px-3 py-3 text-right">Attack</th>
                <th className="px-3 py-3 text-right">Defense</th>
                <th className="px-3 py-3 text-right">Reputation</th>
                <th className="px-3 py-3 text-right">Staked</th>
                <th className="px-3 py-3 text-right">Balance</th>
                <th className="px-3 py-3 text-right">Experience</th>
                <th className="px-3 py-3 text-right">Rewards</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.username} className="border-t border-border/50 hover:bg-accent/20">
                  <td className="px-3 py-2 font-semibold text-primary">#{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">{r.username}</td>
                  <td className="px-3 py-2 text-right text-primary">★ {r.level}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.stats.engineering, 3)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.stats.damage, 3)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.stats.defense, 3)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.favor)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.hiveEngineStake, 3)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.hiveEngineScrap, 3)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.experience)}</td>
                  <td className="px-3 py-2 text-right text-primary">{fmt(r.reward, 2)} ◆</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={11}>
                    Loading leaderboard…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
