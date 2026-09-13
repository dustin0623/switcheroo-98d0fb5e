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
  Bug,
  ChevronDown,
  ChevronRight,
  Coins,
  Gem,
  Ghost,
  Globe,
  Hammer,
  Leaf,
  Lock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  Play,
  Rabbit,
  Search,
  Settings,
  Skull,
  Sparkles,
  Star,
  Store,
  Swords,
  Trophy,
  User,
} from "lucide-react";
import type { EnemyType } from "@/phaser/config/GameConfig";
import { FrogAvatar, ICONS, StarRow } from "@/components/game/game-modals";
import { getLevelProgress } from "@/features/game/experience";
import {
  EMPTY_PROGRESS,
  MAPS,
  bossKey,
  isMapUnlocked,
  loadProgress,
  saveProgress,
  type Progress,
} from "@/features/game/campaign";
import whisperwoodArt from "@/assets/world/whisperwood.jpg";
import dunesArt from "@/assets/world/dunes.jpg";
import sewersArt from "@/assets/world/sewers.jpg";
import neonCityArt from "@/assets/world/neon-city.jpg";
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
          ) : active === "world" ? (
            <WorldPage progress={progress} />
          ) : active === "book" ? (
            <BookPage progress={progress} onChange={setProgress} />
          ) : (
            <div className="mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center gap-2 p-8 text-center">
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

/** Map art thumbnails for the world list. */
const MAP_ART: Record<string, string> = {
  whisperwood: whisperwoodArt,
  dunes: dunesArt,
  sewers: sewersArt,
  city: neonCityArt,
};

/** Recommended account level per map slot. */
const recommendedLevel = (index: number) => index * 10 + 1;

/** Small enemy glyphs shown per map. */
const ENEMY_ICON: Record<EnemyType, typeof Ghost> = {
  grunt: Ghost,
  runner: Rabbit,
  brute: Bug,
  boss: Sparkles,
};

/** World page: "Choose your hunt" header plus the list of maps. */
function WorldPage({ progress }: { progress: Progress }) {
  const level = getLevelProgress(progress.xp).level;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-6">
      <header className="flex flex-col items-center gap-1 py-2 text-center">
        <h1 className="flex items-center gap-3 font-pixel text-[20px] text-white text-shadow">
          <Leaf className="h-5 w-5 text-shell-accent" aria-hidden />
          Choose your hunt
          <Leaf className="h-5 w-5 -scale-x-100 text-shell-accent" aria-hidden />
        </h1>
        <p className="text-[13px] text-white/80 text-shadow">
          Explore new areas, defeat stronger enemies, and earn better rewards.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {MAPS.map((map, i) => (
          <MapCard
            key={map.id}
            index={i}
            progress={progress}
            playerLevel={level}
            map={map}
          />
        ))}
      </div>
    </div>
  );
}

