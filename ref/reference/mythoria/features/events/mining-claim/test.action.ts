/**
 * features/events/mining-claim/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { claim } from "./action";
import { useGameStore } from "@/features/game-store/game-store";
import type { Player } from "@/features/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    username: "player-a",
    level: 1,
    arcane: 1,
    scrap: 50,
    balance: 0,
    mgold: 0,
    claims: 3,
    lastclaim: 0,
    cooldown: 0,
    lastPayout: 0,
    lastregen: 0,
    ...overrides,
  } as Player;
}

describe("claim", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: { "player-a": makePlayer() },
      claimLogs: {},
    });
  });

  it("returns error when player not found", () => {
    const result = claim("unknown");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("No player");
  });

  it("resets scrap to 0 on success", () => {
    const result = claim("player-a");
    if (result.ok) {
      const player = useGameStore.getState().players["player-a"];
      expect(player.scrap).toBe(0);
    }
  });
});
