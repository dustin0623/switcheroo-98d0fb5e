import EasyStar from "easystarjs";
import { TileType } from "@/features/types/TileTypes";

export interface PathNode {
  x: number;
  y: number;
}

interface QueuedPath {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  resolve: (path: PathNode[] | null) => void;
}

export class Pathfinding {
  private es: EasyStar.js;
  private grid: number[][];
  private revision = 0;
  private queue: QueuedPath[] = [];
  private queueCursor = 0;
  private readonly maxStartsPerTick = 4;
  private requests = 0;
  private completed = 0;
  private lastTickMs = 0;
  private maxTickMs = 0;

  constructor(grid: number[][]) {
    this.grid = grid;
    this.es = new EasyStar.js();
    this.es.setGrid(grid);
    this.es.setAcceptableTiles([TileType.Grass]);
    this.es.disableDiagonals();
    this.es.setIterationsPerCalculation(2000);
  }

  updateTile(x: number, y: number, value: number): void {
    if (this.grid[y]?.[x] === value) return;
    this.grid[y][x] = value;
    this.revision++;
    this.es.setGrid(this.grid);
  }

  getRevision(): number {
    return this.revision;
  }

  isWalkable(x: number, y: number): boolean {
    if (y < 0 || y >= this.grid.length) return false;
    if (x < 0 || x >= this.grid[0].length) return false;
    return this.grid[y][x] === TileType.Grass;
  }

  getTile(x: number, y: number): number {
    return this.grid[y][x];
  }

  findPath(sx: number, sy: number, tx: number, ty: number): Promise<PathNode[] | null> {
    this.requests++;
    return new Promise((resolve) => {
      this.queue.push({ sx, sy, tx, ty, resolve });
    });
  }

  tick(): void {
    const startedAt = performance.now();
    let started = 0;
    while (this.queueCursor < this.queue.length && started < this.maxStartsPerTick) {
      const request = this.queue[this.queueCursor++];
      this.es.findPath(request.sx, request.sy, request.tx, request.ty, (path) => {
        this.completed++;
        request.resolve(path ? path.map((p) => ({ x: p.x, y: p.y })) : null);
      });
      started++;
    }
    if (this.queueCursor >= this.queue.length) {
      this.queue = [];
      this.queueCursor = 0;
    }
    this.es.calculate();
    this.lastTickMs = performance.now() - startedAt;
    this.maxTickMs = Math.max(this.maxTickMs, this.lastTickMs);
    if (this.lastTickMs > 8) {
      console.warn("[Pathfinding] frame budget exceeded", {
        durationMs: Math.round(this.lastTickMs * 100) / 100,
        queued: this.queue.length - this.queueCursor,
      });
    }
  }

  getMetrics(): Readonly<{
    requests: number;
    completed: number;
    queued: number;
    lastTickMs: number;
    maxTickMs: number;
  }> {
    return {
      requests: this.requests,
      completed: this.completed,
      queued: this.queue.length - this.queueCursor,
      lastTickMs: this.lastTickMs,
      maxTickMs: this.maxTickMs,
    };
  }
}
