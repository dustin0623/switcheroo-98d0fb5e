import { HeroState } from "@/features/types/HeroState";
import type { Hero } from "../entities/Hero";
import { AIManager } from "../managers/AIManager";

/**
 * Demo-only AI. Behaviourally identical to {@link AIManager} for movement,
 * search, and escape logic, but its bomb-planting path is visual-only: it
 * spawns bombs (which the shared BombManager detonates) without ever letting
 * the detonation credit coins, consume energy, or emit a WS event.
 *
 * Those side effects live in `TreasureScene.update()`'s bomb-detonation
 * callback, which the DemoManager routes around for demo-owned bombs (owner
 * ids prefixed with `demo-`). This class therefore only needs to reproduce the
 * planting decision without introducing any new store/socket writes.
 *
 * Kept as a separate subclass so the real AIManager stays free of demo
 * branching and the whole demo feature can be deleted by removing `phaser/demo`.
 */
export class DemoAI extends AIManager {
  /**
   * Visual-only bomb plant. Identical decision logic to the base class:
   * respect Bomb Number, avoid stacking on live blasts, require a breakable
   * in range, spawn the bomb, then path to an escape tile. No
   * consumeBombEnergy / addOptimisticCoins / notifyBombDetonate — those are
   * skipped for demo bombs in TreasureScene's detonation handler.
   */
  protected override doPlantBomb(hero: Hero, _now: number): void {
    if (this.bombs.countByOwner(hero.id) >= hero.bombNum) {
      this.targetedBreakables.delete(hero.id);
      hero.state = HeroState.Searching;
      return;
    }
    const danger = this.getAllDangerTiles();
    if (danger.has(`${hero.tileX},${hero.tileY}`)) {
      this.targetedBreakables.delete(hero.id);
      hero.state = HeroState.Searching;
      return;
    }
    if (!this.hasBreakableInBlast(hero.tileX, hero.tileY, hero.bombRange)) {
      this.targetedBreakables.delete(hero.id);
      hero.state = HeroState.Searching;
      return;
    }
    // Visual-only: the shared BombManager fuse still fires, but the demo path
    // in TreasureScene detonates it without any store or socket mutation.
    this.bombs.spawn(hero.tileX, hero.tileY, hero.bombRange, hero.id, 700, hero.power);
    this.targetedBreakables.delete(hero.id);
    const dangerAfter = this.getAllDangerTiles();
    const escape = this.findEscapeTile(hero.tileX, hero.tileY, dangerAfter);
    if (!escape) {
      hero.state = HeroState.Searching;
      return;
    }
    this.requestPath(hero, escape.x, escape.y, HeroState.Escaping);
  }
}
