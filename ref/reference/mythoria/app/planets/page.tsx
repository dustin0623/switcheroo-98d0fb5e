'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/site-layout";
import { Home, Info, ChevronLeft, ChevronRight, Rocket, Star, Zap, Box, Scale } from "lucide-react";
import { useGameStore } from "@/features/game-store/game-store";
import { fightBoss, canFightBoss } from "@/features/events/boss-fight/action";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const PLANET_KEYS = ["Mythoria", "Oceana", "Celestia", "Arborealis", "Neptolith", "Solisar"] as const;
type PlanetKey = (typeof PLANET_KEYS)[number];

interface PlanetMeta {
  key: PlanetKey;
  name: string;
  creature: string;
  description: string;
  minLevel: number;
  flux: number;
  rarities: { label: string; cls: string }[];
  stash: string;
  weight: string;
}

const planets: PlanetMeta[] = [
  {
    key: "Mythoria", name: "Goblin Cave", creature: "Goblin Warchief",
    description: "A shallow warren of torchlit tunnels where goblin raiders stash the $AETHER they steal from passing caravans. Novice adventurers cut their teeth here.",
    minLevel: 1, flux: 1,
    rarities: [
      { label: "Uncommon 95%", cls: "text-emerald-400 border-emerald-500/40" },
      { label: "Rare 3.5%", cls: "text-sky-400 border-sky-500/40" },
      { label: "Epic 1%", cls: "text-fuchsia-400 border-fuchsia-500/40" },
      { label: "Legendary 0.5%", cls: "text-amber-400 border-amber-500/40" },
    ],
    stash: "10%", weight: "90%",
  },
  {
    key: "Oceana", name: "Spider Nest", creature: "Broodmother",
    description: "A silk-choked hollow deep in the Blackwood, home to venomous spiders and the ancient Broodmother that reigns over them.",
    minLevel: 10, flux: 2,
    rarities: [
      { label: "Uncommon 85%", cls: "text-emerald-400 border-emerald-500/40" },
      { label: "Rare 10%", cls: "text-sky-400 border-sky-500/40" },
      { label: "Epic 4%", cls: "text-fuchsia-400 border-fuchsia-500/40" },
      { label: "Legendary 1%", cls: "text-amber-400 border-amber-500/40" },
    ],
    stash: "20%", weight: "80%",
  },
  {
    key: "Celestia", name: "Ancient Ruins", creature: "Stone Warden",
    description: "The half-buried remains of a forgotten empire, patrolled by animated guardians who still obey commands issued a thousand years ago.",
    minLevel: 25, flux: 2,
    rarities: [
      { label: "Uncommon 70%", cls: "text-emerald-400 border-emerald-500/40" },
      { label: "Rare 20%", cls: "text-sky-400 border-sky-500/40" },
      { label: "Epic 8%", cls: "text-fuchsia-400 border-fuchsia-500/40" },
      { label: "Legendary 2%", cls: "text-amber-400 border-amber-500/40" },
    ],
    stash: "30%", weight: "70%",
  },
  {
    key: "Arborealis", name: "Crystal Caverns", creature: "Prism Hydra",
    description: "Vast underground galleries where light refracts through veins of raw essence. The hydra that nests here has learned to weaponize its glow.",
    minLevel: 40, flux: 2,
    rarities: [
      { label: "Uncommon 55%", cls: "text-emerald-400 border-emerald-500/40" },
      { label: "Rare 30%", cls: "text-sky-400 border-sky-500/40" },
      { label: "Epic 12%", cls: "text-fuchsia-400 border-fuchsia-500/40" },
      { label: "Legendary 3%", cls: "text-amber-400 border-amber-500/40" },
    ],
    stash: "40%", weight: "60%",
  },
  {
    key: "Neptolith", name: "Frozen Fortress", creature: "Frost Revenant",
    description: "A shattered keep locked in perpetual winter. Its last king refuses to die, and rises again at every dawn to defend his hoard.",
    minLevel: 60, flux: 2,
    rarities: [
      { label: "Uncommon 40%", cls: "text-emerald-400 border-emerald-500/40" },
      { label: "Rare 35%", cls: "text-sky-400 border-sky-500/40" },
      { label: "Epic 20%", cls: "text-fuchsia-400 border-fuchsia-500/40" },
      { label: "Legendary 5%", cls: "text-amber-400 border-amber-500/40" },
    ],
    stash: "50%", weight: "50%",
  },
  {
    key: "Solisar", name: "Dragon's Lair", creature: "Ancient Wyrm",
    description: "The final trial — a mountain hollowed out by centuries of dragonfire, guarded by the largest wyrm the realm has ever known. Only legends return from this dungeon.",
    minLevel: 80, flux: 2,
    rarities: [
      { label: "Uncommon 20%", cls: "text-emerald-400 border-emerald-500/40" },
      { label: "Rare 40%", cls: "text-sky-400 border-sky-500/40" },
      { label: "Epic 30%", cls: "text-fuchsia-400 border-fuchsia-500/40" },
      { label: "Legendary 10%", cls: "text-amber-400 border-amber-500/40" },
    ],
    stash: "70%", weight: "30%",
  },
];

