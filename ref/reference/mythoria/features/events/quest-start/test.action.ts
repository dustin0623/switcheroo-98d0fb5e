/**
 * features/events/quest-start/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { startQuest } from "./action";
import { useGameStore } from "@/features/game-store/game-store";
import type { Player, QuestBoardSlot } from "@/features/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    username: "player-a",
    level: 5,
    mgold: 1000,
    staked: 0,
    items: {},
    stats: { damage: 10, defense: 0, arcane: 1, dodge: 0, crit: 0, luck: 0 },
    version: 0,
    ...overrides,
  } as Player;
}

const slot: QuestBoardSlot = {
  quest_type: "mining",
  tier: "I",
  name: "Mining Run",
  flavor: "Dig deep.",
  image_url: "",
  duration_hours: 1,
  base_rolls: 3,
  mgold_cost: 50,
};

describe("startQuest", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: { "player-a": makePlayer() },
      quests: {},
      questBoard: { date: "2026-07-27", slots: [] },
    });
  });

  it("returns error when player not found", () => {
    const result = startQuest("unknown", slot);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("No player");
  });

  it("deducts scrap cost on success", () => {
    const result = startQuest("player-a", slot);
    if (result.ok) {
      const player = useGameStore.getState().players["player-a"];
      expect(player.mgold).toBeLessThan(1000);
    }
  });

  it("adds quest to state on success", () => {
    startQuest("player-a", slot);
    const quests = useGameStore.getState().quests["player-a"];
    expect(quests?.length).toBeGreaterThan(0);
  });
});
