import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, Info, Lock, Shield, Swords, Rocket, User, Wrench } from "lucide-react";
import { getMission, missions, PLAYER_LEVEL, type SlotKey } from "@/lib/missions";

export const Route = createFileRoute("/quests/$mission")({
  loader: ({ params }) => {
    const m = getMission(params.mission);
    if (!m) throw notFound();
    return { slug: m.slug };
  },
  head: ({ loaderData }) => {
    const m = loaderData ? getMission(loaderData.slug) : undefined;
    const title = m ? `${m.title} — Mythoria` : "Mission — Mythoria";
    return {
      meta: [
        { title },
        { name: "description", content: m?.brief.slice(0, 155) ?? "Mission briefing." },
        { property: "og:title", content: title },
        { property: "og:description", content: m?.brief.slice(0, 155) ?? "Mission briefing." },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <p role="alert">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
      <p className="text-lg">Mission not found.</p>
      <Link to="/quests" className="text-primary underline">Back to missions</Link>
    </div>
  ),
  component: MissionDetail,
});

const SLOT_META: Record<SlotKey, { label: string; icon: typeof Shield }> = {
  WPN: { label: "WPN", icon: Swords },
  ARM: { label: "ARM", icon: Shield },
  SHIP: { label: "SHIP", icon: Rocket },
  AVT: { label: "AVT", icon: User },
  TOOL: { label: "TOOL", icon: Wrench },
};

const SLOT_ORDER: SlotKey[] = ["WPN", "ARM", "SHIP", "AVT", "TOOL"];

function MissionDetail() {
  const { slug } = Route.useLoaderData();
  const m = missions.find((x) => x.slug === slug)!;

  const levelOk = PLAYER_LEVEL >= m.levelReq;
  const statOk = m.primary.have >= m.primary.required;
  const scrapOk = true; // player has enough scrap in mock

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-background">
      <img src={m.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background/90" />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
        <Link
          to="/quests"
          className="h-9 px-3 rounded-full border border-border/60 bg-background/70 backdrop-blur flex items-center gap-1.5 text-xs font-semibold tracking-widest text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-foreground/90 uppercase">
          {m.categoryIcon}
          {m.category}
        </div>
        <button className="h-9 px-3 rounded-full border border-border/60 bg-background/70 backdrop-blur flex items-center gap-2 text-xs font-semibold tracking-widest text-foreground hover:border-primary hover:text-primary transition-colors">
          Info <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Loadout panel */}
      <aside className="absolute right-4 top-20 z-10 w-[320px] rounded-xl border border-border/60 bg-background/85 backdrop-blur p-4 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-primary text-[10px]">M</span>
          FULL LOADOUT
        </div>
        <div className="grid grid-cols-5 gap-2">
          {SLOT_ORDER.map((slot) => {
            const meta = SLOT_META[slot];
            const Icon = meta.icon;
            const active = slot === m.requiredSlot;
            return (
              <div key={slot} className="flex flex-col items-center gap-1">
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground">{meta.label}</div>
                <div
                  className={`h-14 w-full rounded-md border flex items-center justify-center relative ${
                    active
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                      : "border-border/60 bg-muted/20 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rotate-45 bg-emerald-400" />
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">—</div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-md bg-muted/10 px-2 py-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            {m.slotOptional ? <Eye /> : <Shield className="h-3.5 w-3.5" />}
            <span className="text-foreground">{m.slotLabel} for this mission</span>
          </div>
          {m.slotOptional ? (
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
              OPTIONAL
            </span>
          ) : (
            <span className="text-[10px] font-bold tracking-widest text-rose-300 border border-rose-500/60 bg-rose-500/10 rounded px-1.5 py-0.5">
              REQUIRED
            </span>
          )}
        </div>

        {m.slotOptional ? (
          <>
            <div className="rounded-md bg-muted/10 px-3 py-2 text-xs">
              <span className="font-semibold text-foreground">{m.primary.key}: {m.primary.have.toFixed(2)}</span>
              <span className="text-muted-foreground"> / {m.primary.required} for T{m.tier}</span>
              <span className="text-rose-400 ml-1">({m.primary.have - m.primary.required})</span>
            </div>
            <ul className="space-y-1.5">
              {SLOT_ORDER.map((slot) => {
                const meta = SLOT_META[slot];
                const Icon = meta.icon;
                return (
                  <li key={slot} className="flex items-center justify-between text-xs rounded-md border border-border/40 px-2.5 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {SLOT_LABEL[slot]}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      empty <span className="text-muted-foreground/70">(+0)</span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">no items</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase leading-relaxed">
              {m.primary.key} sums across all 5 slots. Swap individual slots to build toward higher tiers.
            </p>
          </>
        ) : (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-muted-foreground">No {m.slotLabel.toLowerCase()} in inventory.</p>
            <Link to="/market" className="text-primary text-xs font-semibold underline underline-offset-4">
              Browse items →
            </Link>
          </div>
        )}
      </aside>

      {/* Briefing */}
      <div className="relative z-10 flex min-h-screen flex-col justify-end pb-10">
        <div className="max-w-2xl pl-6 md:pl-10 space-y-4">
          <p className="text-xs font-bold tracking-[0.3em] text-muted-foreground">MISSION BRIEFING</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-wide text-foreground">{m.title}</h1>
          <p className="text-sm text-foreground/80 max-w-xl leading-relaxed">{m.brief}</p>

          <div className="flex flex-wrap items-center gap-2">
            <Chip className={m.tierCls}>★ Tier {m.tier}</Chip>
            <Chip>⚡ {m.primary.key}{m.primary.itemsOnly ? "  (items only)" : ""}</Chip>
            <Chip>◷ {m.time}</Chip>
            <Chip>◉ {m.scrap}</Chip>
            <Chip>◈ {m.baseDraws} base draws</Chip>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ReqChip ok={levelOk}>Lv {m.levelReq}+  ({PLAYER_LEVEL})</ReqChip>
            <ReqChip ok={statOk}>
              {m.primary.key} {m.primary.required}+  ({m.primary.have})
              {m.primary.itemsOnly && <span className="text-muted-foreground ml-1">from items</span>}
            </ReqChip>
            <ReqChip ok={false}>
              {m.slotOptional ? `${m.slotLabel} optional` : `${m.slotLabel} Not equipped`}
            </ReqChip>
            <ReqChip ok={scrapOk}>✓ {m.scrap}  ({m.scrapFiat})</ReqChip>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="text-muted-foreground">Artifacts:</span>
            <RelicChip color="amber">Legendary {m.relics.legendary}%</RelicChip>
            <RelicChip color="fuchsia">Epic {m.relics.epic}%</RelicChip>
            <RelicChip color="blue">Rare {m.relics.rare}%</RelicChip>
            <RelicChip color="emerald">Uncommon {m.relics.uncommon}%</RelicChip>
            <span className="text-muted-foreground">Common {m.relics.common}%</span>
            <RelicChip color="amber">◈ Yield {m.relics.yield}%</RelicChip>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <button
            className="mt-4 w-full max-w-md inline-flex items-center justify-center gap-2 rounded-md border border-border/60 bg-muted/30 py-3 text-sm font-bold tracking-widest text-muted-foreground cursor-not-allowed"
            disabled
          >
            <Lock className="h-4 w-4" />
            {levelOk
              ? m.primary.itemsOnly
                ? `${m.primary.key} ${m.primary.required} Required (items only)`
                : `${m.primary.key} ${m.primary.required} Required`
              : `Level ${m.levelReq} Required`}
          </button>
        </div>
      </div>
    </section>
  );
}

function Eye() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const SLOT_LABEL: Record<SlotKey, string> = {
  WPN: "Weapon",
  ARM: "Armor",
  SHIP: "Ship",
  AVT: "Avatar",
  TOOL: "Tool",
};

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-semibold text-foreground ${className}`}>
      {children}
    </span>
  );
}

function ReqChip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        ok
          ? "text-emerald-300 border-emerald-500/50 bg-emerald-500/10"
          : "text-rose-300 border-rose-500/50 bg-rose-500/10"
      }`}
    >
      {ok ? "✓" : "🔒"} {children}
    </span>
  );
}

function RelicChip({ children, color }: { children: React.ReactNode; color: "amber" | "fuchsia" | "blue" | "emerald" }) {
  const map = {
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/40",
    fuchsia: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/40",
    blue: "text-sky-300 bg-sky-500/10 border-sky-500/40",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/40",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${map[color]}`}>
      {children}
    </span>
  );
}

