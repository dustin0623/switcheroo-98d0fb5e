import { beforeEach, describe, expect, it, vi } from "vitest";
import { TileType } from "@/features/types/TileTypes";

const mocks = vi.hoisted(() => ({
  findPath: vi.fn(),
  calculate: vi.fn(),
  setGrid: vi.fn(),
}));

vi.mock("easystarjs", () => ({
  default: {
    js: class EasyStarMock {
      setGrid = mocks.setGrid;
      setAcceptableTiles = vi.fn();
      disableDiagonals = vi.fn();
      setIterationsPerCalculation = vi.fn();
      findPath = mocks.findPath;
      calculate = mocks.calculate;
    },
  },
}));

import { Pathfinding } from "./Pathfinding";

describe("Pathfinding frame budget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts at most four queued searches per tick", () => {
    const grid = Array.from({ length: 5 }, () => Array(5).fill(TileType.Grass));
    const pathfinding = new Pathfinding(grid);
    for (let i = 0; i < 9; i++) void pathfinding.findPath(0, 0, 4, 4);

    expect(mocks.findPath).not.toHaveBeenCalled();
    pathfinding.tick();
    expect(mocks.findPath).toHaveBeenCalledTimes(4);
    pathfinding.tick();
    expect(mocks.findPath).toHaveBeenCalledTimes(8);
    pathfinding.tick();
    expect(mocks.findPath).toHaveBeenCalledTimes(9);
  });

  it("increments map revision only for actual tile changes", () => {
    const grid = Array.from({ length: 3 }, () => Array(3).fill(TileType.Grass));
    const pathfinding = new Pathfinding(grid);
    pathfinding.updateTile(1, 1, TileType.Grass);
    expect(pathfinding.getRevision()).toBe(0);
    pathfinding.updateTile(1, 1, TileType.Wall);
    expect(pathfinding.getRevision()).toBe(1);
  });
});
