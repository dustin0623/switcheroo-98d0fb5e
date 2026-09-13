/**
 * Every in-game panel, modal and HUD widget lives here so both the live game
 * (ArenaCanvas) and the /test-modals gallery render exactly the same UI.
 */
import React from "react";
import clsx from "clsx";
import { Coins, Skull, Star, Swords } from "lucide-react";
import { OuterPanel, InnerPanel, Label, PixelButton, frame, darkBorder, greenBorder } from "@/components/ui/pixel-panel";
import { BOWS, bowStats, MAX_STARS } from "@/features/game/bow";
import { getLevelProgress } from "@/features/game/experience";
import type { HudState } from "@/features/game/hud";
import { getMap } from "@/features/game/campaign";
import {
  SKILL_BRANCHES,
  SKILL_TREE,
  canLearn,
  getSkillModifiers,
  type SkillDef,
  type SkillId,
  type SkillRanks,
} from "@/features/game/skill-tree";

export const ICONS = {
  bow: "/assets/icons/bow.png",
};

/** Icon + value readout used across the HUD panels. */
export function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[14px] tabular-nums">{value}</span>
    </div>
  );
}

const GoldIcon = <Coins className="h-4 w-4 text-gold" aria-label="gold" />;
const SkullIcon = <Skull className="h-4 w-4 text-hud-text" aria-label="enemies left" />;
const KillsIcon = <Swords className="h-4 w-4 text-hud-text" aria-label="kills" />;

/** Circular frog portrait — the hero of ARCOON. */
export function FrogAvatar({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "shrink-0 overflow-hidden rounded-full bg-leaf-dim ring-2 ring-leaf/70",
        className,
      )}
    >
      <img src="/assets/brand/frog.png" alt="Frog avatar" className="h-full w-full object-cover" />
    </div>
  );
}

/** Row of filled/empty stars showing a bow's upgrade level. */
export function StarRow({ stars, className }: { stars: number; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-0.5", className)} aria-label={`${stars} stars`}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Star
          key={i}
          className={clsx("h-3 w-3", i < stars ? "fill-yellow-300 text-yellow-300" : "text-brown-100/50")}
        />
      ))}
    </span>
  );
}

/** Compact, three-part battle header inspired by the game's pixel-art reference. */
export function TopBar({ hud, onOpenSkills }: { hud: HudState; onOpenSkills?: () => void }) {
  const progress = getLevelProgress(hud.xp);
  const total = Math.max(hud.enemiesTotal, hud.enemiesLeft, 1);
  const cleared = Math.max(0, total - hud.enemiesLeft);
  const waveRatio = hud.intermission ? 1 : cleared / total;
  const waveLabel = hud.boss && !hud.intermission ? getMap(hud.mapId).boss : hud.intermission ? "Next wave in..." : `${hud.enemiesLeft} left`;

  const panelStyle = frame(darkBorder, "6px", "12px");

  return (
    <div className="pointer-events-auto mx-auto grid w-full max-w-5xl grid-cols-3 items-center px-1 sm:px-2">
      {/* Left side panel — level and skills only */}
      <div
        className="flex h-12 items-center gap-2 justify-self-start bg-hud-panel px-2 py-1 text-hud-text text-shadow shadow-lg sm:h-14 sm:gap-3 sm:px-3"
        style={panelStyle}
      >
        <div className="flex min-w-12 flex-col gap-0.5 sm:min-w-16">
          <span className="font-pixel text-[8px] leading-3 text-hud-text">Lv {progress.level}</span>
          <div className="h-2 overflow-hidden rounded-full bg-hud-border ring-1 ring-hud-highlight">
            <div className="h-full rounded-full bg-neon transition-[width] duration-300" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </div>
        </div>

        {onOpenSkills && (
          <PixelButton className="hidden h-8 px-2 py-0 sm:flex" onClick={onOpenSkills}>
            <span className="flex items-center gap-1.5 font-pixel text-[8px]">
              <img src="/assets/icons/book.png" alt="" className="h-4 w-4 object-contain" />
              Skills{hud.skillPoints > 0 ? ` (${hud.skillPoints})` : ""}
            </span>
          </PixelButton>
        )}
      </div>

      {/* Center Wave panel — dark, no green border or corner diamonds */}
      <div
        className="flex h-16 w-44 flex-col items-center justify-center justify-self-center bg-hud-panel-dark px-2 py-1 text-hud-text text-shadow shadow-lg sm:h-20 sm:w-56"
        style={panelStyle}
      >
        <div className="flex items-center gap-2">
          <Swords className="h-3.5 w-3.5 text-hud-text" />
          <span className="font-pixel text-[9px] leading-4 tracking-widest sm:text-[10px]">Wave {hud.wave}</span>
          <Swords className="h-3.5 w-3.5 text-hud-text" />
        </div>

        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-hud-border ring-1 ring-hud-highlight">
          <div className="h-full rounded-full bg-rose transition-[width] duration-300" style={{ width: `${Math.round(waveRatio * 100)}%` }} />
        </div>

        <p className="mt-0.5 truncate font-pixel text-[6px] leading-3 text-hud-muted">{waveLabel}</p>
      </div>

      {/* Right side panel */}
      <div
        className="flex h-12 items-center justify-end gap-2 justify-self-end bg-hud-panel px-2 py-1 text-hud-text text-shadow shadow-lg sm:h-14 sm:gap-3 sm:px-3"
        style={panelStyle}
      >
        <div className="flex items-center gap-1 px-1.5 sm:px-2.5">
          {SkullIcon}<span className="font-pixel text-[8px] tabular-nums">{hud.enemiesLeft}</span>
        </div>
        <div className="h-6 w-px bg-hud-border/30" />
        <div className="hidden items-center gap-1 px-2.5 sm:flex">
          {KillsIcon}<span className="font-pixel text-[8px] tabular-nums">{hud.kills}</span>
        </div>
        <div className="h-6 w-px bg-hud-border/30 hidden sm:block" />
        <div className="flex items-center gap-1 px-1.5 sm:px-2.5">
          {GoldIcon}<span className="font-pixel text-[8px] tabular-nums text-gold">{hud.goldEarned}</span>
        </div>
      </div>
    </div>
  );
}

