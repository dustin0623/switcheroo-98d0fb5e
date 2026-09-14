/**
 * features/events/upgrade/test.action.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { upgrade, contributeFavor } from "./action";
import { useGameStore } from "@/features/game-store/game-store";
import type { Player } from "@/features/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    username: "player-a",
    level: 1,
    experience: 0,
    arcane: 0,
    damage: 0,
    defense: 0,
    mgold: 9999,
    staked: 0,
    balance: 0,
    favor: 0,
    stats: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 },
    version: 0,
    ...overrides,
  } as Player;
}

describe("upgrade", () => {
  beforeEach(() => {
    useGameStore.setState({ players: { "player-a": makePlayer() } });
  });

  it("increments engineering and deducts cost", () => {
    const result = upgrade("player-a", "arcane");
    expect(result.ok).toBe(true);
    const player = useGameStore.getState().players["player-a"];
    expect(player.engineering).toBe(1);
    expect(player.mgold).toBeLessThan(9999);
  });

  it("increments damage", () => {
    const result = upgrade("player-a", "damage");
    expect(result.ok).toBe(true);
    const player = useGameStore.getState().players["player-a"];
    expect(player.damage).toBe(10);
  });

  it("rejects when insufficient balance", () => {
    useGameStore.setState({ players: { "player-a": makePlayer({ mgold: 0 }) } });
    const result = upgrade("player-a", "damage");
    expect(result.ok).toBe(false);
  });

  it("rejects unknown player", () => {
    const result = upgrade("unknown", "damage");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("No player");
  });
});

describe("contributeFavor", () => {
  beforeEach(() => {
    useGameStore.setState({ players: { "player-a": makePlayer() } });
  });

  it("adds favor and deducts scrap", () => {
    const result = contributeFavor("player-a", 100);
    expect(result.ok).toBe(true);
    const player = useGameStore.getState().players["player-a"];
    expect(player.favor).toBe(100);
    expect(player.mgold).toBe(9899);
  });

  it("rejects insufficient scrap", () => {
    const result = contributeFavor("player-a", 99999);
    expect(result.ok).toBe(false);
  });
});
