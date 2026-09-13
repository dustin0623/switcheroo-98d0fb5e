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
  Anvil,
  BarChart3,
  Backpack,
  BookOpen,
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gem,
  Ghost,
  Globe,
  Hammer,
  HardHat,
  Heart,
  Info,
  Footprints,
  Leaf,
  Lock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  Play,
  Rabbit,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Shirt,
  ShoppingCart,
  Skull,
  Sparkles,
  Star,
  Store,
  Swords,
  Trophy,
  User,
  X,
  Zap,
} from "lucide-react";
import type { EnemyType } from "@/phaser/config/GameConfig";
import { FrogAvatar, ICONS, LevelBadge } from "@/components/game/game-modals";
import { getPlayerLevel, levelUpPlayer } from "@/features/game/experience";
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
import { BOWS, BOW_RARITIES, MAX_GEAR_LEVEL, bowStats, type BowRarity } from "@/features/game/bow";
import {
  GEAR_SLOTS,
  SLOT_LABEL,
  buyGear,
  equipGear,
  equippedOf,
  gearBonus,
  gearName,
  gearUnlockCost,
  levelOf,
  levelUpGear,
  levelUpShardCost,
  owns,
  salvageGear,
  salvageValue,
  totalGearBonus,
  type GearSlot,
} from "@/features/game/equipment";

import { InnerPanel, OuterPanel, PixelButton, darkBorder, frame, lightBorder } from "@/components/ui/pixel-panel";

type NavId = "world" | "armory" | "crafting" | "book" | "character" | "marketplace";

