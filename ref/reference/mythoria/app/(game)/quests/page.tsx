'use client';

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageShell } from "@/components/site-layout";
import {
  Home, Info, ChevronRight, ChevronLeft, Clock, Lock, Eye,
  Coins, Shield, Swords, Wrench, Rocket, User,
} from "lucide-react";
import { useGameStore } from "@/features/game-store/game-store";
import { startQuest } from "@/features/events/quest-start/action";
import { collectQuest } from "@/features/events/quest-collect/action";
import {
  canStartQuest,
  effectivePrimaryStat,
  QUEST_TYPE_MAP,
  TIER_BASE_COST,
  TIER_LEVEL_REQ,
  TIER_STAT_REQ,
  TIER_STAT_REQ_ITEM,
} from "@/features/game-store/formulas/quests";
import { toast } from "sonner";
import type { Quest, QuestBoardSlot } from "@/features/types";

const QUEST_IMAGES: Record<string, string> = {
  stealth: "/assets/mission-stealth.jpg",
  fortune: "/assets/mission-fortune.jpg",
  defense: "/assets/mission-defense.jpg",
  combat: "/assets/mission-combat.jpg",
  salvage: "/assets/mission-salvage.jpg",
  escort: "/assets/mission-fortune.jpg",
  gather: "/assets/mission-salvage.jpg",
  explore: "/assets/mission-stealth.jpg",
};

const QUEST_ICONS: Record<string, typeof Eye> = {
  stealth: Eye,
  fortune: Coins,
  defense: Shield,
  combat: Swords,
  salvage: Wrench,
  escort: Rocket,
  gather: Wrench,
  explore: Eye,
};

const EMPTY_QUESTS: Quest[] = [];

const TABS = [
  { href: "/play",     label: "Board" },
  { href: "/dungeons", label: "Dungeons" },
  { href: "/quests",   label: "Quests" },
];

const TIER_CLS: Record<number, string> = {
  1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  2: "bg-sky-500/20 text-sky-400 border-sky-500/40",
  3: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  4: "bg-teal-500/20 text-teal-400 border-teal-500/40",
  5: "bg-rose-500/20 text-rose-400 border-rose-500/40",
};