/** Thin experience bar flush with the bottom edge, level info floating above it. */
export function XpBar({ xp, className }: { xp: number; className?: string }) {
  const p = getLevelProgress(xp);

  return (
    <div className={clsx("pointer-events-auto absolute inset-x-0 bottom-0", className)}>
      {/* Small readout row sitting just above the bar */}
      <div className="flex items-end justify-center px-2 pb-1">
        <span className="text-[13px] text-white text-outline tabular-nums">
          {p.maxed ? "MAX LEVEL" : `${p.into} / ${p.needed} XP`}
        </span>
      </div>

      {/* The bar itself, flush with the screen edge */}
      <div className="relative h-2.5 w-full overflow-hidden bg-black/60">
        <div
          className="h-full bg-neon transition-[width] duration-300"
          style={{ width: `${Math.round(p.ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Loading screen shown while the arena assets stream in. */
export function LoadingOverlay({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1b1526] font-body">
      <p className="text-[15px] tracking-widest text-white text-outline">LOADING ARCOON</p>
      <OuterPanel className="w-56 px-2 py-1.5">
        <div className="h-3 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-neon transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </OuterPanel>
    </div>
  );
}

/** Between-waves breather: shows the equipped bow and starts the next wave. */
export function WaveBreakModal({ hud, onFight }: { hud: HudState; onFight: () => void }) {
  const stats = bowStats(hud.bowRarity, hud.bowStars);
  const nextIsBoss = hud.wave + 1 >= hud.stageWaves;

  return (
    <OuterPanel className="w-full max-w-sm">
      <div className="flex justify-center">
        <Label className="-mt-4 mb-1 text-[11px]">
          {nextIsBoss ? `${getMap(hud.mapId).boss} awaits` : `Wave ${hud.wave + 1} incoming`}
        </Label>
      </div>

      <InnerPanel className="p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src={ICONS.bow} alt="bow" className="h-6 w-6 object-contain" />
            <div>
              <p className="text-[14px]">{BOWS[hud.bowRarity].name}</p>
              <p className="text-[12px] opacity-80 tabular-nums">
                {stats.damage} dmg · {stats.rangeTiles} tiles ·{" "}
                {(1000 / stats.fireRateMs).toFixed(1)}/s
              </p>
            </div>
          </div>
          <StarRow stars={hud.bowStars} />
        </div>
      </InnerPanel>

      <InnerPanel className="mt-1 p-2">
        <div className="flex items-center justify-between">
          <Stat icon={GoldIcon} value={`${hud.goldEarned}`} />
          <span className="text-[12px] opacity-80">Banked when the stage ends</span>
        </div>
      </InnerPanel>

      <PixelButton variant="green" className="mt-1 w-full" onClick={onFight}>
        <span className="text-[13px]">Fight</span>
      </PixelButton>
    </OuterPanel>
  );
}

/** End-of-run summary. Half the gold earned is kept on a defeat. */
export function GameOverModal({
  hud,
  onRestart,
  onHome,
}: {
  hud: HudState;
  onRestart: () => void;
  onHome?: () => void;
}) {
  return (
    <OuterPanel className="w-full max-w-sm text-center">
      <div className="flex justify-center">
        <Label className="-mt-4 mb-1 text-[11px]">Defeated</Label>
      </div>
      <InnerPanel className="space-y-1 p-3">
        <p className="text-[14px] tabular-nums">
          Reached wave {hud.wave} · level {hud.level}
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <Stat icon={KillsIcon} value={`${hud.kills}`} />
          <Stat icon={GoldIcon} value={`${Math.floor(hud.goldEarned / 2)}`} />
        </div>
        <p className="text-[12px] opacity-80">Half your gold makes it home.</p>
        <p className="pt-1 text-[14px] tabular-nums">{hud.score} points</p>
      </InnerPanel>
      <div className="mt-1 flex gap-1">
        <PixelButton variant="green" className="flex-1" onClick={onRestart}>
          <span className="text-[13px]">Retry</span>
        </PixelButton>
        {onHome && (
          <PixelButton variant="red" className="flex-1" onClick={onHome}>
            <span className="text-[13px]">World map</span>
          </PixelButton>
        )}
      </div>
    </OuterPanel>
  );
}

/** Stage-clear summary with links back to the map screen or the next stage. */
export function VictoryModal({
  hud,
  onNextStage,
  onHome,
}: {
  hud: HudState;
  onNextStage: (() => void) | null;
  onHome: () => void;
}) {
  return (
    <OuterPanel className="w-full max-w-sm text-center">
      <div className="flex justify-center">
        <Label className="-mt-4 mb-1 text-[11px]">Stage Clear</Label>
      </div>
      <InnerPanel className="space-y-1 p-3">
        <p className="text-[14px] tabular-nums">
          {getMap(hud.mapId).name} · stage {hud.stage} · {hud.stageWaves} waves
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <Stat icon={KillsIcon} value={`${hud.kills}`} />
          <Stat icon={GoldIcon} value={`${hud.goldEarned}`} />
        </div>
        <p className="pt-1 text-[14px] tabular-nums">{hud.score} points</p>
      </InnerPanel>
      <div className="mt-1 flex gap-1">
        {onNextStage && (
          <PixelButton variant="green" className="flex-1" onClick={onNextStage}>
            <span className="text-[13px]">Next stage</span>
          </PixelButton>
        )}
        <PixelButton variant="red" className="flex-1" onClick={onHome}>
          <span className="text-[13px]">World map</span>
        </PixelButton>
      </div>
    </OuterPanel>
  );
}

/** Floating banner shown for a moment after each level-up. */
export function LevelUpToast({ level }: { level: number }) {
  return (
    <OuterPanel className="px-3 py-2 text-center">
      <p className="text-[14px] text-white">Level {level}!</p>
      <p className="text-[12px] opacity-80">+1 skill point</p>
    </OuterPanel>
  );
}

function SkillNode({
  skill,
  ranks,
  points,
  onLearn,
}: {
  skill: SkillDef;
  ranks: SkillRanks;
  points: number;
  onLearn: (id: SkillId) => void;
}) {
  const rank = ranks[skill.id] ?? 0;
  const locked = !!skill.requires && (ranks[skill.requires] ?? 0) < 1;
  const learnable = canLearn(skill, ranks, points);

  return (
    <InnerPanel className={clsx("p-1.5", locked && "opacity-60")}>
      <div className="flex items-center gap-2">
        <img
          src={skill.icon}
          alt=""
          className={clsx("h-5 w-5 shrink-0 object-contain", locked && "grayscale")}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px]">{skill.name}</p>
          <p className="truncate text-[12px] opacity-80">{skill.effect}</p>
        </div>
        <span className="shrink-0 text-[12px] tabular-nums">
          {rank}/{skill.maxRank}
        </span>
        <button
          type="button"
          disabled={!learnable}
          onClick={() => onLearn(skill.id)}
          className="shrink-0 rounded-full bg-brown-200 px-2 py-0.5 text-[13px] text-white text-shadow disabled:opacity-40"
        >
          +
        </button>
      </div>
    </InnerPanel>
  );
}

/** Skill tree: spend level-up points across the three branches. */
export function SkillTreeModal({
  ranks,
  points,
  onLearn,
  onClose,
}: {
  ranks: SkillRanks;
  points: number;
  onLearn: (id: SkillId) => void;
  onClose: () => void;
}) {
  const mods = getSkillModifiers(ranks);

  return (
    <OuterPanel className="w-full max-w-md">
      <div className="flex justify-center">
        <Label className="-mt-4 mb-1 text-[11px]">Skill tree · {points} points</Label>
      </div>

      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-0.5">
        {SKILL_BRANCHES.map((branch) => (
          <div key={branch}>
            <p className="mb-1 text-[13px] opacity-80">{branch}</p>
            <div className="space-y-1">
              {SKILL_TREE.filter((s) => s.branch === branch).map((skill) => (
                <SkillNode
                  key={skill.id}
                  skill={skill}
                  ranks={ranks}
                  points={points}
                  onLearn={onLearn}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <InnerPanel className="mt-1 p-2">
        <p className="text-[12px] tabular-nums">
          DMG x{mods.damageMult.toFixed(2)} · RATE x{mods.fireRateMult.toFixed(2)} · SPD x
          {mods.speedMult.toFixed(2)} · GOLD x{mods.goldMult.toFixed(2)} · XP x
          {mods.xpMult.toFixed(2)}
        </p>
      </InnerPanel>

      <PixelButton className="mt-1 w-full" onClick={onClose}>
        <span className="text-[13px]">Close</span>
      </PixelButton>
    </OuterPanel>
  );
}