const NAV: { id: NavId; label: string; icon: typeof Globe; badge?: boolean }[] = [
  { id: "world", label: "World", icon: Globe },
  { id: "armory", label: "Inventory", icon: Backpack },
  { id: "crafting", label: "Enchantment", icon: Hammer },
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

  /** Persist any progress change coming from a page. */
  const commit = (next: Progress) => {
    saveProgress(next);
    setProgress(next);
  };


  return (
    <div className="fantasy-shell relative flex h-full w-full overflow-hidden bg-ink-900 font-body text-shell-text">
      <div className="forest-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="ember-glow pointer-events-none absolute inset-0" aria-hidden />

      <Sidebar active={active} onChange={setActive} progress={progress} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopHeader progress={progress} />
        <main className="relative flex-1 overflow-y-auto p-4">
          {active === "armory" ? (
            <InventoryPage progress={progress} onChange={commit} onNavigate={setActive} />
          ) : active === "world" ? (
            <WorldPage progress={progress} />
          ) : active === "book" ? (
            <BookPage progress={progress} onChange={commit} />
          ) : active === "crafting" ? (
            <EnchantmentPage progress={progress} onChange={commit} />
          ) : active === "character" ? (
            <CharacterPage progress={progress} onChange={commit} />
          ) : (
            <MarketplacePage progress={progress} onChange={commit} />
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
  const level = getPlayerLevel(progress);
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
      <CurrencyPill icon={<Gem className="h-4 w-4 text-purple-300" />} value={progress.shards} />
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

/** One inventory item: a gear slot + rarity pair. */
type InvItem = { slot: GearSlot; rarity: BowRarity };

const SLOT_ICON: Record<GearSlot, typeof Swords> = {
  weapon: Swords,
  helmet: HardHat,
  armor: Shirt,
  boots: Footprints,
};

/** Art for any piece of gear. */
function GearArt({ slot, className }: { slot: GearSlot; className?: string }) {
  if (slot === "weapon") {
    return <img src={ICONS.bow} alt="" className={clsx("object-contain", className)} />;
  }
  const Icon = SLOT_ICON[slot];
  return <Icon className={clsx("text-panel-text/80", className)} />;
}

/** Stat lines for any piece of gear at a level. */
function gearStatLines(slot: GearSlot, rarity: BowRarity, level: number) {
  if (slot === "weapon") {
    const s = bowStats(rarity, Math.max(level, 1));
    return [
      { icon: <Swords className="h-4 w-4 text-panel-text/80" />, label: "Attack", value: `${s.damage}` },
      { icon: <Zap className="h-4 w-4 text-gold" />, label: "Attack Speed", value: `${(1000 / s.fireRateMs).toFixed(1)}/s` },
      { icon: <Globe className="h-4 w-4 text-panel-text/80" />, label: "Range", value: `${s.rangeTiles} tiles` },
    ];
  }
  const b = gearBonus(slot, rarity, Math.max(level, 1));
  const lines = [
    { icon: <Heart className="h-4 w-4 text-rose" />, label: "Max HP", value: `+${b.hp}` },
    { icon: <Shield className="h-4 w-4 text-panel-text/80" />, label: "Defense", value: `+${b.defense}` },
  ];
  if (b.moveSpeed > 0) {
    lines.push({ icon: <Zap className="h-4 w-4 text-gold" />, label: "Move Speed", value: `+${b.moveSpeed}` });
  }
  return lines;
}

const INV_TABS: { id: GearSlot | "all"; label: string; icon: typeof Swords }[] = [
  { id: "all", label: "All", icon: Backpack },
  { id: "weapon", label: "Weapons", icon: Swords },
  { id: "helmet", label: "Helmets", icon: HardHat },
  { id: "armor", label: "Armor", icon: Shirt },
  { id: "boots", label: "Boots", icon: Footprints },
];

/** Full-width illustrated page banner. The uploaded artwork already has its own border design, so no UI panel is applied. */
function PageBanner({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="block h-auto w-full rounded-md object-cover" />;
}

/** Inventory page: banner, category tabs, item grid and a detail drawer. */
function InventoryPage({
  progress,
  onChange,
  onNavigate,
}: {
  progress: Progress;
  onChange: (next: Progress) => void;
  onNavigate: (id: NavId) => void;
}) {
  const [tab, setTab] = useState<GearSlot | "all">("all");
  const [rarity, setRarity] = useState<BowRarity | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InvItem>({ slot: "weapon", rarity: progress.equipped });
  const [open, setOpen] = useState(false);

  const all: InvItem[] = GEAR_SLOTS.flatMap((slot) =>
    BOW_RARITIES.map((r) => ({ slot, rarity: r })),
  );
  const items = all
    .filter((it) => tab === "all" || it.slot === tab)
    .filter((it) => rarity === "all" || it.rarity === rarity)
    .filter((it) => gearName(it.slot, it.rarity).toLowerCase().includes(query.trim().toLowerCase()));

  const name = gearName(selected.slot, selected.rarity);
  const level = levelOf(progress, selected.slot, selected.rarity);
  const owned = level > 0;
  const price = gearUnlockCost(selected.slot, selected.rarity);
  const equipped = equippedOf(progress, selected.slot) === selected.rarity;
  const canSalvage = owned && !equipped && !(selected.slot === "weapon" && selected.rarity === "Common");
  const salvage = salvageValue(selected.rarity, Math.max(level, 1));
  const ownedCount = all.filter((it) => owns(progress, it.slot, it.rarity)).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-6">
      {/* Banner */}
      <PageBanner src="/assets/inventory_banner.png" alt="Inventory banner" />

      {/* Category tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {INV_TABS.map((t) => (
          <PixelButton
            key={t.id}
            variant={tab === t.id ? "green" : "default"}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-1.5 text-[13px] font-semibold"
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </PixelButton>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-panel-text/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items..."
            aria-label="Search items"
            style={frame(lightBorder, "5px", "15px")}
            className="w-full bg-panel-header py-1.5 pr-3 pl-9 text-[13px] text-panel-text text-shadow outline-none placeholder:text-panel-text/50"
          />
        </div>
        <span className="text-[13px] tabular-nums text-white text-shadow">
          {ownedCount} / {all.length}
        </span>
      </div>

      {/* Grid */}
      <OuterPanel className="bg-panel-description p-3">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {items.map((it) => {
            const lvl = levelOf(progress, it.slot, it.rarity);
            const isSelected = selected.slot === it.slot && selected.rarity === it.rarity;
            return (
              <button
                key={`${it.slot}:${it.rarity}`}
                type="button"
                onClick={() => {
                  setSelected(it);
                  setOpen(true);
                }}
                aria-label={gearName(it.slot, it.rarity)}
                className="cursor-pointer"
              >
                <InnerPanel
                  className={clsx(
                    "relative flex aspect-square items-center justify-center bg-panel-header",
                    lvl === 0 && "opacity-45",
                    isSelected && "ring-2 ring-emerald-400",
                  )}
                >
                  <GearArt slot={it.slot} className="h-8 w-8" />
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-panel-text">
                    {lvl > 0 ? `Lv. ${lvl}` : <Lock className="h-3 w-3" />}
                  </span>
                </InnerPanel>
              </button>
            );
          })}
          {Array.from({ length: 8 }, (_, i) => (
            <InnerPanel key={`empty-${i}`} className="aspect-square bg-panel-header/40" />
          ))}
        </div>
      </OuterPanel>

      {/* Detail drawer */}
      <div
        className={clsx(
          "fixed inset-0 z-50 transition-opacity duration-200",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close item details"
          onClick={() => setOpen(false)}
          className="absolute inset-0 cursor-pointer bg-black/50"
        />
        <div
          role="dialog"
          aria-label={`${name} details`}
          className={clsx(
            "absolute top-0 right-0 h-full w-full max-w-sm transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <OuterPanel className="flex h-full flex-col overflow-y-auto bg-panel-description p-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="order-last -mr-1 -mt-1 ml-auto cursor-pointer p-1 text-panel-text/70 transition-colors hover:text-panel-text"
              >
                <X className="h-5 w-5" />
              </button>
              <InnerPanel className="flex h-20 w-20 shrink-0 items-center justify-center bg-panel-header">
                <GearArt slot={selected.slot} className="h-11 w-11" />
              </InnerPanel>
              <div className="min-w-0">
                <p className="font-pixel text-[13px] text-panel-text text-shadow">{name}</p>
                <span
                  className={clsx(
                    "mt-1 inline-block rounded-sm px-2 py-0.5 text-[11px] font-semibold text-white",
                    RARITY_BADGE[selected.rarity],
                  )}
                >
                  {selected.rarity}
                </span>
                <p className="mt-1 text-[12px] text-panel-text/80">
                  {SLOT_LABEL[selected.slot]} · Lv. {level}
                </p>
              </div>
            </div>

            {selected.slot === "weapon" && (
              <p className="mt-3 text-[12px] text-panel-text/70">{BOW_FLAVOR[selected.rarity]}</p>
            )}

            <div className="mt-3 flex flex-col gap-1.5">
              {gearStatLines(selected.slot, selected.rarity, level).map((s) => (
                <StatRow key={s.label} icon={s.icon} label={s.label} current={s.value} next={null} />
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {!owned ? (
                <PixelButton
                  variant="green"
                  disabled={progress.gold < price}
                  onClick={() => onChange(buyGear(progress, selected.slot, selected.rarity))}
                  className="flex w-full items-center justify-center gap-1.5 px-5 py-2 text-[13px] font-semibold"
                >
                  {progress.gold < price ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Coins className="h-4 w-4 text-currency" />
                  )}
                  {price.toLocaleString()}
                </PixelButton>
              ) : equipped ? (
                <PixelButton disabled className="w-full px-5 py-2 text-[13px] font-semibold">
                  Equipped
                </PixelButton>
              ) : (
                <PixelButton
                  variant="green"
                  onClick={() => onChange(equipGear(progress, selected.slot, selected.rarity))}
                  className="w-full px-5 py-2 text-[13px] font-semibold"
                >
                  Equip
                </PixelButton>
              )}
              <div className="grid grid-cols-2 gap-2">
                <PixelButton
                  disabled={!owned}
                  onClick={() => onNavigate("crafting")}
                  className="px-3 py-2 text-[13px] font-semibold"
                >
                  Enhance
                </PixelButton>
                <PixelButton
                  variant="red"
                  disabled={!canSalvage}
                  onClick={() => {
                    onChange(salvageGear(progress, selected.slot, selected.rarity));
                    setOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-semibold"
                >
                  <Gem className="h-4 w-4" />
                  {canSalvage ? `Salvage +${salvage}` : "Salvage"}
                </PixelButton>
              </div>
            </div>
          </OuterPanel>
        </div>
      </div>
    </div>
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
  const level = getPlayerLevel(progress).level;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-6">
      <PageBanner src="/assets/world_banner.png" alt="World banner" />

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
            onClick={() =>
              navigate({
                to: "/game",
                search: { map: map.id, stage: Math.min(cleared + 1, map.stages) },
              })
            }
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
    value: (p) => p.bosses ?? 0,
    reward: 100,
    icon: Skull,
  },
  {
    id: "thousand-arrows",
    name: "Thousand Arrows",
    desc: "Defeat 1,000 enemies.",
    target: 1000,
    value: (p) => p.kills ?? 0,
    reward: 500,
    icon: Swords,
  },
  {
    id: "whisperwood-cleared",
    name: "Whisperwood Cleared",
    desc: "Clear all 5 stages of Whisperwood.",
    target: 5,
    value: (p) => p.cleared?.["whisperwood"] ?? 0,
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
  const owned = BOW_RARITIES.filter((r) => owns(progress, "weapon", r)).length;
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
      <PageBanner src="/assets/book_banner.png" alt="The Book banner" />

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
                  <IndexBowCard key={r} rarity={r} owned={owns(progress, "weapon", r)} />
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

// ---------------------------------------------------------------------------
// Enchantment — raising a bow's star level with Weapon Shards.
// ---------------------------------------------------------------------------

/** Short flavor line per bow, shown under its name. */
const BOW_FLAVOR: Record<BowRarity, string> = {
  Common: "A simple bow carved from a sapling. Honest and reliable.",
  Uncommon: "A hunter's trusted recurve, balanced for long treks.",
  Rare: "Silverwood limbs hum softly when the string is drawn.",
  Epic: "A bow infused with ember glass. Strikes carry the heat of the forge.",
  Legendary: "Forged from ignisite. Legends say it once felled a titan.",
};

/** One stat row: icon, label, current value and the next-star value. */
function StatRow({
  icon,
  label,
  current,
  next,
}: {
  icon: React.ReactNode;
  label: string;
  current: string;
  next: string | null;
}) {
  return (
    <InnerPanel className="flex items-center gap-3 bg-panel-header px-3 py-2">
      {icon}
      <span className="min-w-0 flex-1 text-[13px] text-panel-text">{label}</span>
      <span className="text-[13px] tabular-nums text-panel-text">{current}</span>
      {next && (
        <span className="flex items-center gap-1.5 text-[13px] tabular-nums">
          <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-semibold text-emerald-400">{next}</span>
        </span>
      )}
    </InnerPanel>
  );
}

/** Enchantment page: selected gear panel on the left, owned-gear list on the right. */
function EnchantmentPage({
  progress,
  onChange,
}: {
  progress: Progress;
  onChange: (next: Progress) => void;
}) {
  const ownedAll = GEAR_SLOTS.flatMap((slot) =>
    BOW_RARITIES.filter((r) => owns(progress, slot, r)).map((r) => ({ slot, rarity: r })),
  );
  const [sel, setSel] = useState<{ slot: GearSlot; rarity: BowRarity }>({
    slot: "weapon",
    rarity: progress.equipped,
  });
  const [slotFilter, setSlotFilter] = useState<GearSlot | "all">("all");

  const safe =
    ownedAll.find((g) => g.slot === sel.slot && g.rarity === sel.rarity) ??
    ownedAll[0] ?? { slot: "weapon" as GearSlot, rarity: "Common" as BowRarity };

  const level = levelOf(progress, safe.slot, safe.rarity);
  const maxed = level >= MAX_GEAR_LEVEL;
  const cost = levelUpShardCost(level);
  const affordable = cost !== null && progress.shards >= cost;

  const statLines = (lvl: number) => {
    if (safe.slot === "weapon") {
      const s = bowStats(safe.rarity, lvl);
      return {
        a: `${s.damage}`,
        b: `${s.rangeTiles} tiles`,
        c: `${(1000 / s.fireRateMs).toFixed(1)}/s`,
        labels: ["Attack", "Range", "Attack Speed"] as const,
      };
    }
    const g = gearBonus(safe.slot, safe.rarity, lvl);
    return {
      a: `+${g.hp}`,
      b: `+${g.defense}`,
      c: `+${Math.round(g.moveSpeed)}`,
      labels: ["Max HP", "Defense", "Move Speed"] as const,
    };
  };
  const now = statLines(Math.max(level, 1));
  const after = maxed ? null : statLines(level + 1);

  const list = ownedAll.filter((g) => slotFilter === "all" || g.slot === slotFilter);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-6">
      {/* Banner */}
      <PageBanner src="/assets/enchantment_banner.png" alt="Enchantment banner" />

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_320px]">
        {/* Selected gear */}
        <OuterPanel className="bg-panel-description p-3">
          <div className="flex flex-wrap items-start gap-4">
            <InnerPanel className="relative flex h-28 w-28 shrink-0 items-center justify-center bg-panel-header">
              {safe.slot === "weapon" ? (
                <img src={ICONS.bow} alt="" className="h-16 w-16 object-contain" />
              ) : (
                <SlotGlyph slot={safe.slot} className="h-14 w-14 text-panel-text/70" />
              )}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap text-panel-text">
                Lv. {level}
              </span>
            </InnerPanel>
            <div className="min-w-0 flex-1">
              <p className="font-pixel text-[14px] text-panel-text text-shadow">
                {gearName(safe.slot, safe.rarity)}
              </p>
              <span
                className={clsx(
                  "mt-1 inline-block rounded-sm px-2 py-0.5 text-[11px] font-semibold text-white",
                  RARITY_BADGE[safe.rarity],
                )}
              >
                {safe.rarity} {SLOT_LABEL[safe.slot]}
              </span>
              {safe.slot === "weapon" && (
                <p className="mt-2 text-[12px] text-panel-text/70">{BOW_FLAVOR[safe.rarity]}</p>
              )}
            </div>
            <InnerPanel className="bg-panel-header px-4 py-3 text-center">
              <LevelBadge level={level} />
              <p className="mt-2 text-[11px] text-panel-text/60">Level</p>
              <p className="text-[15px] font-semibold tabular-nums text-panel-text">
                {level}
                {!maxed && (
                  <span className="text-emerald-400">
                    {" "}
                    <ChevronRight className="inline h-3.5 w-3.5" /> {level + 1}
                  </span>
                )}
              </p>
            </InnerPanel>
          </div>

          {/* Stats */}
          <p className="mt-4 mb-2 font-pixel text-[11px] text-panel-text">
            Stats {after ? "(Next Level)" : "(Max Level)"}
          </p>
          <div className="flex flex-col gap-1.5">
            <StatRow
              icon={<Swords className="h-4 w-4 text-panel-text/80" />}
              label={now.labels[0]}
              current={now.a}
              next={after ? after.a : null}
            />
            <StatRow
              icon={<Shield className="h-4 w-4 text-panel-text/80" />}
              label={now.labels[1]}
              current={now.b}
              next={after ? after.b : null}
            />
            <StatRow
              icon={<Sparkles className="h-4 w-4 text-panel-text/80" />}
              label={now.labels[2]}
              current={now.c}
              next={after ? after.c : null}
            />
          </div>

          {/* Cost */}
          <p className="mt-4 mb-2 font-pixel text-[11px] text-panel-text">Required Shards</p>
          <InnerPanel className="flex flex-wrap items-center gap-3 bg-panel-header px-3 py-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-purple-900/50 ring-1 ring-purple-400/50">
              <Gem className="h-6 w-6 text-purple-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-panel-text">Shards</p>
              <p className="text-[11px] text-panel-text/60">Earned by salvaging equipment.</p>
            </div>
            {cost !== null && (
              <span
                className={clsx(
                  "text-[13px] tabular-nums",
                  affordable ? "text-panel-text" : "text-rose",
                )}
              >
                {progress.shards} / {cost}
              </span>
            )}
          </InnerPanel>

          {/* Enchant action */}
          {maxed ? (
            <PixelButton disabled className="mt-4 w-full px-5 py-2.5 text-[14px] font-semibold">
              Max Level
            </PixelButton>
          ) : (
            <PixelButton
              variant={affordable ? "green" : "default"}
              disabled={!affordable}
              onClick={() => onChange(levelUpGear(progress, safe.slot, safe.rarity))}
              className="mt-4 w-full px-5 py-2.5 text-[14px] font-semibold"
            >
              Enchant to Lv. {level + 1}
            </PixelButton>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-panel-text/60">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Each level costs level² shards and permanently improves the item, up to level{" "}
            {MAX_GEAR_LEVEL}. Salvage unused equipment to earn more shards.
          </p>
        </OuterPanel>

        {/* Gear picker */}
        <OuterPanel className="bg-panel-description p-3">
          <div className="flex items-center gap-2">
            <Anvil className="h-4 w-4 text-panel-text/80" />
            <p className="min-w-0 flex-1 font-pixel text-[12px] text-panel-text text-shadow">
              Select Gear
            </p>
            <div className="relative">
              <select
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value as GearSlot | "all")}
                aria-label="Filter by slot"
                style={frame(lightBorder, "5px", "15px")}
                className="cursor-pointer appearance-none bg-panel-header py-1 pr-7 pl-2.5 text-[12px] text-panel-text text-shadow outline-none"
              >
                <option value="all">All</option>
                {GEAR_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {SLOT_LABEL[s]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-panel-text/70" />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {list.length === 0 ? (
              <p className="p-4 text-center text-[12px] text-panel-text/60">
                No owned equipment in this slot yet.
              </p>
            ) : (
              list.map((g) => {
                const isSel = g.slot === safe.slot && g.rarity === safe.rarity;
                return (
                  <button
                    key={`${g.slot}:${g.rarity}`}
                    type="button"
                    onClick={() => setSel(g)}
                    aria-pressed={isSel}
                    className={clsx(
                      "flex w-full cursor-pointer items-center gap-3 p-2 text-left",
                      isSel ? "ring-2 ring-emerald-400" : "opacity-90 hover:opacity-100",
                    )}
                    style={frame(darkBorder, "6px", "20px")}
                  >
                    <InnerPanel className="flex h-14 w-14 shrink-0 items-center justify-center bg-panel-header">
                      {g.slot === "weapon" ? (
                        <img src={ICONS.bow} alt="" className="h-9 w-9 object-contain" />
                      ) : (
                        <SlotGlyph slot={g.slot} className="h-8 w-8 text-panel-text/70" />
                      )}
                    </InnerPanel>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-panel-text">
                        {gearName(g.slot, g.rarity)}
                      </span>
                      <span
                        className={clsx(
                          "mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-white",
                          RARITY_BADGE[g.rarity],
                        )}
                      >
                        {g.rarity}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-panel-text/70">
                      Lv. {levelOf(progress, g.slot, g.rarity)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </OuterPanel>
      </div>
    </div>
  );
}

/** Lucide glyph for a non-weapon gear slot. */
function SlotGlyph({ slot, className }: { slot: GearSlot; className?: string }) {
  const Glyph = slot === "helmet" ? HardHat : slot === "armor" ? Shirt : Footprints;
  return <Glyph className={className} aria-hidden />;
}


/** Equipment slots that are not yet earnable — shown locked for now. */
const CHARACTER_SLOTS: { id: string; label: string; icon: typeof Shirt }[] = [
  { id: "helmet", label: "Helmet", icon: HardHat },
  { id: "armor", label: "Armor", icon: Shirt },
  { id: "boots", label: "Boots", icon: Footprints },
  { id: "accessory", label: "Accessory", icon: Leaf },
];

type CharacterTab = "equipment" | "appearance" | "stats";

/** Character page: equipment loadout, hero portrait and the full stat sheet. */
function CharacterPage({
  progress,
  onChange,
}: {
  progress: Progress;
  onChange: (next: Progress) => void;
}) {
  const [tab, setTab] = useState<CharacterTab>("equipment");
  const level = getPlayerLevel(progress);
  const weaponLevel = levelOf(progress, "weapon", progress.equipped);
  const bow = BOWS[progress.equipped];
  const stats = bowStats(progress.equipped, Math.max(weaponLevel, 1));
  const bonus = totalGearBonus(progress);
  const maxHp = 100 + level.level * 20 + bonus.hp;
  const defense = 5 + Math.floor(level.level * 1.5) + bonus.defense;
  const critRate = 5 + weaponLevel;
  const critDamage = 150 + weaponLevel * 10;


  const sheet: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Swords className="h-4 w-4 text-panel-text/80" />, label: "Attack", value: `${stats.damage}` },
    { icon: <Heart className="h-4 w-4 text-rose" />, label: "Max HP", value: `${maxHp}` },
    { icon: <Shield className="h-4 w-4 text-panel-text/80" />, label: "Defense", value: `${defense}` },
    { icon: <Zap className="h-4 w-4 text-gold" />, label: "Attack Speed", value: `${(1000 / stats.fireRateMs).toFixed(1)}/s` },
    { icon: <Globe className="h-4 w-4 text-panel-text/80" />, label: "Range", value: `${stats.rangeTiles} tiles` },
    { icon: <Star className="h-4 w-4 text-gold" />, label: "Critical Rate", value: `${critRate}%` },
    { icon: <Sparkles className="h-4 w-4 text-panel-text/80" />, label: "Critical Damage", value: `${critDamage}%` },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-6">
      <PageBanner src="/assets/character_banner.png" alt="Character banner" />

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "equipment", label: "Equipment", icon: Backpack },
                { id: "appearance", label: "Appearance", icon: Shirt },
                { id: "stats", label: "Stats", icon: BarChart3 },
              ] as const
            ).map((t) => (
              <PixelButton
                key={t.id}
                variant={tab === t.id ? "green" : "default"}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold"
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </PixelButton>
            ))}
          </div>

          {tab === "equipment" && (
            <OuterPanel className="bg-panel-description p-3">
              <div className="grid gap-3 sm:grid-cols-[120px_1fr_120px]">
                <div className="flex flex-col gap-3">
                  <SlotCard
                    label="Weapon"
                    sub={`Lv. ${weaponLevel} · ${bow.name}`}
                    art={<img src={ICONS.bow} alt={bow.name} className="h-10 w-10 object-contain" />}
                  />
                  <GearSlotCard progress={progress} slot="helmet" />
                </div>
                <InnerPanel className="relative flex min-h-[240px] items-end justify-center bg-panel-header p-4">
                  <FrogAvatar className="absolute top-6 h-28 w-28" />
                  <PixelButton className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold">
                    <RefreshCw className="h-4 w-4" />
                    Switch Hero
                  </PixelButton>
                </InnerPanel>
                <div className="flex flex-col gap-3">
                  <GearSlotCard progress={progress} slot="armor" />
                  <GearSlotCard progress={progress} slot="boots" />
                </div>

              </div>
            </OuterPanel>
          )}

          {tab === "appearance" && (
            <OuterPanel className="bg-panel-description p-3">
              <p className="font-pixel text-[11px] text-panel-text">Skins</p>
              <p className="mt-1 text-[12px] text-panel-text/70">
                Only the Forest Frog is available for now. More heroes arrive with future maps.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InnerPanel className="flex flex-col items-center gap-2 bg-panel-header px-2 py-3">
                  <FrogAvatar className="h-14 w-14" />
                  <span className="text-[12px] font-semibold text-panel-text">Forest Frog</span>
                  <span className="text-[11px] text-emerald-400">Equipped</span>
                </InnerPanel>
                {CHARACTER_SLOTS.map((s) => (
                  <InnerPanel
                    key={s.id}
                    className="flex flex-col items-center gap-2 bg-panel-header px-2 py-3 opacity-60"
                  >
                    <Lock className="h-6 w-6 text-panel-text/60" />
                    <span className="text-[12px] text-panel-text/70">Locked</span>
                  </InnerPanel>
                ))}
              </div>
            </OuterPanel>
          )}

          {tab === "stats" && (
            <OuterPanel className="bg-panel-description p-3">
              <p className="mb-2 font-pixel text-[11px] text-panel-text">Lifetime</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <StatRow icon={<Swords className="h-4 w-4 text-panel-text/80" />} label="Total Kills" current={`${progress.kills}`} next={null} />
                <StatRow icon={<Skull className="h-4 w-4 text-panel-text/80" />} label="Bosses Slain" current={`${progress.bosses}`} next={null} />
                <StatRow icon={<Trophy className="h-4 w-4 text-gold" />} label="Best Score" current={`${progress.bestScore}`} next={null} />
                <StatRow icon={<Coins className="h-4 w-4 text-gold" />} label="Gold" current={`${progress.gold}`} next={null} />
                <StatRow icon={<Gem className="h-4 w-4 text-purple-300" />} label="Weapon Shards" current={`${progress.shards}`} next={null} />
                <StatRow icon={<Star className="h-4 w-4 text-gold" />} label="Bows Owned" current={`${BOW_RARITIES.filter((r) => owns(progress, "weapon", r)).length} / ${BOW_RARITIES.length}`} next={null} />
              </div>
            </OuterPanel>
          )}
        </div>

        {/* Hero stat sheet */}
        <OuterPanel className="bg-panel-description p-3">
          <p className="text-center font-pixel text-[14px] text-panel-text text-shadow">Frog</p>
          <InnerPanel className="mt-3 flex items-center gap-3 bg-panel-header px-3 py-2">
            <span className="text-[12px] font-semibold text-panel-text">Lv. {level.level}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/40">
              <span
                className="block h-full bg-emerald-400"
                style={{ width: `${Math.round(level.ratio * 100)}%` }}
              />
            </span>
            <span className="text-[11px] tabular-nums text-panel-text/80">
              {level.into} / {level.needed} XP
            </span>
          </InnerPanel>
          {level.maxed ? null : (
            <PixelButton
              variant={level.canLevel ? "green" : "default"}
              disabled={!level.canLevel}
              onClick={() => onChange(levelUpPlayer(progress))}
              className="mt-2 w-full px-4 py-2 text-[13px] font-semibold"
            >
              {level.xpReady
                ? `Level Up · ${level.shardCost} shards`
                : "Earn more XP to level up"}
            </PixelButton>
          )}

          <div className="mt-3 flex flex-col gap-1.5">
            {sheet.map((s) => (
              <InnerPanel key={s.label} className="flex items-center gap-3 bg-panel-header px-3 py-2">
                {s.icon}
                <span className="min-w-0 flex-1 text-[13px] text-panel-text">{s.label}</span>
                <span className="text-[13px] font-semibold tabular-nums text-panel-text">{s.value}</span>
              </InnerPanel>
            ))}
          </div>
        </OuterPanel>
      </div>
    </div>
  );
}

/** One equipment slot tile. */
function SlotCard({
  label,
  sub,
  art,
  icon: Icon,
  locked,
}: {
  label: string;
  sub: string;
  art?: React.ReactNode;
  icon?: typeof Shirt;
  locked?: boolean;
}) {
  return (
    <InnerPanel
      className={clsx(
        "flex flex-col items-center gap-1 bg-panel-header px-2 py-2.5",
        locked && "opacity-70",
      )}
    >
      <span className="self-start text-[11px] font-semibold text-panel-text/80">{label}</span>
      <span className="flex h-12 items-center justify-center">
        {art ?? (Icon ? <Icon className="h-8 w-8 text-panel-text/50" /> : null)}
      </span>
      <span className="text-[11px] text-panel-text/70">{sub}</span>
    </InnerPanel>
  );
}

/** Equipment slot tile backed by the player's equipped gear. */
function GearSlotCard({ progress, slot }: { progress: Progress; slot: GearSlot }) {
  const rarity = equippedOf(progress, slot);
  const Icon = slot === "helmet" ? HardHat : slot === "armor" ? Shirt : Footprints;
  if (!rarity) return <SlotCard label={SLOT_LABEL[slot]} sub="Empty" locked icon={Icon} />;
  return (
    <SlotCard
      label={SLOT_LABEL[slot]}
      sub={`Lv. ${levelOf(progress, slot, rarity)} · ${rarity}`}
      art={<Icon className="h-8 w-8 text-panel-text/70" />}
    />
  );
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

/** Gold paid per shard when selling, and gold charged per shard when buying. */
const SHARD_SELL_GOLD = 40;
const SHARD_BUY_GOLD = 120;

const RARITY_HEX: Record<BowRarity, string> = {
  Common: "#94a3b8",
  Uncommon: "#34d399",
  Rare: "#60a5fa",
  Epic: "#c084fc",
  Legendary: "#fbbf24",
};

const GEAR_DESCRIPTIONS: Record<GearSlot, string> = {
  weapon: "A bow that strikes from the shadows. Favored by those who never miss.",
  helmet: "Sturdy headgear that keeps an adventurer standing through the longest fights.",
  armor: "Battle-tested plating that turns aside blows that would fell a lesser frog.",
  boots: "Light, quiet boots made for crossing forests and dunes alike.",
};

/** Visual rating shown on marketplace cards, derived from rarity. */
function RarityStars({ rarity, className }: { rarity: BowRarity; className?: string }) {
  const filled = BOW_RARITIES.indexOf(rarity) + 1;
  return (
    <span className={clsx("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={clsx(
            "h-3 w-3",
            i <= filled ? "fill-amber-400 text-amber-400" : "text-panel-text/30",
          )}
        />
      ))}
    </span>
  );
}

function MarketplacePage({
  progress,
  onChange,
}: {
  progress: Progress;
  onChange: (next: Progress) => void;
}) {
  type MarketTab = "buy" | "featured" | "sell" | "listings";
  type Item = { slot: GearSlot; rarity: BowRarity };

  const [tab, setTab] = useState<MarketTab>("buy");
  const [slotFilter, setSlotFilter] = useState<GearSlot | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<BowRarity | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Item | null>(null);

  const ALL_ITEMS: Item[] = GEAR_SLOTS.flatMap((slot) =>
    BOW_RARITIES.map((rarity) => ({ slot, rarity })),
  );

  const equipped = (slot: GearSlot, rarity: BowRarity) =>
    equippedOf(progress, slot) === rarity;

  const baseItems = ALL_ITEMS.filter((g) => {
    const owned = owns(progress, g.slot, g.rarity);
    if (tab === "buy") return !owned;
    if (tab === "featured")
      return !owned && (g.rarity === "Rare" || g.rarity === "Epic" || g.rarity === "Legendary");
    if (tab === "sell") return owned && !equipped(g.slot, g.rarity);
    return false;
  });

  const items = baseItems.filter((g) => {
    if (slotFilter !== "all" && g.slot !== slotFilter) return false;
    if (rarityFilter !== "all" && g.rarity !== rarityFilter) return false;
    if (query && !gearName(g.slot, g.rarity).toLowerCase().includes(query.toLowerCase()))
      return false;
    return true;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const sellPrice = (slot: GearSlot, rarity: BowRarity) =>
    Math.max(10, Math.floor(gearUnlockCost(slot, rarity) * 0.4));

  const buyShards = (amount: number) => {
    const cost = amount * SHARD_BUY_GOLD;
    if (progress.gold < cost) return;
    onChange({ ...progress, gold: progress.gold - cost, shards: progress.shards + amount });
  };

  const sellShards = (amount: number) => {
    if (progress.shards < amount) return;
    onChange({
      ...progress,
      shards: progress.shards - amount,
      gold: progress.gold + amount * SHARD_SELL_GOLD,
    });
  };

  /** Sells an owned, unequipped piece of gear back for gold. */
  const sellGearForGold = (slot: GearSlot, rarity: BowRarity) => {
    if (!owns(progress, slot, rarity) || equipped(slot, rarity)) return;
    if (slot === "weapon" && rarity === "Common") return;
    let next: Progress = { ...progress, gold: progress.gold + sellPrice(slot, rarity) };
    if (slot === "weapon") {
      const bows = { ...next.bows };
      delete bows[rarity];
      next = { ...next, bows };
    } else {
      const gear = { ...next.gear };
      delete gear[`${slot}:${rarity}`];
      next = { ...next, gear };
    }
    saveProgress(next);
    if (selected?.slot === slot && selected?.rarity === rarity) setSelected(null);
    onChange(next);
  };

  const switchTab = (t: MarketTab) => {
    setTab(t);
    setPage(1);
    setSelected(null);
  };

  const TABS: { id: MarketTab; label: string; icon: typeof Store }[] = [
    { id: "buy", label: "Buy", icon: ShoppingCart },
    { id: "featured", label: "Featured", icon: Star },
    { id: "sell", label: "Sell", icon: Coins },
    { id: "listings", label: "My Listings", icon: Backpack },
  ];

  const sel = selected;
  const selOwned = sel ? owns(progress, sel.slot, sel.rarity) : false;
  const selEquipped = sel ? equipped(sel.slot, sel.rarity) : false;
  const selLevel = sel ? levelOf(progress, sel.slot, sel.rarity) : 1;
  const selCost = sel ? gearUnlockCost(sel.slot, sel.rarity) : 0;
  const selAffordable = sel ? progress.gold >= selCost : false;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-6">
      <PageBanner src="/assets/marketplace_banner.png" alt="Marketplace banner" />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <PixelButton
              key={t.id}
              variant={active && t.id === "buy" ? "green" : "default"}
              onClick={() => switchTab(t.id)}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold",
                active ? "brightness-110" : "opacity-70",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </PixelButton>
          );
        })}
      </div>

      {tab === "listings" ? (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <OuterPanel className="bg-panel-description p-3">
            <p className="font-pixel text-[12px] text-panel-text">Buy Shards</p>
            <p className="mt-1 text-[12px] text-panel-text/70">{SHARD_BUY_GOLD} gold per shard.</p>
            <div className="mt-3 flex flex-col gap-2">
              {[1, 5, 10].map((n) => {
                const cost = n * SHARD_BUY_GOLD;
                const ok = progress.gold >= cost;
                return (
                  <InnerPanel key={n} className="flex items-center gap-3 bg-panel-header px-3 py-2">
                    <Gem className="h-5 w-5 text-purple-300" />
                    <span className="flex-1 text-[13px] text-panel-text">{n} shards</span>
                    <span className="text-[12px] tabular-nums text-panel-text/80">{cost} gold</span>
                    <PixelButton
                      variant={ok ? "green" : "default"}
                      disabled={!ok}
                      onClick={() => buyShards(n)}
                      className="px-3 py-1 text-[12px] font-semibold"
                    >
                      Buy
                    </PixelButton>
                  </InnerPanel>
                );
              })}
            </div>
          </OuterPanel>

          <OuterPanel className="bg-panel-description p-3">
            <p className="font-pixel text-[12px] text-panel-text">Sell Shards</p>
            <p className="mt-1 text-[12px] text-panel-text/70">{SHARD_SELL_GOLD} gold per shard.</p>
            <div className="mt-3 flex flex-col gap-2">
              {[1, 5, 10].map((n) => {
                const ok = progress.shards >= n;
                return (
                  <InnerPanel key={n} className="flex items-center gap-3 bg-panel-header px-3 py-2">
                    <Coins className="h-5 w-5 text-amber-300" />
                    <span className="flex-1 text-[13px] text-panel-text">
                      {n * SHARD_SELL_GOLD} gold
                    </span>
                    <span className="text-[12px] tabular-nums text-panel-text/80">{n} shards</span>
                    <PixelButton
                      variant={ok ? "green" : "default"}
                      disabled={!ok}
                      onClick={() => sellShards(n)}
                      className="px-3 py-1 text-[12px] font-semibold"
                    >
                      Sell
                    </PixelButton>
                  </InnerPanel>
                );
              })}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-panel-text/60">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Salvaging equipment in your inventory is still the cheapest way to earn shards.
            </p>
          </OuterPanel>
        </div>
      ) : (
        <>
          {/* Filters */}
          <OuterPanel className="flex flex-wrap items-center gap-2 bg-panel-description p-2">
            {(["all", ...GEAR_SLOTS] as const).map((s) => (
              <PixelButton
                key={s}
                onClick={() => {
                  setSlotFilter(s as GearSlot | "all");
                  setPage(1);
                }}
                className={clsx(
                  "px-3 py-1 text-[11px]",
                  slotFilter === s ? "brightness-110" : "opacity-70",
                )}
              >
                {s === "all" ? "All" : `${SLOT_LABEL[s as GearSlot]}s`}
              </PixelButton>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-panel-text/20 sm:block" />
            <InnerPanel className="bg-panel-header px-2 py-1">
              <select
                value={rarityFilter}
                onChange={(e) => {
                  setRarityFilter(e.target.value as BowRarity | "all");
                  setPage(1);
                }}
                className="bg-transparent text-[12px] text-panel-text outline-none"
              >
                <option value="all">Rarity</option>
                {BOW_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </InnerPanel>
            <InnerPanel className="flex min-w-40 flex-1 items-center gap-2 bg-panel-header px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-panel-text/60" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search items..."
                className="w-full bg-transparent text-[12px] text-panel-text outline-none placeholder:text-panel-text/50"
              />
            </InnerPanel>
          </OuterPanel>

          <div className="grid items-start gap-3 xl:grid-cols-[1fr_320px]">
            {/* Item grid */}
            <OuterPanel className="bg-panel-description p-3">
              {pageItems.length === 0 ? (
                <p className="px-1 py-6 text-center text-[13px] text-panel-text/70">
                  {tab === "sell"
                    ? "Nothing to sell — gear you own (and haven't equipped) will show up here."
                    : "Nothing found here — try a different filter or category."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {pageItems.map((g) => {
                    const cost =
                      tab === "sell" ? sellPrice(g.slot, g.rarity) : gearUnlockCost(g.slot, g.rarity);
                    const affordable = progress.gold >= cost;
                    const isSel = selected?.slot === g.slot && selected?.rarity === g.rarity;
                    return (
                      <div
                        key={`${g.slot}:${g.rarity}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(isSel ? null : g)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSelected(isSel ? null : g);
                        }}
                        className="cursor-pointer text-left"
                      >
                        <InnerPanel
                          className="flex h-full flex-col items-center gap-1 bg-panel-header p-2.5"
                          style={{
                            boxShadow: isSel
                              ? `0 0 0 2px ${RARITY_HEX[g.rarity]}`
                              : `inset 0 0 0 1px ${RARITY_HEX[g.rarity]}55`,
                          }}
                        >
                          <span className="relative flex h-14 w-full items-center justify-center">
                            {g.slot === "weapon" ? (
                              <img src={ICONS.bow} alt="" className="h-10 w-10 object-contain" />
                            ) : (
                              <SlotGlyph slot={g.slot} className="h-9 w-9 text-panel-text/70" />
                            )}
                            <span className="absolute right-0 top-0 text-[10px] tabular-nums text-panel-text/70">
                              Lv. {levelOf(progress, g.slot, g.rarity) || 1}
                            </span>
                          </span>
                          <p className="w-full truncate text-center text-[12px] font-semibold text-panel-text">
                            {gearName(g.slot, g.rarity)}
                          </p>
                          <p
                            className="text-[11px] font-semibold"
                            style={{ color: RARITY_HEX[g.rarity] }}
                          >
                            {g.rarity}
                          </p>
                          <RarityStars rarity={g.rarity} />
                          <span className="mt-1 flex w-full items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-[12px] tabular-nums text-panel-text/80">
                              <Coins className="h-3.5 w-3.5 text-amber-300" />
                              {cost}
                            </span>
                            {tab === "sell" ? (
                              <PixelButton
                                variant="green"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sellGearForGold(g.slot, g.rarity);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold"
                              >
                                Sell
                              </PixelButton>
                            ) : (
                              <PixelButton
                                variant={affordable ? "green" : "default"}
                                disabled={!affordable}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChange(buyGear(progress, g.slot, g.rarity));
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold"
                              >
                                Buy Now
                              </PixelButton>
                            )}
                          </span>
                        </InnerPanel>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <PixelButton
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    className="px-2 py-1"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </PixelButton>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                    <PixelButton
                      key={p}
                      variant={p === safePage ? "green" : "default"}
                      onClick={() => setPage(p)}
                      className={clsx(
                        "min-w-7 px-2 py-1 text-[11px] tabular-nums",
                        p === safePage ? "brightness-110" : "opacity-70",
                      )}
                    >
                      {p}
                    </PixelButton>
                  ))}
                  <PixelButton
                    disabled={safePage >= pageCount}
                    onClick={() => setPage(safePage + 1)}
                    className="px-2 py-1"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </PixelButton>
                </div>
                <p className="text-[11px] text-panel-text/60">
                  Showing {items.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, items.length)} of {items.length} items
                </p>
              </div>
            </OuterPanel>

            {/* Detail panel */}
            <OuterPanel className="sticky top-3 bg-panel-description p-3">
              {!sel ? (
                <p className="px-1 py-8 text-center text-[12px] text-panel-text/60">
                  Select an item to inspect it here.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className="truncate text-[15px] font-bold"
                        style={{ color: RARITY_HEX[sel.rarity] }}
                      >
                        {gearName(sel.slot, sel.rarity)}
                      </p>
                      <p className="mt-0.5 text-[12px] text-panel-text/70">
                        {sel.rarity} · {SLOT_LABEL[sel.slot]}
                      </p>
                    </div>
                    <PixelButton
                      onClick={() => setSelected(null)}
                      className="px-1.5 py-1"
                      aria-label="Close details"
                    >
                      <X className="h-3.5 w-3.5" />
                    </PixelButton>
                  </div>

                  <InnerPanel className="relative flex items-center justify-center bg-panel-header py-5">
                    {sel.slot === "weapon" ? (
                      <img src={ICONS.bow} alt="" className="h-16 w-16 object-contain" />
                    ) : (
                      <SlotGlyph slot={sel.slot} className="h-14 w-14 text-panel-text/70" />
                    )}
                    <span className="absolute right-2 top-2 rounded-sm bg-panel-description px-1.5 py-0.5 text-[11px] tabular-nums text-panel-text">
                      Lv. {selOwned ? selLevel : 1}
                    </span>
                  </InnerPanel>

                  <RarityStars rarity={sel.rarity} />

                  <p className="text-[12px] leading-relaxed text-panel-text/80">
                    {GEAR_DESCRIPTIONS[sel.slot]}
                  </p>

                  <InnerPanel className="flex flex-col gap-1.5 bg-panel-header p-2.5">
                    {sel.slot === "weapon" ? (
                      (() => {
                        const s = bowStats(sel.rarity, selOwned ? selLevel : 1);
                        const rows: [string, string][] = [
                          ["Damage", String(s.damage)],
                          ["Range", `${s.rangeTiles} tiles`],
                          ["Attack Speed", `${(1000 / s.fireRateMs).toFixed(1)}/s`],
                        ];
                        return rows.map(([label, value]) => (
                          <p key={label} className="flex items-center justify-between text-[12px]">
                            <span className="text-panel-text/70">{label}</span>
                            <span className="tabular-nums text-panel-text">{value}</span>
                          </p>
                        ));
                      })()
                    ) : (
                      (() => {
                        const b = gearBonus(sel.slot, sel.rarity, selOwned ? selLevel : 1);
                        const rows: [string, string][] = [
                          ["Max HP", `+${b.hp}`],
                          ["Defense", `+${b.defense}`],
                          ["Move Speed", `+${b.moveSpeed}`],
                        ];
                        return rows.map(([label, value]) => (
                          <p key={label} className="flex items-center justify-between text-[12px]">
                            <span className="text-panel-text/70">{label}</span>
                            <span className="tabular-nums text-panel-text">{value}</span>
                          </p>
                        ));
                      })()
                    )}
                  </InnerPanel>

                  {selOwned ? (
                    selEquipped ? (
                      <PixelButton variant="default" disabled className="w-full py-2 text-[13px] font-semibold">
                        Equipped
                      </PixelButton>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-amber-300">
                          <Coins className="h-4 w-4" />
                          {sellPrice(sel.slot, sel.rarity)}
                        </p>
                        <PixelButton
                          variant="green"
                          onClick={() => sellGearForGold(sel.slot, sel.rarity)}
                          className="flex w-full items-center justify-center gap-2 py-2 text-[13px] font-semibold"
                        >
                          <Coins className="h-4 w-4" />
                          Sell Now
                        </PixelButton>
                      </>
                    )
                  ) : (
                    <>
                      <p className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-amber-300">
                        <Coins className="h-4 w-4" />
                        {selCost}
                      </p>
                      <PixelButton
                        variant={selAffordable ? "green" : "default"}
                        disabled={!selAffordable}
                        onClick={() => onChange(buyGear(progress, sel.slot, sel.rarity))}
                        className="flex w-full items-center justify-center gap-2 py-2 text-[13px] font-semibold"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Buy Now
                      </PixelButton>
                    </>
                  )}
                </div>
              )}
            </OuterPanel>
          </div>
        </>
      )}
    </div>
  );
}
