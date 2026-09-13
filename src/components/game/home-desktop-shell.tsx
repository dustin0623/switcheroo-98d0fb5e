/**
 * HomeDesktopShell — the wide-screen home shell for ARCOON.
 * A fixed left sidebar (logo + navigation) and a top header bar with the
 * player identity (avatar, name, level, XP) and wallet on the right.
 * The main content area sits to the right of the sidebar, under the header.
 */
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Backpack,
  BookOpen,
  ChevronDown,
  Coins,
  Gem,
  Globe,
  Hammer,
  Lock,
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

      <Sidebar active={active} onChange={setActive} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopHeader progress={progress} />
        <main className="relative flex-1 overflow-y-auto p-4">
          <div className="fantasy-card mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="font-pixel text-[12px] text-white">
              {NAV.find((n) => n.id === active)?.label}
            </p>
            <p className="text-[13px] text-shell-muted">
              This section is coming soon. The shell is ready — pick a destination from the
              sidebar.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Left rail: ARCOON wordmark plus the primary navigation list. */
function Sidebar({ active, onChange }: { active: NavId; onChange: (id: NavId) => void }) {
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
            "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white ring-1 ring-white/30 transition-colors hover:bg-black/30 hover:text-white",
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
      <p className="px-4 py-3 text-center text-[11px] tracking-widest text-white/70 uppercase">
        {collapsed ? "!" : "Stay sharp!"}
      </p>
    </aside>
  );
}

/** Top bar: player identity + XP on the left, wallet and actions on the right. */
function TopHeader({ progress }: { progress: Progress }) {
  const level = getLevelProgress(progress.xp);

  return (
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-ink-line bg-ink-800/95 px-4 py-2.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <FrogAvatar className="h-11 w-11 shrink-0 rounded-full ring-2 ring-shell-accent/70" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-pixel text-[13px] text-white text-shadow">ARCOON</p>
            <p className="font-pixel text-[10px] text-white">Lv.{level.level}</p>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 w-36 overflow-hidden rounded-full bg-ink-900 ring-1 ring-ink-line">
              <div
                className="h-full rounded-full bg-shell-accent-strong"
                style={{ width: `${Math.round(level.ratio * 100)}%` }}
              />
            </div>
            <span className="text-[12px] whitespace-nowrap tabular-nums text-shell-muted">
              {level.maxed ? "MAX" : `${level.into} / ${level.needed} XP`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CurrencyPill icon={<Coins className="h-4 w-4 text-currency" />} value={progress.gold} />
        <CurrencyPill icon={<Gem className="h-4 w-4 text-frost" />} value={25} />
        <HeaderIconButton label="Mail">
          <Mail className="h-5 w-5" />
        </HeaderIconButton>
        <HeaderIconButton label="Settings">
          <Settings className="h-5 w-5" />
        </HeaderIconButton>
      </div>
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
