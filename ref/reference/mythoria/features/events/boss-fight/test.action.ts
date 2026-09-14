/**
 * features/events/boss-fight/test.action.ts
 */

import { describe, it, expect } from "vitest";
import { canFightBoss } from "./action";
import type { Player } from "@/features/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    username: "player-a",
    level: 10,
    flux: 5,
    boss_data: [{ name: "Mythoria", level: 1, lastBattle: 0 }],
    stats: { damage: 0, defense: 0, arcane: 1, dodge: 0, crit: 0, luck: 50 },
    items: {},
    consumables: {},
    ...overrides,
  } as Player;
}

describe("canFightBoss", () => {
  it("allows a fight when all conditions met", () => {
    const result = canFightBoss(makePlayer(), "Mythoria");
    expect(result.ok).toBe(true);
  });

  it("rejects unknown planet", () => {
    const result = canFightBoss(makePlayer(), "Unknown");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Unknown planet");
  });

  it("rejects when planet not unlocked", () => {
    const result = canFightBoss(makePlayer({ boss_data: [] }), "Mythoria");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Planet locked");
  });

  it("rejects when level too low", () => {
    const player = makePlayer({ level: 0, boss_data: [{ name: "Mythoria", level: 5, lastBattle: 0 }] });
    const result = canFightBoss(player, "Mythoria");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Level too low");
  });

  it("rejects when not enough FLUX", () => {
    const result = canFightBoss(makePlayer({ flux: 0 }), "Mythoria");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Not enough FLUX");
  });

  it("rejects when boss on cooldown", () => {
    const player = makePlayer({ boss_data: [{ name: "Mythoria", level: 1, lastBattle: Date.now() }] });
    const result = canFightBoss(player, "Mythoria");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Boss on cooldown");
  });
});
