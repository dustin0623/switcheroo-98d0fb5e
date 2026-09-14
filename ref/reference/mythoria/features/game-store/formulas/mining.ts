// Mirrors docs §6 Adventure and §7 Claim
const ENG_SOFTCAP = 333;
const ENG_SOFTCAP_RATE = 0.5;

export function computeDecayMultiplier(lastUpgradeTime: number | undefined, nowMs: number): number {
  if (!lastUpgradeTime) return 1.0;
  const daysSince = Math.max(0, (nowMs - lastUpgradeTime) / 86400000);
  if (daysSince <= 14) return 1.0;
  const weeks = Math.floor((daysSince - 14) / 7);
  return Math.max(Math.pow(0.9, weeks), 0.25);
}

// $MGOLD per HOUR. Wiki formula: rate/h = (level + 1)² / 48
// (i.e. it takes 48h of mining at level L to earn the cost of the next upgrade)
export function computeMineRate(engineeringLevel: number, lastUpgradeTime: number | undefined, nowMs: number): number {
  const eng = engineeringLevel || 0;
  const effective = eng > ENG_SOFTCAP ? ENG_SOFTCAP + (eng - ENG_SOFTCAP) * ENG_SOFTCAP_RATE : eng;
  const nextUpgradeCost = Math.pow(effective + 1, 2);
  const baseRatePerHour = nextUpgradeCost / 48;
  return baseRatePerHour * computeDecayMultiplier(lastUpgradeTime, nowMs);
}

export function computeCurrentScrap(user: {
  unclaimedAether?: number;
  cooldown?: number;
  last_upgrade_time?: number;
  lastregen?: number;
  stats?: { arcane?: number };
  arcane?: number;
  staked?: number;
}, nowMs: number): number {
  const eng = user.arcane ?? user.stats?.arcane ?? 0;
  const ratePerHour = computeMineRate(eng, user.last_upgrade_time, nowMs);
  const stashsize = (user.staked || 0) + 1;
  // Anchor accumulation to the last mining checkpoint — falls back to the
  // last upgrade / last regen timestamp when no explicit mine time exists.
  // lastregen is the client-side alias; lastRewardTime is the DB field name
  const anchorMs = (user as unknown as { lastRewardTime?: number }).lastRewardTime || user.lastregen || user.last_upgrade_time || nowMs;
  const hoursElapsed = Math.max((nowMs - anchorMs) / 3_600_000, 0);
  const accumulated = (user.unclaimedAether || 0) + ratePerHour * hoursElapsed;
  return Math.min(accumulated, stashsize);
}

export function computeCurrentClaims(user: { claims: number; lastclaim?: number }, nowMs: number) {
  const stored = user.claims || 0;
  const hoursSince = Math.floor((nowMs - (user.lastclaim || 0)) / 3600000);
  const regenAmount = Math.max(0, Math.floor(hoursSince / 4));
  const current = Math.min(stored + regenAmount, 5);
  const newLastclaim = regenAmount > 0 ? (user.lastclaim || 0) + regenAmount * 4 * 3600000 : (user.lastclaim || 0);
  return { current, newLastclaim };
}
