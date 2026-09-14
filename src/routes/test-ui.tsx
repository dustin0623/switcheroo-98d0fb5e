import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Backpack,
  Coins,
  Gem,
  Globe,
  Hammer,
  Mail,
  Search,
  Settings,
  Shirt,
  Sparkles,
  Store,
  Swords,
  X,
} from "lucide-react";
import {
  GameOverModal,
  LevelUpToast,
  LoadingOverlay,
  SkillTreeModal,
  TopBar,
  VictoryModal,
  WaveBreakModal,
  XpBar,
} from "@/components/game/game-modals";
import {
  BarPanel,
  InnerPanel,
  Label,
  OuterPanel,
  Panel,
  PixelButton,
} from "@/components/ui/pixel-panel";
import type { HudState } from "@/features/game/hud";
import { WAVES_PER_STAGE } from "@/features/game/campaign";
import { EMPTY_RANKS, canLearn, getSkill, type SkillId } from "@/features/game/skill-tree";
import { BOW_RARITIES, type BowRarity } from "@/features/game/bow";
import { GEAR_SLOTS, SLOT_LABEL, gearName, type GearSlot } from "@/features/game/equipment";
import whisperwoodArt from "@/assets/world/whisperwood.jpg";
import dunesArt from "@/assets/world/dunes.jpg";
import sewersArt from "@/assets/world/sewers.jpg";


