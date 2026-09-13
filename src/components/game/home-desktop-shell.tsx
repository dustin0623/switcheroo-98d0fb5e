/**
 * HomeDesktopShell — the wide-screen home shell for ARCOON.
 * A fixed left sidebar (logo + navigation) and a top header bar with the
 * player identity (avatar, name, level, XP) and wallet on the right.
 * The main content area sits to the right of the sidebar, under the header.
 */
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "@tanstack/react-router";
import {
  Backpack,
  BookOpen,
  ChevronDown,
  Coins,
  Gem,
  Globe,
  Hammer,
  Lock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  Search,
  Settings,
  Store,
  Swords,
  User,
} from "lucide-react";
import { FrogAvatar, ICONS, StarRow } from "@/components/game/game-modals";
import { getLevelProgress } from "@/features/game/experience";
import { EMPTY_PROGRESS, loadProgress, type Progress } from "@/features/game/campaign";
import { BOWS, BOW_RARITIES, bowStats, type BowRarity } from "@/features/game/bow";
import { buyBow, equipBow, ownsBow, starsOf } from "@/features/game/armory";
import { InnerPanel, OuterPanel, PixelButton, frame, lightBorder } from "@/components/ui/pixel-panel";

type NavId = "world" | "armory" | "crafting" | "book" | "character" | "marketplace";

const NAV: { id: NavId; label: string; icon: typeof Globe; badge?: boolean }[] = [
  { id: "world", label: "World", icon: Globe },
  { id: "armory", label: "Armory", icon: Backpack },
  { id: "crafting", label: "Crafting", icon: Hammer },
  { id: "book", label: "Book", icon: BookOpen },
  { id: "character", label: "Character", icon: User },
  { id: "marketplace", label: "Marketplace", icon: Store },
];