function fmtDuration(ms: number) {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function PlanetsPage() {
  const [index, setIndex] = useState(0);
  const totalSlots = planets.length;
  const planet = planets[index % totalSlots];

  const activeUser = useGameStore((s) => s.activeUser);
  const player = useGameStore((s) => s.players[activeUser] ?? null);
  const fetchPlayer = useGameStore((s) => s.fetchPlayer);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!player) void fetchPlayer(activeUser);
  }, [activeUser, player, fetchPlayer]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const status = player ? canFightBoss(player, planet.key) : { ok: false, reason: "Loading" };
  const entry = player?.boss_data?.find((b) => b.name === planet.key);
  const cooldownMs = player && entry ? Math.max(0, 4 * 3600000 - (Date.now() - entry.lastBattle)) : 0;

  const doFight = () => {
    const r = fightBoss(activeUser, planet.key);
    if (!r.ok) { toast.error(r.reason ?? "Fight failed"); return; }
    if (r.result === "hit") toast.success(`Boss defeated! Dropped ${r.rarity} crate.`);
    else toast.success(`Missed — salvaged ${r.drop}`);
  };

  return (
    <PageShell>
      <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
          <img src="/assets/planet-mythoria.jpg" alt={planet.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/60" />

          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
            <div className="flex items-center gap-2">
              <Link href="/play" className="h-9 w-9 rounded-md border border-border/60 bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors" aria-label="Home">
                <Home className="h-4 w-4" />
              </Link>
              <Link
                href={`/${activeUser}/boss-logs`}
                className="h-9 px-3 rounded-md border border-border/60 bg-background/60 backdrop-blur text-xs font-semibold tracking-widest text-foreground hover:border-primary hover:text-primary transition-colors flex items-center"
              >
                Logs
              </Link>
              <div className="h-9 px-3 rounded-md border border-border/60 bg-background/60 backdrop-blur flex items-center gap-2 text-xs font-semibold tracking-widest">
                <span className="text-foreground">{activeUser}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Lv</span>
                <span className="text-primary">{player?.level ?? "—"}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-primary">{player ? Math.floor(player.essence || 0) : "—"}</span>
                <span className="text-muted-foreground">ESSENCE</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              {Array.from({ length: totalSlots }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-1 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground"}`}
                  aria-label={`Slot ${i + 1}`}
                />
              ))}
            </div>

            <button className="h-9 px-3 rounded-md border border-border/60 bg-background/60 backdrop-blur flex items-center gap-2 text-xs font-semibold tracking-widest text-foreground hover:border-primary hover:text-primary transition-colors">
              Info <Info className="h-3.5 w-3.5" />
            </button>
          </div>

          <button onClick={() => setIndex((i) => (i - 1 + totalSlots) % totalSlots)} className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/60 border border-border/60 backdrop-blur flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors z-10" aria-label="Previous dungeon">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setIndex((i) => (i + 1) % totalSlots)} className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/60 border border-border/60 backdrop-blur flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors z-10" aria-label="Next dungeon">
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-0 bottom-0 px-6 md:px-10 pb-6">
            <div className="max-w-2xl">
              <p className="text-xs tracking-[0.3em] text-muted-foreground">DUNGEON</p>
              <h1 className="mt-1 text-5xl md:text-6xl font-bold text-foreground">{planet.name}</h1>
              <div className="mt-4 flex gap-4">
                <img src="/assets/creature-sandworm.jpg" alt={planet.creature} loading="lazy" width={96} height={96} className="h-24 w-24 rounded-md object-cover border border-border/60 flex-shrink-0" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <p className="text-foreground/80 font-semibold mb-1">{planet.creature}</p>
                  <p>{planet.description}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge icon={<Star className="h-3 w-3" />} className="text-emerald-400 border-emerald-500/40">Lv {planet.minLevel}+</Badge>
                <Badge icon={<Zap className="h-3 w-3" />} className="text-emerald-400 border-emerald-500/40">{planet.flux} ESSENCE</Badge>
                {planet.rarities.map((r) => <Badge key={r.label} className={r.cls}>{r.label}</Badge>)}
                <Badge icon={<Box className="h-3 w-3" />} className="text-muted-foreground border-border/60">{planet.stash}</Badge>
                <Badge icon={<Scale className="h-3 w-3" />} className="text-muted-foreground border-border/60">{planet.weight}</Badge>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={doFight}
                      disabled={!status.ok}
                      className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary/10 px-6 py-3 text-sm font-semibold tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Rocket className="h-4 w-4" />
                      {cooldownMs > 0 ? `Cooldown ${fmtDuration(cooldownMs)}` : "Fight Boss"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!status.ok && (
                  <TooltipContent side="top" className="max-w-xs text-xs">{status.reason}</TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </section>
    </PageShell>
  );
}

function Badge({ children, icon, className = "" }: { children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border bg-background/60 backdrop-blur px-2.5 py-1 text-xs font-semibold ${className}`}>
      {icon}{children}
    </span>
  );
}
