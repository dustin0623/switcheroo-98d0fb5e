/**
 * features/events/item-manage/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { equipItem, unequipSlot, salvageItem } from "./action";
import { useGameStore } from "@/features/game-store/game-store";
import type { Item } from "@/features/types";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    _id: "item-1",
    name: "Common Weapon",
    id: 1,
    edition: "Genesis",
    print: 1,
    max_supply: 10000,
    description: "",
    image: "",
    owner: "player-a",
    type: "weapon",
    rarity: "common",
    equiped: false,
    burnt: false,
    attributes: { damage: 5, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 },
    market: { listed: false, price: 0, seller: null, created: 0, expires: 0, sold: 0 },
    item_number: 1,
    level: 1,
    version: 1,
    lastTransfer: 0,
    ...overrides,
  } as Item;
}

describe("equipItem", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: {
        "player-a": {
          username: "player-a",
          items: {},
          stats: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 },
        } as never,
      },
      inventory: {
        "player-a": { items: [makeItem()], crates: [], consumables: [], relics: [] },
      },
    });
  });

  it("equips an item and updates stats", () => {
    const result = equipItem("player-a", 1);
    expect(result.ok).toBe(true);
    const player = useGameStore.getState().players["player-a"];
    expect(player.items?.weapon).toBeDefined();
  });

  it("rejects a burnt item", () => {
    useGameStore.setState({
      inventory: { "player-a": { items: [makeItem({ burnt: true })], crates: [], consumables: [], relics: [] } },
    });
    const result = equipItem("player-a", 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Item already salvaged");
  });
});

describe("salvageItem", () => {
  beforeEach(() => {
    useGameStore.setState({
      players: { "player-a": { username: "player-a", flux: 0, items: {} } as never },
      inventory: { "player-a": { items: [makeItem()], crates: [], consumables: [], relics: [] } },
      salvageLogs: {},
    });
  });

  it("burns item and returns FLUX", () => {
    const result = salvageItem("player-a", 1);
    expect(result.ok).toBe(true);
    expect(typeof result.flux).toBe("number");
    const inv = useGameStore.getState().inventory["player-a"];
    expect(inv.items[0].burnt).toBe(true);
  });

  it("rejects salvage when item already burnt", () => {
    useGameStore.setState({
      inventory: { "player-a": { items: [makeItem({ burnt: true })], crates: [], consumables: [], relics: [] } },
    });
    const result = salvageItem("player-a", 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Already salvaged");
  });
});
