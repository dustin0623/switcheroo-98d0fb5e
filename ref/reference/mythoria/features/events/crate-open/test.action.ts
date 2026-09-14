/**
 * features/events/crate-open/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { openCrate } from "./action";
import { useGameStore } from "@/features/game-store/game-store";

describe("openCrate", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: { "player-a": { username: "player-a" } as never },
      inventory: {
        "player-a": {
          crates: [{ _id: "crate-1", rarity: "common", owner: "player-a", acquired: 0 }],
          items: [],
          consumables: [],
          relics: [],
        },
      },
      nftLogs: {},
    });
  });

  it("returns ok and mints an item", () => {
    const result = openCrate("player-a", "crate-1");
    expect(result.ok).toBe(true);
    expect(result.item).toBeDefined();
    expect(result.item?.owner).toBe("player-a");
  });

  it("removes the crate from inventory", () => {
    openCrate("player-a", "crate-1");
    const inv = useGameStore.getState().inventory["player-a"];
    expect(inv.crates).toHaveLength(0);
  });

  it("adds the item to inventory", () => {
    openCrate("player-a", "crate-1");
    const inv = useGameStore.getState().inventory["player-a"];
    expect(inv.items).toHaveLength(1);
  });

  it("rejects unknown crate id", () => {
    const result = openCrate("player-a", "crate-99");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Crate not found");
  });

  it("rejects missing inventory", () => {
    const result = openCrate("unknown", "crate-1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("No inventory");
  });
});
