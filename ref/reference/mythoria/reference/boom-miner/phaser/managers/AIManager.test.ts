import { describe, expect, it, vi } from "vitest";
import { TileType } from "@/features/types/TileTypes";
import { AIManager } from "./AIManager";

class TestAIManager extends AIManager {
  danger(): Set<string> {
    return this.getAllDangerTiles();
  }
}

function fixture() {
  const grid = Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) =>
      x === 0 || y === 0 || x === 6 || y === 6 ? TileType.Wall : TileType.Grass,
    ),
  );
  let bombRevision = 1;
  let mapRevision = 1;
  const bombs = [{ tileX: 3, tileY: 3, range: 2 }];
  const manager = new TestAIManager(
    { grid } as never,
    {
      getRevision: () => mapRevision,
      isWalkable: (x: number, y: number) => grid[y]?.[x] === TileType.Grass,
      findPath: vi.fn(),
    } as never,
    {
      getRevision: () => bombRevision,
      getBombs: () => bombs,
    } as never,
    {} as never,
    {} as never,
  );
  return {
    manager,
    advanceBomb: () => { bombRevision++; },
    advanceMap: () => { mapRevision++; },
  };
}

describe("AIManager shared danger map", () => {
  it("reuses one set until bomb or map state changes", () => {
    const { manager, advanceBomb, advanceMap } = fixture();
    const first = manager.danger();
    expect(manager.danger()).toBe(first);
    expect(first.has("3,3")).toBe(true);

    advanceBomb();
    const afterBomb = manager.danger();
    expect(afterBomb).not.toBe(first);
    expect(manager.danger()).toBe(afterBomb);

    advanceMap();
    expect(manager.danger()).not.toBe(afterBomb);
  });
});
