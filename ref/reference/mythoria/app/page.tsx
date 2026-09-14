'use client';

import Link from "next/link";
import { useEffect } from "react";
import { PageShell } from "@/components/site-layout";
import { useGameStore } from "@/features/game-store/game-store";
import { fmt } from "@/components/logs";

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

export default function Home() {
  const activeUser = useGameStore((s) => s.activeUser);
  const player = useGameStore((s) => s.players[activeUser] ?? null);
  const fetchPlayer = useGameStore((s) => s.fetchPlayer);

  useEffect(() => {
    void fetchPlayer(activeUser);
  }, [activeUser, fetchPlayer]);

  return (
    <PageShell>
      {/* Hero */}
      <section className="container-tc pt-16 pb-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-wider leading-tight text-balance">
              HERO, YOUR
              <br />
              ADVENTURE
              <br />
              <span className="text-primary">BEGINS</span>
            </h1>
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-md">
              The world of Mythoria has fallen into chaos after the Great Calamity.
              Venture across the kingdom, hunt monsters, raid rival heroes, and
              amass <span className="text-primary">$AETHER</span> to become the
              greatest adventurer in the realm.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={`/${activeUser}/items`}
                className="px-6 py-3 border border-primary text-primary rounded-md text-sm font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                ENTER GAME
              </Link>
              <Link
                href="/market"
                className="px-6 py-3 border border-border rounded-md text-sm font-semibold tracking-widest hover:border-primary text-foreground transition-colors"
              >
                MARKET →
              </Link>
            </div>
          </div>
          <div
            className="aspect-square border border-border rounded-lg overflow-hidden relative flex items-end"
            style={{
              backgroundImage: "url(/backgrounds/bg1.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* dark gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
            <span className="relative z-10 p-6 text-2xl font-bold tracking-[0.3em] text-primary">
              MYTHORIA
            </span>
          </div>
        </div>
      </section>


      {/* Active player snapshot */}
      {player && (
        <section className="container-tc pb-16">
          <div className="grid md:grid-cols-4 gap-4">
            <Stat label="Level" value={String(player.level)} icon="✦" />
            <Stat label="Essence" value={fmt(player.essence ?? 0, 0)} icon="⚙" />
            <Stat label="Aether" value={fmt(player.aether ?? 0, 2)} icon="⚡" />
            <Stat label="Reputation" value={String(player.favor)} icon="✧" />
          </div>
          <div className="mt-4 grid md:grid-cols-6 gap-3 text-xs">
            {(["damage", "defense", "arcane", "speed", "crit", "luck"] as const).map((k) => (
              <div key={k} className="bracket-frame bg-card/30">
                <p className="text-muted-foreground uppercase tracking-widest">{k}</p>
                <p className="text-lg font-bold text-foreground mt-1 font-mono">
                  {fmt((player.stats as unknown as Record<string, number>)[k] ?? 0, 2)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}


    </PageShell>
  );
}
