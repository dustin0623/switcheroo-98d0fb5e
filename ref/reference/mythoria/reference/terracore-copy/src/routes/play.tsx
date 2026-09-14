import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/site-layout";
import { useGameStore } from "@/stores/game-store";
import { selectAttacks, selectClaims, selectEffectiveStats, selectStash, selectUpgradeCosts, selectXpProgress } from "@/stores/selectors";
import { claim } from "@/stores/actions/mining";
import { contributeFavor, upgrade } from "@/stores/actions/upgrades";
import { stakeScrap } from "@/stores/actions/stake";
import { attackPlayer } from "@/stores/actions/battle";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const DODGE_STATS: [number, string][] = [
  [1, "+0.025%"], [2, "+0.050%"], [5, "+0.125%"], [10, "+0.250%"],
  [25, "+0.625%"], [50, "+1.250%"], [100, "+2.500%"], [250, "+5.625%"],
  [500, "+7.438%"], [1000, "+9.000%"], [2000, "+10.266%"], [5000, "+11.438%"],
  [10000, "+12.087%"], [25000, "+12.453%"], [50000, "+13.063%"], [100000, "+14.284%"],
  [250000, "+15.092%"], [500000, "+15.283%"], [1000000, "+15.664%"],
  [2500000, "+16.809%"], [5000000, "+17.027%"],
];

const LUCK_STATS: [number, string][] = [
  [1, "+0.025%"], [2, "+0.050%"], [5, "+0.125%"], [10, "+0.250%"],
  [25, "+0.625%"], [50, "+1.250%"], [100, "+2.250%"], [250, "+3.281%"],
  [500, "+4.063%"], [1000, "+5.078%"], [2000, "+5.469%"], [5000, "+6.641%"],
  [10000, "+7.100%"], [25000, "+7.466%"], [50000, "+8.002%"], [100000, "+8.041%"],
  [250000, "+8.155%"], [500000, "+8.346%"], [1000000, "+8.727%"],
  [2500000, "+9.872%"], [5000000, "+10.028%"],
];

const CRIT_STATS: [number, string][] = [
  [1, "+0.025%"], [2, "+0.050%"], [5, "+0.125%"], [10, "+0.250%"],
  [25, "+0.625%"], [50, "+1.250%"], [100, "+2.500%"], [250, "+5.625%"],
  [500, "+7.438%"], [1000, "+8.125%"], [2000, "+8.516%"], [5000, "+9.688%"],
  [10000, "+10.103%"], [25000, "+10.469%"], [50000, "+11.079%"], [100000, "+12.009%"],
  [250000, "+12.124%"], [500000, "+12.315%"], [1000000, "+12.696%"],
  [2500000, "+13.840%"], [5000000, "+14.027%"],
];

// Look up a % from a threshold table (uses the largest threshold <= value).
function pctFromTable(rows: [number, string][], value: number): number {
  let pct = 0;
  for (const [threshold, str] of rows) {
    if (value >= threshold) pct = parseFloat(str);
    else break;
  }
  return pct;
}

function sumEquippedAttr(items: Partial<import("@/mock/types").EquippedSet> | undefined, key: "dodge" | "luck" | "crit"): number {
  if (!items) return 0;
  return (["avatar", "weapon", "armor", "ship", "special"] as const).reduce((sum, slot) => {
    const s = items[slot];
    return sum + (s?.item_equipped ? (s.attributes?.[key] ?? 0) : 0);
  }, 0);
}