export default function HomeDesktopShell() {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [active, setActive] = useState<NavId>("world");

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  return (
    <div className="fantasy-shell relative flex h-full w-full overflow-hidden bg-ink-900 font-body text-shell-text">
      <div className="forest-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="ember-glow pointer-events-none absolute inset-0" aria-hidden />

      <Sidebar active={active} onChange={setActive} progress={progress} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopHeader progress={progress} />
        <main className="relative flex-1 overflow-y-auto p-4">
          {active === "armory" ? (
            <ArmoryPage progress={progress} onChange={setProgress} />
          ) : (
            <div className="fantasy-card mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="font-pixel text-[12px] text-white">
                {NAV.find((n) => n.id === active)?.label}
              </p>
              <p className="text-[13px] text-shell-muted">
                This section is coming soon. The shell is ready — pick a destination from the
                sidebar.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/** Left rail: ARCOON wordmark, navigation list, and the player identity footer. */
function Sidebar({
  active,
  onChange,
  progress,
}: {
  active: NavId;
  onChange: (id: NavId) => void;
  progress: Progress;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "relative z-10 flex shrink-0 flex-col border-r border-ink-line/60 bg-transparent transition-[width] duration-200",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-5 pb-4">
        {!collapsed && (
          <p className="flex-1 text-center font-pixel text-[18px] tracking-wide text-white text-shadow">
            ARCOON
          </p>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={clsx(
            "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-black/30 hover:text-white",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <div className="fantasy-rule w-full" aria-hidden />

      <nav
        aria-label="Main navigation"
        className={clsx("flex-1 space-y-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")}
      >
        {NAV.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-pressed={isActive}
              title={collapsed ? item.label : undefined}
              className={clsx(
                "relative flex w-full cursor-pointer items-center rounded-md py-2.5 text-left text-[14px] text-white transition-colors",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive
                  ? "bg-[#8f5535] font-semibold text-white shadow-card ring-1 ring-black/20"
                  : "hover:bg-black/30 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
              {item.badge && !collapsed && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-rose" aria-hidden />
              )}
              {item.badge && collapsed && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose" aria-hidden />
              )}
            </button>
          );
        })}
      </nav>

      <div className="fantasy-rule w-full" aria-hidden />
      <PlayerFooter progress={progress} collapsed={collapsed} />
    </aside>
  );
}

/** Sidebar footer: avatar, name, level, XP bar, and a settings popover with sign out. */
function PlayerFooter({ progress, collapsed }: { progress: Progress; collapsed: boolean }) {
  const level = getLevelProgress(progress.xp);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (collapsed) {
    return (
      <div ref={rootRef} className="relative flex flex-col items-center gap-2 px-2 py-3">
        <FrogAvatar className="h-9 w-9 rounded-full ring-2 ring-shell-accent/70" />
        <button
          type="button"
          aria-label="Settings"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-black/30"
        >
          <Settings className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute bottom-2 left-full z-30 ml-2 w-40">
            <SignOutMenu
              onSignOut={() => {
                setOpen(false);
                navigate({ to: "/" });
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative px-3 py-3">
      <div className="flex items-center gap-2.5">
        <FrogAvatar className="h-10 w-10 shrink-0 rounded-full ring-2 ring-shell-accent/70" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <p className="truncate font-pixel text-[11px] text-white text-shadow">ARCOON</p>
            <p className="shrink-0 font-pixel text-[9px] text-white">Lv.{level.level}</p>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/20">
              <div
                className="h-full rounded-full bg-shell-accent-strong"
                style={{ width: `${Math.round(level.ratio * 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] whitespace-nowrap tabular-nums text-white/80">
              {level.maxed ? "MAX" : `${level.into}/${level.needed}`}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Settings"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-black/30"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="absolute right-3 bottom-full z-30 mb-2 w-44">
          <SignOutMenu
            onSignOut={() => {
              setOpen(false);
              navigate({ to: "/" });
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Popover panel shown from the sidebar settings button. */
function SignOutMenu({ onSignOut }: { onSignOut: () => void }) {
  return (
    <OuterPanel className="bg-panel-header p-1.5">
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-[13px] text-panel-text transition-colors hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </OuterPanel>
  );
}

/** Top bar: wallet and actions on the right. */
function TopHeader({ progress }: { progress: Progress }) {
  return (
    <header className="relative z-10 flex shrink-0 items-center justify-end gap-2 border-b border-ink-line/60 bg-transparent px-4 py-2.5">
      <CurrencyPill icon={<Coins className="h-4 w-4 text-currency" />} value={progress.gold} />
      <CurrencyPill icon={<Gem className="h-4 w-4 text-frost" />} value={25} />
      <HeaderIconButton label="Mail">
        <Mail className="h-5 w-5" />
      </HeaderIconButton>
    </header>
  );
}

function CurrencyPill({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-ink-700 px-3 py-1.5 ring-1 ring-ink-line">
      {icon}
      <span className="text-[14px] tabular-nums text-shell-text text-shadow">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function HeaderIconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-ink-700 text-shell-muted ring-1 ring-ink-line transition-colors hover:bg-ink-600 hover:text-shell-text"
    >
      {children}
    </button>
  );
}

/** Rarity badge palette for armory cards. */
const RARITY_BADGE: Record<BowRarity, string> = {
  Common: "bg-slate-500",
  Uncommon: "bg-emerald-600",
  Rare: "bg-blue-600",
  Epic: "bg-purple-600",
  Legendary: "bg-amber-500",
};

type ArmoryTabId = "bows" | "items";

/** Armory page: banner, Bows | Items tabs, rarity filter, search and gear cards. */
function ArmoryPage({
  progress,
  onChange,
}: {
  progress: Progress;
  onChange: (next: Progress) => void;
}) {
  const [tab, setTab] = useState<ArmoryTabId>("bows");
  const [rarity, setRarity] = useState<BowRarity | "all">("all");
  const [query, setQuery] = useState("");

  const bows = BOW_RARITIES.filter((r) => rarity === "all" || r === rarity).filter((r) =>
    BOWS[r].name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      {/* Banner */}
      <OuterPanel className="bg-panel-header px-4 py-3">
        <div className="flex items-center gap-3">
          <Swords className="h-8 w-8 shrink-0 text-panel-text" />
          <div className="min-w-0">
            <h1 className="font-pixel text-[16px] text-panel-text text-shadow">Armory</h1>
            <p className="text-[13px] text-panel-text/80">
              Equip powerful gear and prepare for your next adventure.
            </p>
          </div>
        </div>
      </OuterPanel>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "bows", label: "Bows" },
            { id: "items", label: "Items" },
          ] as const
        ).map((t) => (
          <PixelButton
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx("px-4 py-1.5 text-[13px]", tab !== t.id && "opacity-70")}
          >
            {t.label}
          </PixelButton>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value as BowRarity | "all")}
              aria-label="Filter by rarity"
              style={frame(lightBorder, "5px", "15px")}
              className="cursor-pointer appearance-none bg-panel-header py-1.5 pr-8 pl-3 text-[13px] text-panel-text text-shadow outline-none"
            >
              <option value="all">Rarity</option>
              {BOW_RARITIES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-panel-text/70" />
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-panel-text/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item..."
              aria-label="Search items"
              style={frame(lightBorder, "5px", "15px")}
              className="w-44 bg-panel-header py-1.5 pr-3 pl-9 text-[13px] text-panel-text text-shadow outline-none placeholder:text-panel-text/50"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {tab === "items" ? (
        <OuterPanel className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <p className="font-pixel text-[12px] text-panel-text">Items</p>
          <p className="text-[13px] text-panel-text/70">
            Consumables and trinkets are coming soon.
          </p>
        </OuterPanel>
      ) : bows.length === 0 ? (
        <OuterPanel className="p-10 text-center text-[13px] text-panel-text/70">
          No bows match your search.
        </OuterPanel>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          {bows.map((r) => (
            <BowCard key={r} rarity={r} progress={progress} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One gear card: bow art left, stats middle, action button right. */
function BowCard({
  rarity,
  progress,
  onChange,
}: {
  rarity: BowRarity;
  progress: Progress;
  onChange: (next: Progress) => void;
}) {
  const def = BOWS[rarity];
  const owned = ownsBow(progress, rarity);
  const stars = starsOf(progress, rarity);
  const stats = bowStats(rarity, Math.max(stars, 1));
  const equipped = progress.equipped === rarity;

  return (
    <OuterPanel className="flex items-center gap-4 p-2.5">
      {/* Art */}
      <InnerPanel className="flex h-20 w-20 shrink-0 items-center justify-center bg-panel-header">
        <img src={ICONS.bow} alt={def.name} className="h-12 w-12 object-contain" />
      </InnerPanel>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-pixel text-[13px] text-panel-text text-shadow">{def.name}</p>
          <span
            className={clsx(
              "rounded-sm px-2 py-0.5 text-[11px] font-semibold text-white",
              RARITY_BADGE[rarity],
            )}
          >
            {rarity}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-[12px] tabular-nums text-panel-text/85">
            {stats.damage} dmg · {stats.rangeTiles} tiles · {(1000 / stats.fireRateMs).toFixed(1)}/s
          </p>
          <StarRow stars={owned ? stars : 0} />
        </div>
        <p className="mt-1 truncate text-[12px] text-panel-text/60">
          {owned
            ? equipped
              ? "Currently equipped for your runs."
              : "Owned — ready to equip."
            : `Unlocks for ${def.unlockCost.toLocaleString()} gold.`}
        </p>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {equipped ? (
          <PixelButton disabled className="px-5 py-2 text-[13px] font-semibold">
            Equipped
          </PixelButton>
        ) : owned ? (
          <PixelButton
            className="px-5 py-2 text-[13px] font-semibold"
            onClick={() => onChange(equipBow(progress, rarity))}
          >
            Equip
          </PixelButton>
        ) : (
          <PixelButton
            variant="green"
            disabled={progress.gold < def.unlockCost}
            onClick={() => onChange(buyBow(progress, rarity))}
            className="px-5 py-2 text-[13px] font-semibold"
          >
            <span className="flex items-center gap-1.5">
              {progress.gold < def.unlockCost ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Coins className="h-4 w-4 text-currency" />
              )}
              {def.unlockCost.toLocaleString()}
            </span>
          </PixelButton>
        )}
      </div>
    </OuterPanel>
  );
}