/** One map row: art left, info middle, rewards and action right. */
function MapCard({
  map,
  index,
  progress,
  playerLevel,
}: {
  map: (typeof MAPS)[number];
  index: number;
  progress: Progress;
  playerLevel: number;
}) {
  const navigate = useNavigate();
  const unlocked = isMapUnlocked(progress, map.id);
  const reqLevel = recommendedLevel(index);
  const levelLocked = playerLevel < reqLevel;
  const open = unlocked && !levelLocked;
  const cleared = progress.cleared[map.id] ?? 0;
  const stars = Math.min(3, Math.floor((cleared / map.stages) * 3));

  return (
    <OuterPanel className="flex items-stretch gap-4 p-2.5">
      {/* Art + map tag */}
      <div className="relative w-44 shrink-0 overflow-hidden">
        <img
          src={MAP_ART[map.id] ?? whisperwoodArt}
          alt={map.name}
          loading="lazy"
          width={768}
          height={512}
          className="h-full w-full object-cover"
        />
        <span className="absolute top-1.5 left-1.5">
          <PixelButton className="cursor-default px-2 py-1 text-[10px] font-semibold">
            MAP {index + 1}
          </PixelButton>
        </span>
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1">
        <p className="font-pixel text-[14px] text-panel-text text-shadow">{map.name}</p>
        <p className="text-[12px] text-panel-text/80">{map.blurb}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <InnerPanel className="flex items-center gap-1.5 bg-panel-header px-2 py-1">
            <span className="text-[11px] text-panel-text/70">Recommended</span>
            <span className="text-[11px] font-semibold text-panel-text">Lv. {reqLevel}+</span>
          </InnerPanel>
          <InnerPanel className="flex items-center gap-1.5 bg-panel-header px-2 py-1">
            <span className="text-[11px] text-panel-text/70">Enemies</span>
            <span className="flex items-center gap-1">
              {map.family.map((t) => {
                const Icon = ENEMY_ICON[t];
                return <Icon key={t} className="h-3.5 w-3.5 text-panel-text" aria-label={t} />;
              })}
            </span>
          </InnerPanel>
        </div>
      </div>

      {/* Rewards */}
      <div className="flex shrink-0 flex-col justify-center gap-1.5">
        <p className="text-[11px] text-panel-text/70">Rewards</p>
        <div className="flex items-center gap-1.5">
          <InnerPanel className="flex h-8 w-8 items-center justify-center bg-panel-header">
            <Coins className="h-4 w-4 text-currency" aria-label="gold" />
          </InnerPanel>
          <InnerPanel className="flex h-8 w-8 items-center justify-center bg-panel-header">
            <Leaf className="h-4 w-4 text-shell-accent" aria-label="materials" />
          </InnerPanel>
          <InnerPanel className="flex h-8 w-8 items-center justify-center bg-panel-header">
            <Gem className="h-4 w-4 text-frost" aria-label="gems" />
          </InnerPanel>
        </div>
      </div>

      {/* Stars + action */}
      <div className="flex w-40 shrink-0 flex-col items-end justify-between py-1">
        <span className="flex items-center gap-1 text-[12px] tabular-nums text-panel-text">
          <Star className="h-4 w-4 fill-gold text-gold" aria-label="stars" />
          {stars}/3
        </span>
        {open ? (
          <PixelButton
            variant="green"
            className="w-full px-4 py-2 text-[13px] font-semibold"
            onClick={() => navigate({ to: "/" })}
          >
            <span className="flex items-center justify-center gap-1.5">
              Enter
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          </PixelButton>
        ) : (
          <PixelButton disabled className="w-full px-4 py-2 text-[12px] font-semibold">
            <span className="flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Unlocks at Lv. {reqLevel}
            </span>
          </PixelButton>
        )}
      </div>
    </OuterPanel>
  );
}

// ---------------------------------------------------------------------------
// Book — the in-game encyclopedia.
// ---------------------------------------------------------------------------

type BookTabId = "overview" | "bestiary" | "armory" | "milestones" | "lore";

const BOOK_TABS: { id: BookTabId; label: string; icon: typeof BookOpen }[] = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "bestiary", label: "Bestiary", icon: Skull },
  { id: "armory", label: "Armory", icon: Swords },
  { id: "milestones", label: "Milestones", icon: Trophy },
  { id: "lore", label: "Lore", icon: BookOpen },
];

/** Rarity text color for book entries. */
const RARITY_TEXT: Record<BowRarity, string> = {
  Common: "text-slate-300",
  Uncommon: "text-emerald-400",
  Rare: "text-sky-400",
  Epic: "text-purple-400",
  Legendary: "text-amber-400",
};

const BOSS_RARITY: BowRarity[] = ["Rare", "Rare", "Epic", "Legendary"];

interface BeastDef {
  key: string;
  name: string;
  rarity: BowRarity;
  icon: typeof Ghost;
}

/** Every bestiary entry: the three field enemies plus each map's boss. */
const BESTIARY: BeastDef[] = [
  { key: "grunt", name: "Grunt", rarity: "Common", icon: Ghost },
  { key: "runner", name: "Runner", rarity: "Common", icon: Rabbit },
  { key: "brute", name: "Brute", rarity: "Uncommon", icon: Bug },
  ...MAPS.map((m, i) => ({
    key: bossKey(m.id),
    name: m.boss,
    rarity: BOSS_RARITY[i] ?? "Rare",
    icon: Sparkles,
  })),
];

interface MilestoneDef {
  id: string;
  name: string;
  desc: string;
  target: number;
  value: (p: Progress) => number;
  reward: number;
  icon: typeof Skull;
}

const MILESTONES: MilestoneDef[] = [
  {
    id: "first-warden",
    name: "First Warden",
    desc: "Defeat your first boss.",
    target: 1,
    value: (p) => p.bosses,
    reward: 100,
    icon: Skull,
  },
  {
    id: "thousand-arrows",
    name: "Thousand Arrows",
    desc: "Defeat 1,000 enemies.",
    target: 1000,
    value: (p) => p.kills,
    reward: 500,
    icon: Swords,
  },
  {
    id: "whisperwood-cleared",
    name: "Whisperwood Cleared",
    desc: "Clear all 5 stages of Whisperwood.",
    target: 5,
    value: (p) => p.cleared["whisperwood"] ?? 0,
    reward: 250,
    icon: Leaf,
  },
];

