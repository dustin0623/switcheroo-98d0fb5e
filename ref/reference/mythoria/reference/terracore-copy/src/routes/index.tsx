import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageShell } from "@/components/site-layout";
import { useGameStore } from "@/stores/game-store";
import { Pill, fmt } from "@/components/logs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mythoria — Fantasy Idle MMORPG" },
      {
        name: "description",
        content:
          "A fantasy idle MMORPG where heroes venture across the kingdom. Collect $MGOLD, upgrade stats, raid, quest, and challenge new dungeons.",
      },
      { property: "og:title", content: "Mythoria — Fantasy Idle MMORPG" },
      {
        property: "og:description",
        content: "Collect $MGOLD, raid, quest, and challenge dungeons in a fantasy idle MMORPG.",
      },
    ],
  }),
  component: Index,
});

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bracket-frame flex items-center justify-between bg-card/40">
      <div>
        <p className="text-xs text-muted-foreground tracking-widest uppercase">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
      </div>
      <span className="text-3xl text-muted-foreground" aria-hidden>
        {icon}
      </span>
    </div>
  );
}

function Index() {
  const citizens = useGameStore((s) => s.citizens);
  const activeUser = useGameStore((s) => s.activeUser);
  const setActiveUser = useGameStore((s) => s.setActiveUser);
  const player = useGameStore((s) => s.players[activeUser] ?? null);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const fetchPlayer = useGameStore((s) => s.fetchPlayer);
  const fetchLeaderboard = useGameStore((s) => s.fetchLeaderboard);

  useEffect(() => {
    void fetchPlayer(activeUser);
    void fetchLeaderboard();
  }, [activeUser, fetchPlayer, fetchLeaderboard]);

  return (
    <PageShell>
      {/* Hero */}
      <section className="container-tc pt-16 pb-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-wider leading-tight">
              HERO, YOUR
              <br />
              ADVENTURE
              <br />
              <span className="text-primary">BEGINS</span>
            </h1>
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-md">
              The world of Mythoria has fallen into chaos after the Great Calamity.
              Venture across the kingdom, hunt monsters, raid rival heroes, and
              amass <span className="text-primary">$MGOLD</span> to become the
              greatest adventurer in the realm.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/$user/items"
                params={{ user: activeUser }}
                className="px-6 py-3 border border-primary text-primary rounded-md text-sm font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                ENTER GAME
              </Link>
              <Link
                to="/market"
                className="px-6 py-3 border border-border rounded-md text-sm font-semibold tracking-widest hover:border-primary text-foreground transition-colors"
              >
                MARKET →
              </Link>
            </div>
          </div>
          <div className="aspect-square bg-card/40 border border-border rounded-lg flex items-center justify-center">
            <span className="text-5xl font-bold tracking-widest text-primary">
              MYTHORIA
            </span>
          </div>
        </div>
      </section>

      {/* Hero switcher */}
      <section className="container-tc pb-12">
        <div className="bracket-frame bg-card/30">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div>
              <p className="text-xs text-primary tracking-widest uppercase">Test Accounts</p>
              <h2 className="text-2xl font-bold tracking-wider">Select a Hero</h2>
              <p className="text-xs text-muted-foreground mt-1">
                10 seeded mock profiles served through <code className="text-primary">/api/mock/*</code>
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              Active: <span className="text-primary font-semibold">{activeUser}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {citizens.map((c) => (
              <button
                key={c}
                onClick={() => setActiveUser(c)}
                className={`px-3 py-2 rounded-md border text-xs font-semibold tracking-widest transition-colors ${
                  c === activeUser
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Active player snapshot */}
      {player && (
        <section className="container-tc pb-16">
          <div className="grid md:grid-cols-4 gap-4">
            <Stat label="Level" value={String(player.level)} icon="✦" />
            <Stat label="Scrap" value={fmt(player.scrap, 0)} icon="⚙" />
            <Stat label="Flux" value={fmt(player.flux, 2)} icon="⚡" />
            <Stat label="Reputation" value={String(player.favor)} icon="✧" />
          </div>
          <div className="mt-4 grid md:grid-cols-6 gap-3 text-xs">
            {(["damage", "defense", "engineering", "dodge", "crit", "luck"] as const).map((k) => (
              <div key={k} className="bracket-frame bg-card/30">
                <p className="text-muted-foreground uppercase tracking-widest">{k}</p>
                <p className="text-lg font-bold text-foreground mt-1 font-mono">
                  {fmt(player.stats[k], 2)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Live-ish leaderboard */}
      <section className="container-tc pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold tracking-wider">LEADERBOARD</h2>
          <span className="text-xs text-muted-foreground">Top {leaderboard.length}</span>
        </div>
        <div className="bracket-frame p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Citizen</th>
                <th className="px-4 py-3 text-right">Level</th>
                <th className="px-4 py-3 text-right">XP</th>
                <th className="px-4 py-3 text-right">Scrap</th>
                <th className="px-4 py-3 text-right">Attacks</th>
                <th className="px-4 py-3 text-right">Claims</th>
                <th className="px-4 py-3 text-right">Attack</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((r, i) => (
                <tr
                  key={r.username}
                  className={`border-t border-border/40 hover:bg-secondary/40 ${
                    r.username === activeUser ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      to="/$user/items"
                      params={{ user: r.username }}
                      className="text-primary hover:underline font-semibold"
                    >
                      {r.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right"><Pill tone="info">{r.level}</Pill></td>
                  <td className="px-4 py-3 text-right font-mono">{r.experience.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.scrap.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.attacks}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.claims}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(r.stats.damage, 2)}</td>
                </tr>
              ))}
              {!leaderboard.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading leaderboard…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
