import { RARITY_KEYS, RIVAL_COUNT, RIVAL_RAID_COOLDOWN_MS, SLOT_KEYS } from "@/features/constants/game";
import { generateEquipment } from "@/features/game/equipment";
import { createId, pickOne, randomAddress, randomInt, randomUsername, shuffle } from "@/features/game/random";
import type { Equipment, RaidOutcome, Rival } from "@/features/types/game";

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Reference-game prerequisite: you can only break in when your Hack Power
 * beats the target's Security.
 */
export const canRaid = (hackPower: number, enemySecurity: number): boolean =>
  hackPower > enemySecurity;

/**
 * Display chance: the raid lands unless the firewall (dodge) roll saves the
 * target, so the odds are purely the inverse of their firewall.
 */
export const raidSuccessChance = (hackPower: number, enemySecurity: number, firewall = 0): number =>
  canRaid(hackPower, enemySecurity) ? 100 - clamp(firewall, 0, 100) : 0;

/**
 * Steal percentage: a uniform roll whose minimum is raised by Exploit.
 * Exploit 0 -> 0–100%, Exploit 50 -> 50–100%.
 */
export const rollStealPercent = (exploit: number): number => {
  const floor = clamp(exploit, 0, 100);
  const rolled = Math.random() * (100 - floor + 1) + floor;
  return Math.min(100, Math.round(rolled));
};

export interface RaidInput {
  hackPower: number;
  exploit: number;
  enemy: Pick<Rival, "security" | "firewall" | "vault">;
  /** Free space left in the raider's own vault; steals are capped by it. */
  vaultSpace?: number;
}

export const resolveRaid = ({ hackPower, exploit, enemy, vaultSpace }: RaidInput): RaidOutcome => {
  const chance = raidSuccessChance(hackPower, enemy.security, enemy.firewall);

  // Outmatched: the attempt never happens (no charge is spent).
  if (!canRaid(hackPower, enemy.security)) {
    return { success: false, reason: "outmatched", chance, stealPercent: 0, stolen: 0 };
  }

  // Firewall (dodge) check: a roll inside the firewall window negates the raid.
  const firewallRoll = randomInt(1, 100);
  if (firewallRoll <= clamp(enemy.firewall, 0, 100)) {
    return { success: false, reason: "blocked", chance, stealPercent: 0, stolen: 0 };
  }

  const stealPercent = rollStealPercent(exploit);
  let stolen = Math.floor(enemy.vault * (stealPercent / 100));
  if (vaultSpace !== undefined) stolen = Math.min(stolen, Math.max(0, Math.floor(vaultSpace)));

  if (stolen <= 0) {
    return { success: false, reason: "failed", chance, stealPercent, stolen: 0 };
  }
  return { success: true, reason: "success", chance, stealPercent, stolen };
};

export const rivalOnCooldown = (rival: Rival, now = Date.now()): boolean =>
  Boolean(rival.lastRaidedAt && now - rival.lastRaidedAt < RIVAL_RAID_COOLDOWN_MS);

/** Rival state after a raid: vault drained and a short protection cooldown. */
export const applyRaidToRival = (rival: Rival, outcome: RaidOutcome): Rival => ({
  ...rival,
  vault: Math.max(0, rival.vault - outcome.stolen),
  security: outcome.success ? Math.max(0, Math.round(rival.security * 0.85)) : rival.security,
  raided: true,
  lastRaidedAt: Date.now(),
});

/**
 * Rivals are scaled to the player's Hack Power so the target list always has
 * a mix of soft targets and stretch targets instead of being unbeatable.
 */
export const generateRival = (playerHackPower = 1): Rival => {
  const power = Math.max(1, playerHackPower);
  const hashRate = randomInt(Math.max(1, Math.round(power * 0.5)), Math.round(power * 6) + 8);
  const security = randomInt(
    Math.max(0, Math.round(power * 0.2)),
    Math.max(1, Math.round(power * 1.4)),
  );
  const slots = shuffle(SLOT_KEYS).slice(0, randomInt(0, SLOT_KEYS.length));
  const equipped: Equipment[] = slots.map((slot) => ({
    ...generateEquipment({ slot, rarity: pickOne(RARITY_KEYS) }),
    equipped: true,
  }));
  return {
    id: createId("rv"),
    username: randomUsername(),
    avatarSeed: createId("av"),
    address: randomAddress(),
    level: randomInt(1, Math.max(2, Math.round(power / 4) + 3)),
    claims: randomInt(0, 12),
    attacks: randomInt(0, 6),
    hashRate,
    vault: randomInt(hashRate * 4, hashRate * 40),
    security,
    firewall: randomInt(1, 40),
    hackPower: randomInt(Math.max(1, Math.round(power * 0.4)), Math.round(power * 1.6) + 2),
    equipped,
    raided: false,
    lastRaidedAt: null,
  };
};

export const generateRivals = (playerHackPower = 1, count: number = RIVAL_COUNT): Rival[] =>
  Array.from({ length: count }, () => generateRival(playerHackPower));