function fmtDuration(ms: number) {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function QuestsPage() {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 280);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const activeUser = useGameStore((s) => s.activeUser);
  const player = useGameStore((s) => s.players[activeUser] ?? null);
  const questBoard = useGameStore((s) => s.questBoard);
  const activeQuests = useGameStore((s) => s.quests[activeUser] ?? EMPTY_QUESTS);
  const fetchPlayer = useGameStore((s) => s.fetchPlayer);
  const fetchQuestBoard = useGameStore((s) => s.fetchQuestBoard);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    void fetchPlayer(activeUser);
    void fetchQuestBoard();
  }, [activeUser, fetchPlayer, fetchQuestBoard]);

  return (
    <PageShell>
      <section className="relative min-h-screen w-full overflow-hidden">
        <img src="/assets/quests-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-background/50" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
          <div className="flex items-center gap-2">
            <Link href="/play" className="h-9 w-9 rounded-md border border-border/60 bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors" aria-label="Home">
              <Home className="h-4 w-4" />
            </Link>
            <Link
              href={`/${activeUser}/quest-logs`}
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
              <span className="text-primary">{player ? Math.floor(player.aether || 0).toLocaleString() : "—"}</span>
              <span className="text-muted-foreground">$AETHER</span>
            </div>
          </div>
          {/* Tab bar */}
          <div className="inline-flex rounded-md border border-border/60 overflow-hidden text-sm font-semibold tracking-widest bg-background/60 backdrop-blur">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`px-4 py-2 transition-colors ${
                    active ? "bg-secondary/70 text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          <button className="h-9 px-3 rounded-md border border-border/60 bg-background/60 backdrop-blur flex items-center gap-2 text-xs font-semibold tracking-widest text-foreground hover:border-primary hover:text-primary transition-colors">
            Info <Info className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-24 pb-12">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-foreground">DAILY MISSIONS</h1>
            <p className="mt-2 text-sm text-primary font-mono">Resets in 10h 51m 52s</p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">3.58× · $0.00000423</p>
          </div>

          <div className="relative w-full mt-10">
            <div
              ref={scrollerRef}
              className="flex gap-4 overflow-x-auto scroll-smooth px-6 md:px-14 pb-4 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {questBoard?.slots.map((slot, i) => (
                <MissionCard key={i} slot={slot} index={i} />
              ))}
            </div>
            <button onClick={() => scrollBy(-1)} aria-label="Previous missions" className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/70 border border-border/60 backdrop-blur items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => scrollBy(1)} aria-label="Next missions" className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/70 border border-border/60 backdrop-blur items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {activeQuests.length > 0 && (
            <div className="w-full max-w-5xl mt-10 px-6 md:px-14">
              <h2 className="text-lg font-bold tracking-widest text-foreground mb-4">ACTIVE QUESTS</h2>
              <div className="grid gap-3">
                {activeQuests.map((q) => {
                  const remaining = Math.max(0, q.completes_at - Date.now());
                  const canCollect = remaining <= 0 && !q.collected;
                  return (
                    <div key={q._id} className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 backdrop-blur px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-primary">T{q.tier}</span>
                        <span className="text-sm font-semibold text-foreground">{q.name}</span>
                        <span className="text-xs text-muted-foreground">{remaining > 0 ? fmtDuration(remaining) : "Ready"}</span>
                      </div>
                      <button
                        onClick={() => {
                          const r = collectQuest(activeUser, q._id);
                          if (r.ok) toast.success("Quest rewards collected!");
                          else toast.error(r.reason ?? "Collect failed");
                        }}
                        disabled={!canCollect}
                        className="px-4 py-1.5 rounded-md border border-primary bg-primary/10 text-xs font-semibold tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Collect
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function MissionCard({ slot, index }: { slot: QuestBoardSlot; index: number }) {
  const activeUser = useGameStore((s) => s.activeUser);
  const player = useGameStore((s) => s.players[activeUser] ?? null);
  const mapping = QUEST_TYPE_MAP[slot.quest_type] || QUEST_TYPE_MAP.combat;
  const Icon = QUEST_ICONS[slot.quest_type] || Swords;
  const image = QUEST_IMAGES[slot.quest_type] || "/assets/mission-combat.jpg";

  const levelReq = TIER_LEVEL_REQ[slot.tier as keyof typeof TIER_LEVEL_REQ] || 1;
  const statReqBase = TIER_STAT_REQ[slot.tier as keyof typeof TIER_STAT_REQ] || 0;
  const statReqItem = TIER_STAT_REQ_ITEM[slot.tier as keyof typeof TIER_STAT_REQ_ITEM] || 0;
  const statReq = ["dodge", "luck"].includes(mapping.primary as string) ? statReqItem : statReqBase;
  const have = player ? effectivePrimaryStat(player, mapping.primary) : 0;
  const cost = Math.ceil(TIER_BASE_COST[slot.tier as keyof typeof TIER_BASE_COST] || 0);

  const validation = player ? canStartQuest(player, slot, 1.0) : { ok: false, reason: "Loading" };
  const levelOk = (player?.level || 0) >= levelReq;
  const statOk = have >= statReq;
  const scrapOk = (player?.aether || 0) >= cost;

  const doStart = () => {
    const r = startQuest(activeUser, slot);
    if (r.ok) toast.success(`Started ${slot.name}`);
    else toast.error(r.reason ?? "Start failed");
  };

  return (
    <div className="relative w-64 flex-shrink-0 snap-start rounded-xl overflow-hidden border border-border/60 bg-card/40 backdrop-blur hover:border-primary/60 transition-colors">
      <div className="relative h-40 overflow-hidden">
        <img src={image} alt={slot.name} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${TIER_CLS[slot.tier] || TIER_CLS[1]}`}>
            T{slot.tier}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 backdrop-blur px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
            <Icon className="h-3 w-3" />
            {slot.quest_type.toUpperCase()}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
      </div>
      <div className="p-3 space-y-3">
        <h3 className="text-sm font-bold text-foreground leading-tight min-h-[2.5rem]">{slot.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{slot.flavor}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{slot.duration_hours}h</span>
          <span className="text-foreground/80 font-semibold">{cost} $AETHER</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ReqChip ok={levelOk}>Lv {levelReq}</ReqChip>
          <ReqChip ok={statOk}>{mapping.primary} {statReq}</ReqChip>
          <ReqChip ok={scrapOk}>{cost} $AETHER</ReqChip>
        </div>
        <button
          onClick={doStart}
          disabled={!validation.ok}
          className={`w-full inline-flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-bold tracking-widest transition-colors ${
            validation.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "border-rose-500/40 bg-rose-500/10 text-rose-400 cursor-not-allowed"
          }`}
        >
          {validation.ok ? "Start" : <><Lock className="h-3 w-3" /> {validation.reason}</>}
        </button>
      </div>
    </div>
  );
}

function ReqChip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${ok ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" : "text-rose-400 border-rose-500/40 bg-rose-500/10"}`}>
      {children} {ok ? "✓" : "✕"}
    </span>
  );
}
