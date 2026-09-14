import * as Phaser from "phaser";
import {
  HeroRarity,
  pickHeroType,
  rollHeroAttributes,
} from "@/features/types/HeroRarity";
import { useGameStore } from "@/features/store/gameStore";
import type { MapManager } from "../managers/MapManager";
import type { Pathfinding } from "../systems/Pathfinding";
import type { BombManager } from "../managers/BombManager";
import type { ExplosionManager } from "../managers/ExplosionManager";
import type { LootManager } from "../managers/LootManager";
import type { HeroManager } from "../managers/HeroManager";
import type { Hero } from "../entities/Hero";
import { TileType, MAP_WIDTH, MAP_HEIGHT } from "@/features/types/TileTypes";
import { DemoAI } from "./DemoAI";

/** Owner id / hero id prefix that marks an entity as demo-only. */
export const DEMO_PREFIX = "demo-";

/** True for any bomb/hero id that belongs to the local demo simulation. */
export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_PREFIX);
}

/**
 * Rarity spread for the 10 demo heroes: 3 Common, 2 Uncommon, 2 Rare,
 * 2 Epic, 1 Legendary. Gives the empty-map player a lively, varied preview.
 */
const DEMO_RARITIES: HeroRarity[] = [
  HeroRarity.Common,
  HeroRarity.Common,
  HeroRarity.Common,
  HeroRarity.Uncommon,
  HeroRarity.Uncommon,
  HeroRarity.Rare,
  HeroRarity.Rare,
  HeroRarity.Epic,
  HeroRarity.Epic,
  HeroRarity.Legendary,
];

/**
 * Orchestrates a fully local, throwaway demo session. When a player has zero
 * real heroes, ten demo heroes are spawned onto the real map grid and play the
 * full gameplay loop using {@link DemoAI}. Nothing here writes to the roster,
 * coins, energy, or the server — the demo is purely cosmetic and is torn down
 * the instant the player acquires their first real hero.
 */
export class DemoManager {
  private scene: Phaser.Scene;
  private map: MapManager;
  private bombs: BombManager;
  private heroes: HeroManager;
  private ai: DemoAI;
  private demoHeroes: Hero[] = [];
  private active = false;

  constructor(
    scene: Phaser.Scene,
    map: MapManager,
    pathfinding: Pathfinding,
    bombs: BombManager,
    explosions: ExplosionManager,
    loot: LootManager,
    heroes: HeroManager,
  ) {
    this.scene = scene;
    this.map = map;
    this.bombs = bombs;
    this.heroes = heroes;
    // Shares the same managers as the real game so demo heroes plant real
    // bombs and trigger real explosions on the live grid.
    this.ai = new DemoAI(map, pathfinding, bombs, loot, explosions);
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Spawns the demo roster and begins the simulation. */
  start(): void {
    if (this.active) return;
    for (let i = 0; i < DEMO_RARITIES.length; i++) {
      const rarity = DEMO_RARITIES[i];
      const type = pickHeroType();
      const attrs = rollHeroAttributes(rarity);
      const spawn = this.findSpawnTile();
      if (!spawn) break;
      const hero = this.heroes.spawn({
        id: `${DEMO_PREFIX}${i}`,
        tileX: spawn.x,
        tileY: spawn.y,
        rarity,
        type,
        preset: {
          power: attrs.power,
          speed: attrs.speed,
          stamina: attrs.stamina,
          bombNum: attrs.bombNum,
          bombRange: attrs.bombRange,
          // Demo heroes never consume energy, but spawn at full so they never
          // render in a depleted/sleeping state.
          energy: attrs.energy,
        },
      });
      this.demoHeroes.push(hero);
    }
    this.active = true;
    useGameStore.getState().setDemoMode(true);
  }

  /** Drives every demo hero one tick. Called from TreasureScene.update(). */
  update(time: number, deltaSec: number): void {
    if (!this.active) return;
    const stepAlong = (h: Hero, dt: number) => this.heroes.stepAlongPath(h, dt);
    for (const hero of this.demoHeroes) {
      this.ai.update(hero, time, deltaSec, stepAlong);
    }
  }

  /** Removes all demo heroes and ends the simulation. */
  stop(): void {
    if (!this.active) return;
    for (const hero of this.demoHeroes) {
      this.heroes.remove(hero);
    }
    this.demoHeroes = [];
    this.active = false;
    useGameStore.getState().setDemoMode(false);
  }

  /**
   * Pick a random free grass tile separated from existing heroes (real or
   * demo). Mirrors TreasureScene.findSpawnTile so demo heroes spread out.
   */
  private findSpawnTile(): { x: number; y: number } | null {
    const others = this.heroes.heroes.map((h) => ({ x: h.tileX, y: h.tileY }));
    const occupied = new Set(others.map((o) => `${o.x},${o.y}`));
    const all: { x: number; y: number }[] = [];
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < MAP_WIDTH - 1; x++) {
        if (this.map.grid[y][x] !== TileType.Grass) continue;
        if (occupied.has(`${x},${y}`)) continue;
        all.push({ x, y });
      }
    }
    if (!all.length) return null;
    for (const minDist of [7, 5, 3, 2, 1]) {
      const ok = all.filter((c) =>
        others.every((o) => Math.abs(o.x - c.x) + Math.abs(o.y - c.y) >= minDist),
      );
      if (ok.length) return ok[Math.floor(Math.random() * ok.length)];
    }
    return all[Math.floor(Math.random() * all.length)];
  }
}