function StatTableModal({
  title,
  rows,
  children,
}: {
  title: string;
  rows: [number, string][];
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`View ${title}`}
          className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer"
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 gap-0 bg-card border-border">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-lg font-bold tracking-wide">{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {rows.map(([n, v], i) => (
            <div
              key={n}
              className={`flex items-center justify-between px-6 py-2.5 text-sm ${
                i % 2 === 0 ? "bg-secondary/30" : ""
              }`}
            >
              <span className="font-mono text-muted-foreground">{n.toLocaleString()}</span>
              <span className="font-mono text-primary font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatModalIcon({ title, rows }: { title: string; rows: [number, string][] }) {
  return (
    <StatTableModal title={title} rows={rows}>
      <span className="inline-flex items-center text-xs">ⓘ</span>
    </StatTableModal>
  );
}

/**
 * Upgrade projection modal for level-based stats (Gathering / Attack / Defense).
 * Mirrors the in-game "Mine Rate / Attack / Defense Stats" dialogs. Formulas
 * come from the Mythoria wiki — this is a local-only zustand mockup.
 */
function UpgradeTableModal({
  title,
  currentLevel,
  step,
  rowCount = 60,
  computeValue,
  computeCost,
  showCurrentValue,
  formatLevel = (n) => n.toLocaleString(),
  formatValue,
  trigger,
}: {
  title: string;
  currentLevel: number;
  step: number;
  rowCount?: number;
  computeValue: (level: number) => number;
  computeCost?: (level: number) => number;
  showCurrentValue: boolean;
  formatLevel?: (n: number) => string;
  formatValue: (n: number) => string;
  trigger: React.ReactNode;
}) {
  const rows: { level: number; cost?: number; isCurrent: boolean }[] = [];
  for (let i = 0; i < rowCount; i++) {
    const level = currentLevel + i * step;
    rows.push({
      level,
      cost: i === 0 ? undefined : computeCost?.(level),
      isCurrent: i === 0,
    });
  }
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md p-0 gap-0 bg-card border-border">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-lg font-bold tracking-wide">{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {rows.map((row, i) => (
            <div
              key={row.level + "-" + i}
              className={`flex items-center justify-between px-6 py-2.5 text-sm ${
                i % 2 === 0 ? "bg-secondary/30" : ""
              }`}
            >
              <span className="font-mono text-muted-foreground">
                {formatLevel(row.level)}
                {row.cost !== undefined && (
                  <span className="text-muted-foreground/60"> (cost: {row.cost.toLocaleString()})</span>
                )}
              </span>
              <span className="font-mono text-primary font-semibold">
                {row.isCurrent && !showCurrentValue
                  ? "Current"
                  : formatValue(computeValue(row.level))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Wiki formulas (https://www.mythoriagame.com/wiki/stats/):
 * - Gathering: mineRate/sec = (level+1)² / 172_800  → per hour × 3600 = (level+1)²/48
 * - Attack / Defense effective: (level/10)²
 * - Upgrade cost from current level: currentLevel² (e.g. L1→L2 costs 1, L2→L3 costs 4)
 * The Attack/Defense modals in-game display the effective value of the PREVIOUS
 * tier on each row (row L shows ((L-10)/10)²), matching the reference screenshots.
 */
const engineeringRatePerHour = (level: number) => Math.pow(level + 1, 2) / 48;
const damageDefenseEffectivePrevTier = (level: number) => Math.pow((level - 10) / 10, 2);
const upgradeCost = (targetLevel: number) => Math.pow(targetLevel - 1, 2);

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Mythoria" },
      { name: "description", content: "Your Mythoria dashboard: stash, stats, equipment and battles." },
      { property: "og:title", content: "Play — Mythoria" },
      { property: "og:description", content: "Your Mythoria dashboard: stash, stats, equipment and battles." },
    ],
  }),
  component: Play,
});

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className="text-muted-foreground/60 hover:text-primary transition-colors cursor-help"
        >
          ⓘ
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-center leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function StatCard({
  title,
  value,
  unit,
  meta,
  action,
  icon,
  tooltip,
  valueTooltip,
  titleAction,
}: {
  title: string;
  value: string;
  unit?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  icon: string;
  tooltip?: React.ReactNode;
  valueTooltip?: React.ReactNode;
  titleAction?: React.ReactNode;
}) {
  return (
    <div className="bracket-frame bg-card/40 flex flex-col justify-between min-h-[160px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs tracking-widest uppercase text-muted-foreground flex items-center gap-2">
            {title} {tooltip && <InfoTip>{tooltip}</InfoTip>} {titleAction}
          </p>
          {valueTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="mt-2 text-4xl font-bold text-foreground cursor-help inline-block">
                  {value}
                  {unit && (
                    <span className="ml-2 text-sm tracking-widest text-primary font-semibold">
                      {unit}
                    </span>
                  )}
                </p>
              </TooltipTrigger>
              <TooltipContent>{valueTooltip}</TooltipContent>
            </Tooltip>
          ) : (
            <p className="mt-2 text-4xl font-bold text-foreground">
              {value}
              {unit && (
                <span className="ml-2 text-sm tracking-widest text-primary font-semibold">
                  {unit}
                </span>
              )}
            </p>
          )}
          {meta && <div className="mt-2 text-xs text-muted-foreground">{meta}</div>}
        </div>
        <span className="text-3xl text-muted-foreground/70" aria-hidden>
          {icon}
        </span>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function StakeDialog({
  balance,
  staked,
  onStake,
}: {
  balance: number;
  staked: number;
  onStake: (qty: number) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const qty = Number(amount);
  const valid = Number.isFinite(qty) && qty > 0 && qty <= balance;
  const nextStake = staked + (valid ? qty : 0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-4 py-1.5 border border-primary text-primary rounded-md text-xs font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">
          Increase Size
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stake</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Stake $MGOLD to increase your Backpack size and your Speed skill. The unstaking process takes 4 weeks with 25% of the tokens unlocked every week.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.001"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground">$MGOLD</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Hive Engine Balance:</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setAmount(String(balance))}
            >
              {balance.toLocaleString(undefined, { maximumFractionDigits: 3 })} $MGOLD
            </button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/40">
            <div>
              <span className="text-primary">▲</span> Backpack Size: +{valid ? qty.toFixed(3) : "0.000"}, Total:{" "}
              <span className="text-foreground">{(nextStake + 1).toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
            </div>
            <div>
              <span className="text-primary">▲</span> Staked: <span className="text-foreground">{nextStake.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
            </div>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          variant="outline"
          disabled={!valid}
          onClick={() => {
            if (onStake(qty)) {
              setAmount("");
              setOpen(false);
            }
          }}
        >
          Confirm
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ContributeDialog({
  balance,
  favor,
  onContribute,
}: {
  balance: number;
  favor: number;
  onContribute: (qty: number) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const qty = Number(amount);
  const valid = Number.isFinite(qty) && qty > 0 && qty <= balance;
  const nextFavor = favor + (valid ? qty : 0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-4 py-1.5 border border-primary text-primary rounded-md text-xs font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">
          Gain Reputation
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contribute</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Burn $MGOLD to gain Reputation, increase your Critical Hit skill and unlock new dungeons.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.001"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground">$MGOLD</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Hive Engine Balance:</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setAmount(String(balance))}
            >
              {balance.toLocaleString(undefined, { maximumFractionDigits: 3 })} $MGOLD
            </button>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span className="text-primary">▲</span> Reputation: +{valid ? qty.toFixed(3) : "0.000"}, Total:{" "}
            <span className="text-foreground">{nextFavor.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          variant="outline"
          disabled={!valid}
          onClick={() => {
            if (onContribute(qty)) {
              setAmount("");
              setOpen(false);
            }
          }}
        >
          Confirm
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-1.5 border border-primary text-primary rounded-md text-xs font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-primary"
    >
      {children}
    </button>
  );
}

const battles = [
  { name: "lynliss7", dmg: 800, def: 360, dodge: "11.632%", stash: "207.050" },
  { name: "lynliss8", dmg: 850, def: 380, dodge: "11.828%", stash: "204.376" },
  { name: "lynliss6", dmg: 820, def: 380, dodge: "11.828%", stash: "190.712" },
  { name: "dnrxgwp062917", dmg: 360, def: 430, dodge: "4.975%", stash: "152.960" },
  { name: "shoheiohtani", dmg: 250, def: 430, dodge: "6.238%", stash: "150.978" },
  { name: "hivetrending", dmg: 702_510 / 1000, def: 468.591, dodge: "8.338%", stash: "153.931" },
  { name: "mttbrdks", dmg: 340, def: 440, dodge: "4.975%", stash: "148.005" },
  { name: "dnrxgwp1", dmg: 360, def: 430, dodge: "4.975%", stash: "147.525" },
  { name: "pexel", dmg: 350, def: 370, dodge: "3.975%", stash: "144.869" },
  { name: "technowizologist", dmg: 250, def: 430, dodge: "6.238%", stash: "147.441" },
  { name: "itzak", dmg: 350, def: 370, dodge: "5.738%", stash: "146.479" },
  { name: "therentaltest", dmg: 510, def: 430, dodge: "8.997%", stash: "150.704" },
  { name: "thatgermandude", dmg: 664.176, def: 350, dodge: "11.438%", stash: "154.375" },
  { name: "dml00000028", dmg: 350, def: 370, dodge: "3.975%", stash: "142.017" },
];

type SlotKey = "avatar" | "weapon" | "armor" | "ship" | "special";
type PrimaryAttr = "dodge" | "damage" | "defense" | "luck" | "crit" | "engineering";

const equipmentSlots: { slot: SlotKey; label: string; primary: PrimaryAttr; primaryLabel: string; unit: string }[] = [
  { slot: "avatar", label: "Avatar", primary: "dodge", primaryLabel: "Speed", unit: "%" },
  { slot: "weapon", label: "Weapon", primary: "damage", primaryLabel: "Attack", unit: "" },
  { slot: "armor", label: "Armor", primary: "defense", primaryLabel: "Defense", unit: "" },
  { slot: "ship", label: "Mount", primary: "damage", primaryLabel: "Attack", unit: "" },
  { slot: "special", label: "Accessory", primary: "luck", primaryLabel: "Luck", unit: "%" },
];

const RARITY_DOT: Record<import("@/mock/types").Rarity, string> = {
  common: "bg-muted-foreground/40",
  uncommon: "bg-emerald-400",
  rare: "bg-sky-400",
  epic: "bg-fuchsia-400",
  legendary: "bg-amber-400",
};
const RARITY_RING: Record<import("@/mock/types").Rarity, string> = {
  common: "border-muted-foreground/50",
  uncommon: "border-emerald-500/60",
  rare: "border-sky-500/60",
  epic: "border-fuchsia-500/60",
  legendary: "border-amber-500/60",
};

function fmt(n: number, digits = 3) {
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function Play() {
  const activeUser = useGameStore((s) => s.activeUser);
  const player = useGameStore((s) => s.players[activeUser] ?? null);
  const fetchPlayer = useGameStore((s) => s.fetchPlayer);

  // Seed player on mount / user change
  useEffect(() => {
    if (!player) void fetchPlayer(activeUser);
  }, [activeUser, player, fetchPlayer]);

  // Re-render every second so stash & timers tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);


  const router = useRouter();
  const pathname = router.state.location.pathname;
  const tabs = [
    { to: "/play" as const, label: "Board" },
    { to: "/planets" as const, label: "Dungeons" },
    { to: "/quests" as const, label: "Quests" },
  ];

  const stash = selectStash(player);
  const claims = selectClaims(player);
  const costs = selectUpgradeCosts(player);
  const xp = selectXpProgress(player);
  const eff = selectEffectiveStats(player);
  const stashPct = stash.size > 0 ? (stash.current / stash.size) * 100 : 0;
  const balance = player?.hiveEngineScrap ?? 0;

  const doClaim = () => {
    const r = claim(activeUser);
    if (r.ok) toast.success(`Claimed ${fmt(r.qty)} $MGOLD`);
    else toast.error(r.reason ?? "Claim failed");
  };
  const doUpgrade = (kind: "engineering" | "damage" | "defense") => {
    const r = upgrade(activeUser, kind);
    if (r.ok) toast.success(`Upgraded ${kind} for ${fmt(r.cost, 0)} $MGOLD`);
    else toast.error(r.reason ?? "Upgrade failed");
  };

  const attacks = selectAttacks(player);
  const citizens = useGameStore((s) => s.citizens);
  const opponents = useMemo(() => citizens.filter((c) => c !== activeUser), [citizens, activeUser]);
  const [target, setTarget] = useState(opponents[0] ?? "");
  useEffect(() => {
    if (!opponents.includes(target)) setTarget(opponents[0] ?? "");
  }, [opponents, target]);

  // Seed opponents so the raid table has live stats
  useEffect(() => {
    for (const name of opponents) {
      void fetchPlayer(name);
    }
  }, [opponents, fetchPlayer]);

  const doAttack = (name?: string) => {
    const opponent = name ?? target;
    if (!opponent) return;
    const r = attackPlayer(activeUser, opponent);
    if (r.ok) {
      if (r.dodged) toast.info(`${opponent} dodged your attack`);
      else toast.success(`Stole ${fmt(r.scrap ?? 0)} $MGOLD from ${opponent}`);
    } else {
      toast.error(r.reason ?? "Attack failed");
    }
  };


  function fmtDuration(ms: number) {
    if (ms <= 0) return "0s";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (

    <PageShell>
      <TooltipProvider delayDuration={150}>
      <div className="container-tc py-8">
        {/* Player header */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-wider text-foreground">{activeUser}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-primary text-lg">★ {xp.level}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-56 h-2 rounded-full bg-secondary overflow-hidden cursor-help">
                    <div className="h-full bg-primary" style={{ width: `${xp.pct}%` }} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>XP: {fmt(xp.current, 0)} / {fmt(xp.next, 0)} to next level</TooltipContent>
              </Tooltip>
              <InfoTip>Level progress. Earn XP by mining, battling, and completing quests.</InfoTip>
            </div>
          </div>
          <div className="inline-flex rounded-md border border-border overflow-hidden text-sm font-semibold tracking-widest">
            {tabs.map((t) => {
              const active = pathname === t.to;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`px-4 py-2 transition-colors ${
                    active
                      ? "bg-secondary/70 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Top stats row */}
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard
            title="Backpack"
            value={fmt(stash.current)}
            unit="$MGOLD"
            icon="🗒"
            valueTooltip={`Capacity ${fmt(stash.size)} • Rate ${fmt(stash.rate, 4)}/h`}
            titleAction={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/$user/claim_logs"
                    params={{ user: activeUser }}
                    aria-label="View claim logs"
                    className="inline-flex items-center justify-center w-5 h-5 rounded-sm border border-border/60 text-muted-foreground hover:border-primary hover:text-primary transition-colors normal-case tracking-normal"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" aria-hidden>
                      <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
                      <path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
                    </svg>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>View claim logs</TooltipContent>
              </Tooltip>
            }
            meta={
              <>
                Unclaimed balance: <span className="text-primary">{fmt(balance, 0)} $MGOLD</span>
                <div className="mt-1 h-1 rounded bg-secondary overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${stashPct}%` }} />
                </div>
              </>
            }
            action={
              <div className="flex items-center justify-between gap-3">
                <ActionButton onClick={doClaim} disabled={claims.current <= 0 || stash.current <= 0}>
                  Claim
                </ActionButton>
                <span className="text-xs text-muted-foreground">
                  Claim: <span className="text-foreground">{claims.current}</span> / 5
                </span>
              </div>
            }
          />
          <StatCard
            title="Backpack Size"
            value={fmt(stash.size)}
            icon="⇧"
            tooltip="Maximum $MGOLD your backpack can hold. Grows with Staked $MGOLD."
            valueTooltip={`Capacity: ${fmt(stash.size)} $MGOLD`}
            meta={
              (() => {
                const staked = player?.hiveEngineStake ?? 0;
                const dodgePct = pctFromTable(DODGE_STATS, staked) + sumEquippedAttr(player?.items, "dodge");
                const luckPct = pctFromTable(LUCK_STATS, staked) + sumEquippedAttr(player?.items, "luck");
                return (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary">+{dodgePct.toFixed(3)}%</span>
                      <span>Speed</span>
                      <StatModalIcon title="Speed Stats" rows={DODGE_STATS} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary">+{luckPct.toFixed(3)}%</span>
                      <span>Luck</span>
                      <StatModalIcon title="Luck Stats" rows={LUCK_STATS} />
                    </div>
                  </div>
                );
              })()
            }

            action={
              <StakeDialog
                balance={balance}
                staked={player?.hiveEngineStake ?? 0}
                onStake={(qty) => {
                  const r = stakeScrap(activeUser, qty);
                  if (r.ok) toast.success(`Staked ${fmt(qty, 3)} $MGOLD`);
                  else toast.error(r.reason ?? "Stake failed");
                  return r.ok;
                }}
              />
            }
          />
          <StatCard
            title="Reputation"
            value={fmt(player?.favor ?? 0)}
            icon="⚙"
            tooltip="Reputation grants passive bonuses. Gain it by contributing $MGOLD or completing quests."
            valueTooltip={`Total Reputation: ${fmt(player?.favor ?? 0, 0)}`}
            meta={
              (() => {
                const critPct = pctFromTable(CRIT_STATS, player?.favor ?? 0) + sumEquippedAttr(player?.items, "crit");
                return (
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary">+{critPct.toFixed(3)}%</span>
                    <span>Crit. Hit</span>
                    <StatModalIcon title="Critical Hit Stats" rows={CRIT_STATS} />
                  </div>
                );
              })()
            }

            action={
              <ContributeDialog
                balance={balance}
                favor={player?.favor ?? 0}
                onContribute={(qty) => {
                  const r = contributeFavor(activeUser, qty);
                  if (r.ok) toast.success(`Contributed ${fmt(qty, 3)} $MGOLD for Reputation`);
                  else toast.error(r.reason ?? "Contribution failed");
                  return r.ok;
                }}
              />
            }
          />
        </div>

        {/* Second stats row */}
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <StatCard
            title="Gathering"
            value={String(player?.engineering ?? 0)}
            icon="💡"
            tooltip="Gathering level determines your Mine Rate. Higher levels mine $MGOLD faster."
            valueTooltip={`Level ${player?.engineering ?? 0} — Mine Rate ${fmt(stash.rate, 4)}/h`}
            meta={
              <span className="inline-flex items-center gap-1.5">
                Mine Rate: {fmt(stash.rate, 4)}/h
                <UpgradeTableModal
                  title="Mine Rate Stats"
                  currentLevel={player?.engineering ?? 0}
                  step={1}
                  showCurrentValue
                  computeValue={engineeringRatePerHour}
                  computeCost={upgradeCost}
                  formatValue={(n) => `${n.toFixed(5)}/h`}
                  trigger={
                    <button
                      type="button"
                      aria-label="View Mine Rate Stats"
                      className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer"
                    >
                      ⓘ
                    </button>
                  }
                />
              </span>
            }
            action={
              <ActionButton onClick={() => doUpgrade("engineering")} disabled={balance < costs.engineering}>
                Upgrade for {fmt(costs.engineering, 0)} ↑
              </ActionButton>
            }
          />
          <StatCard
            title="Attack"
            value={fmt(eff.attack, 0)}
            icon="◎"
            tooltip="Total attack = base level × 10 + equipped weapon/ship damage bonuses. Base level = (Attack − equipment) / 10."
            valueTooltip={`Base ${eff.baseAttackLevel} × 10 = ${player?.damage ?? 0} + Equipment ${fmt(eff.equipment.damage, 2)}`}
            meta={
              <span className="inline-flex items-center gap-1.5">
                Upgrade Costs
                <UpgradeTableModal
                  title="Attack Stats"
                  currentLevel={player?.damage ?? 0}
                  step={10}
                  showCurrentValue={false}
                  computeValue={damageDefenseEffectivePrevTier}
                  formatValue={(n) => Math.round(n).toLocaleString()}
                  trigger={
                    <button
                      type="button"
                      aria-label="View Attack Stats"
                      className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer"
                    >
                      ⓘ
                    </button>
                  }
                />
              </span>
            }
            action={
              <ActionButton onClick={() => doUpgrade("damage")} disabled={balance < costs.damage}>
                Upgrade for {fmt(costs.damage, 0)} ↑
              </ActionButton>
            }
          />
          <StatCard
            title="Defense"
            value={fmt(eff.defense, 0)}
            icon="🛡"
            tooltip="Total defense = base level × 10 + equipped armor defense bonuses. Base level = (Defense − equipment) / 10."
            valueTooltip={`Base ${eff.baseDefenseLevel} × 10 = ${player?.defense ?? 0} + Equipment ${fmt(eff.equipment.defense, 2)}`}
            meta={
              <span className="inline-flex items-center gap-1.5">
                Upgrade Costs
                <UpgradeTableModal
                  title="Defense Stats"
                  currentLevel={player?.defense ?? 0}
                  step={10}
                  showCurrentValue={false}
                  computeValue={damageDefenseEffectivePrevTier}
                  formatValue={(n) => Math.round(n).toLocaleString()}
                  trigger={
                    <button
                      type="button"
                      aria-label="View Defense Stats"
                      className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer"
                    >
                      ⓘ
                    </button>
                  }
                />
              </span>
            }
            action={
              <ActionButton onClick={() => doUpgrade("defense")} disabled={balance < costs.defense}>
                Upgrade for {fmt(costs.defense, 0)} ↑
              </ActionButton>
            }
          />
        </div>


        <div className="bracket-frame bg-card/40 mt-4">

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs tracking-widest uppercase text-muted-foreground">
                Equipped Items
              </p>
              <p className="mt-1 text-3xl font-bold">
                <span className="text-primary">
                  {player
                    ? (["avatar", "weapon", "armor", "ship", "special"] as const).filter(
                        (k) => player.items?.[k]?.item_equipped,
                      ).length
                    : 0}
                </span>
                <span className="text-muted-foreground"> / 5</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs">
              <Link
                to="/$user/items"
                params={{ user: activeUser }}
                className="text-primary hover:underline inline-flex items-center gap-1.5"
              >
                <span aria-hidden>🔧</span> OPEN INVENTORY
              </Link>
              <Link to="/market" className="text-primary hover:underline inline-flex items-center gap-1.5">
                <span aria-hidden>▤</span> CHECK MARKET
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5 mt-6">
            {equipmentSlots.map((s) => {
              const slot = player?.items?.[s.slot];
              const equipped = !!slot?.item_equipped;
              const rarity = slot?.rarity;
              const attrVal = equipped ? slot?.attributes?.[s.primary] ?? 0 : 0;
              return (
                <div key={s.slot} className="flex items-start gap-3 text-sm">
                  <div
                    className={`relative w-12 h-12 shrink-0 rounded-md border ${
                      equipped && rarity ? RARITY_RING[rarity] : "border-border"
                    } bg-secondary/40 flex items-center justify-center overflow-hidden`}
                  >
                    {equipped ? (
                      <>
                        <span className="text-lg opacity-70" aria-hidden>
                          {s.slot === "avatar" ? "👤" : s.slot === "weapon" ? "🗡" : s.slot === "armor" ? "🛡" : s.slot === "ship" ? "🐎" : "✦"}
                        </span>
                        {rarity && (
                          <span
                            className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full ${RARITY_DOT[rarity]}`}
                            aria-label={rarity}
                          />
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground text-lg">⊘</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">{s.label}:</span>
                      {equipped ? (
                        <>
                          <Link
                            to="/$user/items"
                            params={{ user: activeUser }}
                            className="px-1.5 py-0.5 rounded bg-secondary/70 text-foreground font-mono text-xs hover:text-primary"
                          >
                            #{slot!.item_number}
                          </Link>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="px-2 py-0.5 rounded border border-primary/60 text-primary text-[10px] font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                Change ▾
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-40 p-2 text-xs text-muted-foreground">
                              No other items
                            </PopoverContent>
                          </Popover>
                        </>
                      ) : (
                        <span className="text-foreground font-semibold">NONE</span>
                      )}
                    </div>
                    {equipped && (
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                        <span>{s.primaryLabel}:</span>
                        <span>
                          +{attrVal.toFixed(4)}
                          {s.unit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Raids */}
        <div className="mt-10">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold tracking-wider text-foreground">Raids</h2>
              <div className="bracket-frame py-2 px-4 flex items-center gap-4 text-xs">
                <span className="text-foreground font-semibold">
                  Attacks: <span className="text-foreground">{attacks.current}</span>{" "}
                  <span className="text-muted-foreground">/ {attacks.max}</span>
                </span>
                <span className="text-muted-foreground">
                  Next: <span className="text-foreground">{fmtDuration(attacks.nextRegenMs)}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/$user/battle_logs"
                params={{ user: activeUser }}
                className="px-4 py-2 border border-border rounded-md text-xs font-semibold tracking-widest text-muted-foreground hover:text-foreground"
              >
                Logs
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs tracking-widest uppercase text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-3">Player</th>
                  <th className="text-right px-4 py-3">Attack</th>
                  <th className="text-right px-4 py-3">Defense</th>
                  <th className="text-right px-4 py-3">Speed</th>
                  <th className="text-right px-4 py-3">Backpack</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {opponents.map((name) => {
                  const opp = useGameStore.getState().players[name];
                  const oppEff = selectEffectiveStats(opp);
                  const oppStash = selectStash(opp);
                  return (
                    <tr
                      key={name}
                      className="border-b border-border/60 hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary" />
                          <span className="font-semibold text-foreground">{name}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-muted-foreground">{fmt(oppEff.attack, 0)}</td>
                      <td className="text-right px-4 py-3 text-muted-foreground">{fmt(oppEff.defense, 0)}</td>
                      <td className="text-right px-4 py-3 text-muted-foreground">
                        {oppEff.equipment.dodge.toFixed(2)}%
                      </td>
                      <td className="text-right px-4 py-3 text-muted-foreground">{fmt(oppStash.current)}</td>
                      <td className="text-right px-4 py-3">
                        <ActionButton
                          onClick={() => doAttack(name)}
                          disabled={attacks.current <= 0}
                        >
                          Attack
                        </ActionButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      </TooltipProvider>
    </PageShell>
  );
}