export const Route = createFileRoute("/test-ui")({
  head: () => ({
    meta: [
      { title: "ARCOON UI Reference — Game & Home Panels" },
      {
        name: "description",
        content:
          "Every reusable ARCOON interface piece in one page: game HUD, wave break, skill tree, stage clear and defeat screens, plus the home shell panels, buttons, badges, tabs, filters, cards and drawer.",
      },
      { property: "og:title", content: "ARCOON UI Reference — Game & Home Panels" },
      {
        property: "og:description",
        content:
          "Every reusable ARCOON interface piece in one page: game HUD, modals, and the home shell panels, buttons, badges, tabs, filters, cards and drawer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TestUiPage,
});

const SAMPLE: HudState = {
  hp: 70,
  maxHp: 100,
  wave: 6,
  boss: false,
  score: 4820,
  kills: 73,
  enemiesLeft: 9,
  enemiesTotal: 16,
  intermission: true,
  gameOver: false,
  stage: 3,
  stageWaves: WAVES_PER_STAGE,
  mapId: "whisperwood",
  victory: false,
  goldEarned: 2610,
  bowRarity: "Rare",
  bowLevel: 3,
  xp: 640,
  level: 5,
  skillPoints: 3,
  ranks: { ...EMPTY_RANKS, sharpshooter: 2, vitality: 1, greed: 1 },
  seen: ["grunt", "runner"],
  bosses: 1,
};

const RARITY_TEXT: Record<BowRarity, string> = {
  Common: "text-white/80",
  Uncommon: "text-green-300",
  Rare: "text-sky-300",
  Epic: "text-purple-300",
  Legendary: "text-amber-300",
};

const RARITY_RING: Record<BowRarity, string> = {
  Common: "ring-white/25",
  Uncommon: "ring-green-400/60",
  Rare: "ring-sky-400/60",
  Epic: "ring-purple-400/60",
  Legendary: "ring-amber-400/70",
};

const SLOT_ICON: Record<GearSlot, typeof Swords> = {
  weapon: Swords,
  helmet: Sparkles,
  armor: Shirt,
  boots: Hammer,
};

const NAV_SAMPLE: { label: string; icon: typeof Globe; active?: boolean; badge?: boolean }[] = [
  { label: "World", icon: Globe, active: true },
  { label: "Inventory", icon: Backpack },
  { label: "Enchantment", icon: Sparkles, badge: true },
  { label: "Marketplace", icon: Store },
];

const BANNERS: { label: string; src: string }[] = [
  { label: "World", src: "/assets/world_banner.png" },
  { label: "Inventory", src: "/assets/inventory_banner.png" },
  { label: "Enchantment", src: "/assets/enchantment_banner.png" },
  { label: "Book", src: "/assets/book_banner.png" },
  { label: "Character", src: "/assets/character_banner.png" },
  { label: "Marketplace", src: "/assets/marketplace_banner.png" },
];

const MAP_SAMPLE: {
  name: string;
  blurb: string;
  art: string;
  reqLevel: number;
  state: "open" | "level" | "locked";
}[] = [
  {
    name: "Whisperwood",
    blurb: "Quiet pines hiding restless goblin scouts.",
    art: whisperwoodArt,
    reqLevel: 1,
    state: "open",
  },
  {
    name: "Sunken Dunes",
    blurb: "Endless sand, brutes buried just beneath it.",
    art: dunesArt,
    reqLevel: 8,
    state: "level",
  },
  {
    name: "Old Sewers",
    blurb: "Flooded tunnels crawling with fast, feral things.",
    art: sewersArt,
    reqLevel: 14,
    state: "locked",
  },
];



/** Section heading that groups related slots. */
function SectionHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="mt-10 mb-4 lg:col-span-2">
      <h2 className="font-pixel text-[15px] text-white text-shadow">{title}</h2>
      <p className="mt-2 text-[13px] text-white/60">{note}</p>
      <div className="mt-3 h-px w-full bg-white/15" />
    </div>
  );
}

/** One labelled slot in the gallery. */
function Slot({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="mb-2 text-[14px] text-white/80">{title}</h3>
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-[#1b1526] p-4">
        {children}
      </div>
    </section>
  );
}

function TestUiPage() {
  // Live skill tree so the gallery behaves like the real thing.
  const [ranks, setRanks] = useState(SAMPLE.ranks);
  const [points, setPoints] = useState(SAMPLE.skillPoints);
  const [progress, setProgress] = useState(0.62);
  const [tab, setTab] = useState<GearSlot | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<BowRarity | "all">("all");
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const learn = (id: SkillId) => {
    const skill = getSkill(id);
    if (!canLearn(skill, ranks, points)) return;
    setRanks({ ...ranks, [id]: (ranks[id] ?? 0) + 1 });
    setPoints(points - 1);
  };

  return (
    <main data-game-route className="min-h-screen bg-[#120e1b] p-6 font-body text-white">
      <header className="mb-6">
        <h1 className="font-pixel text-sm text-white text-shadow">ARCOON UI reference</h1>
        <p className="mt-2 text-[13px] text-white/60">
          Every panel, button, badge and card the game and home shell use, rendered with sample
          data. Everything here is interactive.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ----------------------------- Primitives ----------------------------- */}
        <SectionHeading
          title="1 — Panel & control primitives"
          note="The shared building blocks. Dark frame for outer shells, light frame for inner sections, white frame for chips, green and red for confirm and danger."
        />

        <Slot title="Frames">
          <OuterPanel className="p-3 text-[13px]">Outer panel (dark frame)</OuterPanel>
          <InnerPanel className="p-3 text-[13px]">Inner panel (light frame)</InnerPanel>
          <Panel className="text-[13px]">Panel (dark + light)</Panel>
        </Slot>

        <Slot title="Chips & bar panel">
          <Label className="py-1 text-[11px]">LV. 12</Label>
          <Label className="py-1 text-[11px]">3 / 10</Label>
          <BarPanel
            className="w-full"
            center={<p className="text-center text-[11px]">CENTER</p>}
            right={<Label className="py-1 text-[10px]">RIGHT</Label>}
          >
            <p className="text-[12px]">Bar panel</p>
          </BarPanel>
        </Slot>

        <Slot title="Buttons — all variants and states">
          <PixelButton className="text-[12px]">Default</PixelButton>
          <PixelButton variant="green" className="text-[12px]">
            Confirm
          </PixelButton>
          <PixelButton variant="red" className="text-[12px]">
            Danger
          </PixelButton>
          <PixelButton disabled className="text-[12px]">
            Disabled
          </PixelButton>
          <PixelButton variant="green" disabled className="text-[12px]">
            Not enough gold
          </PixelButton>
        </Slot>

        <Slot title="Rarity badges & levels">
          {BOW_RARITIES.map((r) => (
            <Label key={r} className={`py-1 text-[10px] ${RARITY_TEXT[r]}`}>
              {r.toUpperCase()}
            </Label>
          ))}
        </Slot>

        {/* ------------------------------- Game -------------------------------- */}
        <SectionHeading
          title="2 — In-game (Phaser overlay)"
          note="Panels drawn over the running battle. All of them sit above the canvas and use the dark header colour."
        />

        <Slot title="HUD — top bar" className="lg:col-span-2">
          <TopBar hud={{ ...SAMPLE, ranks }} onOpenSkills={() => setPoints(points + 1)} />
        </Slot>

        <Slot title="HUD — boss wave variant" className="lg:col-span-2">
          <TopBar
            hud={{ ...SAMPLE, ranks, boss: true, wave: 10, hp: 24, enemiesLeft: 1 }}
            onOpenSkills={() => {}}
          />
        </Slot>

        <Slot title="Experience bar (bottom, full width)" className="lg:col-span-2">
          <div className="relative h-20 w-full overflow-hidden">
            <XpBar xp={SAMPLE.xp} />
          </div>
        </Slot>

        <Slot title="Level-up banner">
          <LevelUpToast level={6} />
        </Slot>

        <Slot title="Loading screen">
          <div className="relative h-48 w-full overflow-hidden rounded">
            <LoadingOverlay progress={progress} />
            <button
              type="button"
              onClick={() => setProgress((p) => (p >= 1 ? 0 : Math.min(1, p + 0.2)))}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[12px] text-white/60 underline"
            >
              advance
            </button>
          </div>
        </Slot>

        <Slot title="Between-waves break">
          <WaveBreakModal hud={{ ...SAMPLE, ranks }} onFight={() => {}} />
        </Slot>

        <Slot title="Defeat">
          <GameOverModal hud={{ ...SAMPLE, ranks }} onRestart={() => {}} onHome={() => {}} />
        </Slot>

        <Slot title="Stage clear" className="lg:col-span-2">
          <VictoryModal
            hud={{ ...SAMPLE, ranks, victory: true }}
            onNextStage={() => {}}
            onHome={() => {}}
          />
        </Slot>

        <Slot title="Skill tree" className="lg:col-span-2">
          <SkillTreeModal ranks={ranks} points={points} onLearn={learn} onClose={() => {}} />
        </Slot>

        {/* ------------------------------- Home -------------------------------- */}
        <SectionHeading
          title="3 — Home shell"
          note="The desktop shell around every home page: sidebar, top bar, page banners, tabs, filters, cards and the detail drawer."
        />

        <Slot title="Sidebar navigation — expanded, active, badge, collapsed">
          <div className="flex w-full items-start gap-4">
            <div className={collapsed ? "w-16" : "w-52"}>
              <div className="flex flex-col gap-1">
                {NAV_SAMPLE.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`relative flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] text-white transition-colors ${
                      item.active ? "bg-button-default" : "hover:bg-black/30"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {item.badge && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="cursor-pointer text-[12px] text-white/60 underline"
            >
              toggle collapse
            </button>
          </div>
        </Slot>

        <Slot title="Player footer & sign-out popover">
          <div className="w-full max-w-xs">
            <div className="flex items-center gap-2.5 px-1">
              <div className="h-10 w-10 shrink-0 rounded-full bg-green-800 ring-2 ring-green-400/70" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <p className="truncate font-pixel text-[11px] text-white text-shadow">ARCOON</p>
                  <p className="shrink-0 font-pixel text-[9px] text-white">Lv.5</p>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/20">
                    <div className="h-full w-[62%] rounded-full bg-green-400" />
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-white/80">640/900</span>
                </div>
              </div>
              <Settings className="h-4 w-4 shrink-0 text-white" />
            </div>
            <OuterPanel className="mt-3 bg-panel-header p-1.5">
              <p className="px-3 py-2 text-[13px] text-panel-text">Sign out</p>
            </OuterPanel>
          </div>
        </Slot>

        <Slot title="Top bar — currency pills and icon button" className="lg:col-span-2">
          <div className="flex w-full items-center justify-end gap-2 border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-1.5 rounded-md bg-black/40 px-3 py-1.5 ring-1 ring-white/15">
              <Coins className="h-4 w-4 text-amber-300" />
              <span className="text-[14px] tabular-nums">12,480</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-black/40 px-3 py-1.5 ring-1 ring-white/15">
              <Gem className="h-4 w-4 text-purple-300" />
              <span className="text-[14px] tabular-nums">36</span>
            </div>
            <button
              type="button"
              aria-label="Mail"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-black/40 text-white/70 ring-1 ring-white/15 hover:text-white"
            >
              <Mail className="h-5 w-5" />
            </button>
          </div>
        </Slot>

        <Slot title="World map cards (open / level-locked / locked)" className="lg:col-span-2">
          <div className="flex w-full flex-col gap-3">
            {MAP_SAMPLE.map((m, i) => (
              <OuterPanel
                key={m.name}
                className="grid grid-cols-[minmax(160px,1fr)_3fr] gap-0 overflow-hidden p-0"
              >
                <div className="relative h-full min-h-[160px] overflow-hidden">
                  <img
                    src={m.art}
                    alt={m.name}
                    loading="lazy"
                    className={`h-full w-full object-cover ${m.state === "locked" ? "opacity-40 grayscale" : ""}`}
                  />
                  <span className="absolute top-1.5 left-1.5">
                    <PixelButton className="cursor-default px-2 py-1 text-[10px] font-semibold">
                      MAP {i + 1}
                    </PixelButton>
                  </span>
                </div>

                <div className="grid grid-cols-3 items-center gap-3 p-2.5">
                  <div className="col-span-2 flex min-w-0 flex-col justify-center gap-1.5 py-1">
                    <p className="font-pixel text-[14px] text-panel-text text-shadow">{m.name}</p>
                    <p className="text-[12px] text-panel-text/80">{m.blurb}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <InnerPanel className="flex items-center gap-1.5 bg-panel-header px-2 py-1">
                        <span className="text-[11px] text-panel-text/70">Recommended</span>
                        <span className="text-[11px] font-semibold text-panel-text">
                          Lv. {m.reqLevel}+
                        </span>
                      </InnerPanel>
                      <InnerPanel className="flex items-center gap-1.5 bg-panel-header px-2 py-1">
                        <span className="text-[11px] text-panel-text/70">Enemies</span>
                        <Swords className="h-3.5 w-3.5 text-panel-text" aria-label="melee" />
                        <Sparkles className="h-3.5 w-3.5 text-panel-text" aria-label="boss" />
                      </InnerPanel>
                    </div>
                  </div>

                  <div className="col-span-1 flex flex-col items-end justify-center gap-2">
                    <div className="text-right">
                      <p className="text-[11px] text-panel-text/70">Rewards</p>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <InnerPanel className="flex h-8 w-8 items-center justify-center bg-panel-header">
                          <Coins className="h-4 w-4 text-currency" aria-label="gold" />
                        </InnerPanel>
                        <InnerPanel className="flex h-8 w-8 items-center justify-center bg-panel-header">
                          <Gem className="h-4 w-4 text-purple-300" aria-label="shards" />
                        </InnerPanel>
                      </div>
                    </div>
                    <PixelButton
                      variant={m.state === "open" ? "green" : "default"}
                      disabled={m.state !== "open"}
                      className="text-[11px]"
                    >
                      {m.state === "open"
                        ? "Enter"
                        : m.state === "level"
                          ? `Lv. ${m.reqLevel}+`
                          : "Locked"}
                    </PixelButton>
                  </div>
                </div>
              </OuterPanel>
            ))}
          </div>
        </Slot>

        <Slot title="Page banners (no frame — artwork has its own border)" className="lg:col-span-2">

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BANNERS.map((b) => (
              <figure key={b.label}>
                <img
                  src={b.src}
                  alt={`${b.label} page banner`}
                  loading="lazy"
                  className="w-full rounded-md"
                  style={{ imageRendering: "pixelated" }}
                />
                <figcaption className="mt-1 text-center text-[11px] text-white/50">
                  {b.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </Slot>

        <Slot title="Tabs & filters" className="lg:col-span-2">
          <div className="w-full space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["all", ...GEAR_SLOTS] as (GearSlot | "all")[]).map((id) => (
                <PixelButton
                  key={id}
                  onClick={() => setTab(id)}
                  variant={tab === id ? "green" : "default"}
                  className="text-[11px]"
                >
                  {id === "all" ? "All" : SLOT_LABEL[id]}
                </PixelButton>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InnerPanel className="px-2 py-1">
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value as BowRarity | "all")}
                  className="cursor-pointer bg-transparent text-[12px] text-panel-text outline-none"
                >
                  <option value="all">All rarities</option>
                  {BOW_RARITIES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </InnerPanel>
              <InnerPanel className="flex items-center gap-2 px-2 py-1">
                <Search className="h-3.5 w-3.5 text-white/60" />
                <input
                  placeholder="Search…"
                  className="w-40 bg-transparent text-[12px] text-panel-text outline-none placeholder:text-white/40"
                />
              </InnerPanel>
            </div>
          </div>
        </Slot>

        <Slot title="Item cards — owned, equipped, locked" className="lg:col-span-2">
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { rarity: "Common" as BowRarity, state: "owned" },
                { rarity: "Rare" as BowRarity, state: "equipped" },
                { rarity: "Epic" as BowRarity, state: "locked" },
                { rarity: "Legendary" as BowRarity, state: "locked" },
              ] as const
            ).map(({ rarity, state }, i) => {
              const slot = GEAR_SLOTS[i % GEAR_SLOTS.length]!;
              const Icon = SLOT_ICON[slot];
              return (
                <OuterPanel key={rarity} className="bg-panel-description p-2">
                  <div
                    className={`flex h-20 items-center justify-center rounded-md bg-black/40 ring-2 ${RARITY_RING[rarity]}`}
                  >
                    <Icon className="h-8 w-8 text-white/80" />
                  </div>
                  <p className="mt-2 truncate text-[12px] text-panel-text">
                    {gearName(slot, rarity)}
                  </p>
                  <p className={`text-[10px] ${RARITY_TEXT[rarity]}`}>
                    {rarity} · Lv. {state === "locked" ? 1 : 4}
                  </p>
                  <div className="mt-2">
                    {state === "equipped" ? (
                      <PixelButton disabled className="w-full text-[11px]">
                        Equipped
                      </PixelButton>
                    ) : state === "owned" ? (
                      <PixelButton className="w-full text-[11px]">Equip</PixelButton>
                    ) : (
                      <PixelButton variant="green" className="w-full text-[11px]">
                        1,200 g
                      </PixelButton>
                    )}
                  </div>
                </OuterPanel>
              );
            })}
          </div>
        </Slot>

        <Slot title="Detail drawer (right to left)" className="lg:col-span-2">
          <div className="relative h-72 w-full overflow-hidden rounded-md bg-black/30">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="absolute top-4 left-4 cursor-pointer text-[12px] text-white/70 underline"
            >
              open drawer
            </button>
            {drawer && (
              <>
                <div
                  className="absolute inset-0 bg-black/60"
                  onClick={() => setDrawer(false)}
                  aria-hidden
                />
                <aside className="absolute inset-y-0 right-0 w-72 max-w-full overflow-y-auto bg-panel-header p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-pixel text-[11px] text-white text-shadow">Item details</p>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setDrawer(false)}
                      className="cursor-pointer text-white/70 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <InnerPanel className="mt-3 space-y-1 p-2 text-[12px]">
                    <p>Attack +18</p>
                    <p>Defence +4</p>
                    <p>Move speed +2%</p>
                  </InnerPanel>
                  <div className="mt-3 flex flex-col gap-2">
                    <PixelButton variant="green" className="text-[11px]">
                      Equip
                    </PixelButton>
                    <PixelButton className="text-[11px]">Level up — 16 shards</PixelButton>
                    <PixelButton variant="red" className="text-[11px]">
                      Salvage
                    </PixelButton>
                  </div>
                </aside>
              </>
            )}
          </div>
        </Slot>

        <Slot title="Progress rows & milestone claim">
          <div className="w-full space-y-2">
            {[
              { label: "Bosses defeated", value: 3, max: 5, claim: false },
              { label: "Enemies slain", value: 500, max: 500, claim: true },
            ].map((m) => (
              <OuterPanel key={m.label} className="flex items-center gap-3 p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-panel-text">{m.label}</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/15">
                    <div
                      className="h-full rounded-full bg-green-400"
                      style={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }}
                    />
                  </div>
                </div>
                <PixelButton
                  variant={m.claim ? "green" : "default"}
                  disabled={!m.claim}
                  className="text-[11px]"
                >
                  {m.claim ? "Claim" : `${m.value}/${m.max}`}
                </PixelButton>
              </OuterPanel>
            ))}
          </div>
        </Slot>

        <Slot title="Empty & locked states">
          <div className="w-full space-y-3">
            <OuterPanel className="p-6 text-center text-[12px] text-white/60">
              Nothing here yet — clear a stage to earn your first drop.
            </OuterPanel>
            <OuterPanel className="p-4 text-center text-[12px] text-white/50">
              Unlocks at Lv. 12
            </OuterPanel>
          </div>
        </Slot>
      </div>
    </main>
  );
}
