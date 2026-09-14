// Docs §29 — Experience & Leveling.
// XP sources: engineering/damage/defense upgrades (= SCRAP cost), favor
// contribution (= SCRAP burnt), boss fight (+100), quest collect (T1=25 …
// T5=400). Level gates quest tiers at L1/10/25/50/100 and planets via
// boss_data thresholds.
//
// Reference API curve (reverse-engineered from live player screenshots):
//   XP required to reach level N+1 (cumulative) = N^2 * 1000
//   level(xp) = floor(sqrt(xp / 1000)) + 1
// Each level costs (2*level - 1) * 1000 XP.
// `experience` on the player is the CUMULATIVE total XP earned.

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(xp, 0) / 1000)) + 1;
}

// Total cumulative XP required to reach the given level.
export function xpForNextLevel(level: number): number {
  return Math.pow(Math.max(level, 1), 2) * 1000;
}

// Back-compat alias (still returns the cumulative threshold for the level).
export function xpToNextFromLevel(level: number): number {
  return xpForNextLevel(level);
}

export function applyXp(current: { level: number; experience: number }, xpGain: number) {
  const experience = Math.max(0, (current.experience || 0)) + Math.max(0, xpGain || 0);
  const level = levelFromXp(experience);
  return { level, experience };
}