/** Book page: banner, tabs, and the overview/section content. */
function BookPage({
  progress,
  onChange,
}: {
  progress: Progress;
  onChange: (next: Progress) => void;
}) {
  const [tab, setTab] = useState<BookTabId>("overview");

  const seenList = progress.seen ?? [];
  const claimedList = progress.claimed ?? [];
  const seen = BESTIARY.filter((b) => seenList.includes(b.key)).length;
  const owned = BOW_RARITIES.filter((r) => ownsBow(progress, r)).length;
  const done = MILESTONES.filter(
    (m) => claimedList.includes(m.id) || m.value(progress) >= m.target,
  ).length;

  const claim = (m: MilestoneDef) => {
    const next: Progress = {
      ...progress,
      gold: progress.gold + m.reward,
      claimed: [...claimedList, m.id],
    };
    saveProgress(next);
    onChange(next);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 pb-6">
      {/* Banner */}
      <OuterPanel className="bg-panel-header px-4 py-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 shrink-0 text-panel-text" />
          <div className="min-w-0">
            <h1 className="font-pixel text-[16px] text-panel-text text-shadow">The Book</h1>
            <p className="text-[13px] text-panel-text/80">
              Knowledge is power. Discover creatures, gear, worlds and your journey in ARCOON.
            </p>
          </div>
        </div>
      </OuterPanel>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {BOOK_TABS.map((t) => (
          <PixelButton
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx("px-4 py-1.5 text-[13px]", tab !== t.id && "opacity-70")}
          >
            <span className="flex items-center gap-1.5">
              <t.icon className="h-4 w-4" />
              {t.label}
            </span>
          </PixelButton>
        ))}
      </div>

      {tab === "lore" ? (
        <LorePanel />
      ) : (
        <>
          {(tab === "overview" || tab === "bestiary") && (
            <OuterPanel className="bg-panel-description p-3">
              <BookSectionHeader
                icon={<Skull className="h-5 w-5 text-emerald-400" />}
                title="Bestiary"
                subtitle="Study the creatures of the Arc. Learn their patterns and rewards."
                count={`${seen} / ${BESTIARY.length}`}
                countLabel="Discovered"
                onViewAll={() => setTab("bestiary")}
              />
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {BESTIARY.map((b) => (
                  <BeastCard key={b.key} beast={b} seen={seenList.includes(b.key)} />
                ))}
              </div>
            </OuterPanel>
          )}

          {(tab === "overview" || tab === "armory") && (
            <OuterPanel className="bg-panel-description p-3">
              <BookSectionHeader
                icon={<Swords className="h-5 w-5 text-amber-300" />}
                title="Armory Index"
                subtitle="Collect and upgrade powerful gear."
                count={`${owned} / ${BOW_RARITIES.length}`}
                countLabel="Discovered"
                onViewAll={() => setTab("armory")}
              />
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {BOW_RARITIES.map((r) => (
                  <IndexBowCard key={r} rarity={r} owned={ownsBow(progress, r)} />
                ))}
              </div>
            </OuterPanel>
          )}

          {(tab === "overview" || tab === "milestones") && (
            <OuterPanel className="bg-panel-description p-3">
              <BookSectionHeader
                icon={<Trophy className="h-5 w-5 text-sky-300" />}
                title="Milestones"
                subtitle="Complete challenges and earn rewards."
                count={`${done} / ${MILESTONES.length}`}
                countLabel="Completed"
                onViewAll={() => setTab("milestones")}
              />
              <div className="mt-3 flex flex-col gap-2">
                {MILESTONES.map((m) => (
                  <MilestoneRow key={m.id} milestone={m} progress={progress} onClaim={claim} />
                ))}
              </div>
            </OuterPanel>
          )}
        </>
      )}
    </div>
  );
}

/** Section header: icon, title, subtitle, count chip and View All button. */
function BookSectionHeader({
  icon,
  title,
  subtitle,
  count,
  countLabel,
  onViewAll,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: string;
  countLabel: string;
  onViewAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="font-pixel text-[13px] text-panel-text text-shadow">{title}</p>
        <p className="text-[12px] text-panel-text/70">{subtitle}</p>
      </div>
      <InnerPanel className="bg-panel-header px-3 py-1.5 text-center">
        <p className="text-[12px] font-semibold tabular-nums text-panel-text">{count}</p>
        <p className="text-[10px] text-panel-text/60">{countLabel}</p>
      </InnerPanel>
      <PixelButton variant="green" onClick={onViewAll} className="px-3 py-1.5 text-[12px] font-semibold">
        <span className="flex items-center gap-1">
          View All
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </PixelButton>
    </div>
  );
}

