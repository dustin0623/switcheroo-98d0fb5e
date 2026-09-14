/**
 * features/events/scrap-stake/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { stakeScrap } from "./action";
import { useGameStore } from "@/features/game-store/game-store";
import type { Player } from "@/features/types";

describe("stakeScrap", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: {
        "player-a": {
          username: "player-a",
          mgold: 500,
          staked: 100,
          version: 0,
        } as unknown as Player,
      },
    });
  });

  it("transfers scrap to stake", () => {
    const result = stakeScrap("player-a", 200);
    expect(result.ok).toBe(true);
    const player = useGameStore.getState().players["player-a"];
    expect(player.mgold).toBe(300);
    expect(player.staked).toBe(300);
  });

  it("rejects zero amount", () => {
    const result = stakeScrap("player-a", 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Enter a valid amount");
  });

  it("rejects insufficient balance", () => {
    const result = stakeScrap("player-a", 9999);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Not enough $AETHER in balance");
  });

  it("rejects unknown player", () => {
    const result = stakeScrap("unknown", 100);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("No player");
  });
});
