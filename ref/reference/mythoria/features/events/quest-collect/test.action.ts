/**
 * features/events/quest-collect/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { collectQuest } from "./action";
import { useGameStore } from "@/features/game-store/game-store";
import type { Player, Quest } from "@/features/types";

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    _id: "quest-1",
    username: "player-a",
    quest_type: "mining",
    tier: "I",
    name: "Mining Run",
    flavor: "",
    image_url: "",
    primary_stat: "arcane",
    required_item_type: "weapon",
    mgold_paid: 50,
    base_rolls: 3,
    duration_hours: 1,
    equipped_item_rarity: "common",
    equipped_item_level: 1,
    effective_primary_stat: 1,
    started_at: Date.now() - 7200000,
    completes_at: Date.now() - 3600000,
    expires_at: Date.now() + 86400000,
    collected: false,
    time_remaining_ms: 0,
    board_date: "2026-07-27",
    ...overrides,
  } as Quest;
}

describe("collectQuest", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: {
        "player-a": {
          username: "player-a",
          level: 5,
          experience: 0,
          version: 0,
        } as unknown as Player,
      },
      quests: { "player-a": [makeQuest()] },
      inventory: { "player-a": { relics: [], items: [], crates: [], consumables: [] } },
    });
  });

  it("marks quest as collected", () => {
    const result = collectQuest("player-a", "quest-1");
    expect(result.ok).toBe(true);
    const quests = useGameStore.getState().quests["player-a"];
    expect(quests[0].collected).toBe(true);
  });

  it("rejects already collected quest", () => {
    useGameStore.setState({ quests: { "player-a": [makeQuest({ collected: true })] } });
    const result = collectQuest("player-a", "quest-1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Already collected");
  });

  it("rejects quest not yet complete", () => {
    const future = Date.now() + 9999999;
    useGameStore.setState({ quests: { "player-a": [makeQuest({ completes_at: future })] } });
    const result = collectQuest("player-a", "quest-1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Quest not complete");
  });

  it("rejects unknown quest id", () => {
    const result = collectQuest("player-a", "quest-99");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Quest not found");
  });
});
