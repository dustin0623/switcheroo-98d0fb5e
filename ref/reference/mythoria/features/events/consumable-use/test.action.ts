/**
 * features/events/consumable-use/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useConsumable } from "./action";
import { useGameStore } from "@/features/game-store/game-store";

describe("useConsumable", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: { "player-a": { username: "player-a", consumables: {} } as never },
      inventory: {
        "player-a": {
          consumables: [{ type: "focus", amount: 2 }],
          items: [],
          crates: [],
          relics: [],
        },
      },
    });
  });

  it("decrements consumable amount on use", () => {
    const result = useConsumable("player-a", "focus");
    expect(result.ok).toBe(true);
    const inv = useGameStore.getState().inventory["player-a"];
    expect(inv.consumables.find((c) => c.type === "focus")?.amount).toBe(1);
  });

  it("rejects when no consumable available", () => {
    const result = useConsumable("player-a", "rage");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("No consumable");
  });

  it("rejects when player does not exist", () => {
    const result = useConsumable("unknown", "focus");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("No player");
  });
});