/** One bestiary entry; unseen entries show as a silhouette with a "?". */
function BeastCard({ beast, seen }: { beast: BeastDef; seen: boolean }) {
  const Icon = beast.icon;
  return (
    <InnerPanel className="flex flex-col items-center gap-1.5 bg-panel-header px-2 py-3 text-center">
      <span className="flex h-12 w-12 items-center justify-center">
        {seen ? (
          <Icon className={clsx("h-9 w-9", RARITY_TEXT[beast.rarity])} />
        ) : (
          <span className="font-pixel text-[20px] text-panel-text/40">?</span>
        )}
      </span>
      <p className="text-[12px] font-semibold text-panel-text">{seen ? beast.name : "???"}</p>
      <p className={clsx("text-[11px]", seen ? RARITY_TEXT[beast.rarity] : "text-panel-text/40")}>
        {seen ? beast.rarity : beast.rarity}
      </p>
    </InnerPanel>
  );
}

/** One armory index entry; locked bows show as a lock silhouette. */
function IndexBowCard({ rarity, owned }: { rarity: BowRarity; owned: boolean }) {
  const def = BOWS[rarity];
  return (
    <InnerPanel className="flex flex-col items-center gap-1.5 bg-panel-header px-2 py-3 text-center">
      <span className="flex h-12 w-12 items-center justify-center">
        {owned ? (
          <img src={ICONS.bow} alt={def.name} className="h-10 w-10 object-contain" />
        ) : (
          <Lock className="h-7 w-7 text-panel-text/40" />
        )}
      </span>
      <p className="text-[12px] font-semibold text-panel-text">{owned ? def.name : def.name}</p>
      <p className={RARITY_TEXT[rarity] + " text-[11px]"}>{rarity}</p>
    </InnerPanel>
  );
}

/** One milestone row: icon, name, progress bar, reward and claim action. */
function MilestoneRow({
  milestone,
  progress,
  onClaim,
}: {
  milestone: MilestoneDef;
  progress: Progress;
  onClaim: (m: MilestoneDef) => void;
}) {
  const value = Math.min(milestone.value(progress), milestone.target);
  const complete = value >= milestone.target;
  const claimed = (progress.claimed ?? []).includes(milestone.id);
  const Icon = milestone.icon;

  return (
    <InnerPanel className="flex flex-wrap items-center gap-3 bg-panel-header px-3 py-2.5">
      <Icon className="h-6 w-6 shrink-0 text-panel-text" />
      <div className="min-w-40 flex-1">
        <p className="text-[13px] font-semibold text-panel-text">{milestone.name}</p>
        <p className="text-[11px] text-panel-text/60">{milestone.desc}</p>
      </div>
      <div className="flex w-48 items-center gap-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/20">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.round((value / milestone.target) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-panel-text/80">
          {value.toLocaleString()} / {milestone.target.toLocaleString()}
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-[12px] tabular-nums text-panel-text">
        <Coins className="h-4 w-4 text-currency" />
        {milestone.reward.toLocaleString()}
      </span>
      {claimed ? (
        <PixelButton disabled className="w-28 px-3 py-1.5 text-[12px] font-semibold">
          Claimed
        </PixelButton>
      ) : complete ? (
        <PixelButton
          variant="green"
          onClick={() => onClaim(milestone)}
          className="w-28 px-3 py-1.5 text-[12px] font-semibold"
        >
          Claim
        </PixelButton>
      ) : (
        <PixelButton disabled className="w-28 px-3 py-1.5 text-[12px] font-semibold">
          In Progress
        </PixelButton>
      )}
    </InnerPanel>
  );
}

/** Lore tab: short flavor text for each world. */
function LorePanel() {
  return (
    <OuterPanel className="bg-panel-description p-3">
      <BookSectionHeader
        icon={<BookOpen className="h-5 w-5 text-panel-text" />}
        title="Lore"
        subtitle="Tales of the Arc and the worlds it touches."
        count={`${MAPS.length} / ${MAPS.length}`}
        countLabel="Entries"
        onViewAll={() => {}}
      />
      <div className="mt-3 flex flex-col gap-2.5">
        {MAPS.map((m) => (
          <InnerPanel key={m.id} className="bg-panel-header px-3 py-2.5">
            <p className="font-pixel text-[12px] text-panel-text text-shadow">{m.name}</p>
            <p className="mt-1 text-[12px] text-panel-text/75">
              {m.blurb} It is said the {m.boss} still guards its deepest paths.
            </p>
          </InnerPanel>
        ))}
      </div>
    </OuterPanel>
  );
}
