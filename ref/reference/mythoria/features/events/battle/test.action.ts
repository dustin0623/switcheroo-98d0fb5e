/**
 * features/events/battle/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { attackPlayer } from "./action";
import { useGameStore } from "@/features/game-store/game-store";
import type { Player } from "@/features/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    username: "player-a",
    level: 5,
    scrap: 100,
    balance: 0,
    arcane: 1,
    damage: 10,
    defense: 10,
    mgold: 0,
    staked: 200,
    attacks: 3,
    lastregen: 0,
    lastBattle: 0,
    cooldown: 0,
    lastPayout: 0,
    lastclaim: 0,
    claims: 3,
    flux: 0,
    favor: 0,
    stats: { damage: 0, defense: 0, arcane: 1, dodge: 0, crit: 0, luck: 0 },
    items: {},
    boss_data: [],
    consumables: {},
    ...overrides,
  } as Player;
}

describe("attackPlayer", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: {
        "player-a": makePlayer({ username: "player-a", staked: 200 }),
        "player-b": makePlayer({ username: "player-b", scrap: 50 }),
      },
    });
  });

  it("returns error when attacker is missing", () => {
    const result = attackPlayer("unknown", "player-b");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Missing player");
  });

  it("returns error when target is missing", () => {
    const result = attackPlayer("player-a", "unknown");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Missing player");
  });
});
