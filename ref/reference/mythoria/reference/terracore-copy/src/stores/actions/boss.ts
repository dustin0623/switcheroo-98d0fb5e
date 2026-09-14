import { now } from "@/lib/clock";
import type { BossDatum, Player, Rarity } from "@/mock/types";
import { useGameStore } from "@/stores/game-store";
import { applyXp } from "@/stores/formulas/xp";
import { createSeed, rngFloat, rngInt } from "@/stores/rng";

const BOSS_XP = 100; // docs §29

const PLANETS: Record<string, { flux: number; consumableThreshold: number; rarityThresholds: number[] }> = {
  Terracore: { flux: 1, consumableThreshold: 900, rarityThresholds: [950, 985, 995, 1000] },
  Oceana: { flux: 2, consumableThreshold: 750, rarityThresholds: [949, 983, 993, 1000] },
  Celestia: { flux: 2, consumableThreshold: 750, rarityThresholds: [948, 982, 992, 1000] },
  Arborealis: { flux: 2, consumableThreshold: 500, rarityThresholds: [947.5, 981, 991, 1000] },
  Neptolith: { flux: 2, consumableThreshold: 750, rarityThresholds: [947, 980.5, 990.5, 1000] },
  Solisar: { flux: 2, consumableThreshold: 750, rarityThresholds: [930, 975, 993, 1000] },
};

const RARITIES: Rarity[] = ["uncommon", "rare", "epic", "legendary"];

const UNCOMMON_CONSUMABLES = ["attack", "claim", "crit", "damage", "dodge"];
const RARE_CONSUMABLES = ["rage", "impenetrable", "overload", "rogue", "battle", "fury"];
const EPIC_CONSUMABLES = ["protection", "focus"];

export function canFightBoss(player: Player, planet: string): { ok: boolean; reason?: string } {
  const cfg = PLANETS[planet];
  if (!cfg) return { ok: false, reason: "Unknown planet" };
  const entry = player.boss_data?.find((b) => b.name === planet);
  if (!entry) return { ok: false, reason: "Planet locked" };
  if (player.level < entry.level) return { ok: false, reason: "Level too low" };
  if ((player.flux || 0) < cfg.flux) return { ok: false, reason: "Not enough FLUX" };
  const nowMs = now();
  if (nowMs - entry.lastBattle < 4 * 3600000) return { ok: false, reason: "Boss on cooldown" };
  return { ok: true };
}

export function fightBoss(
  user: string,
  planet: string
): { ok: boolean; result?: "hit" | "miss"; drop?: string; rarity?: Rarity; reason?: string } {
  const state = useGameStore.getState();
  const player = state.players[user];
  if (!player) return { ok: false, reason: "No player" };

  const prereq = canFightBoss(player, planet);
  if (!prereq.ok) return { ok: false, reason: prereq.reason };

  const cfg = PLANETS[planet];
  const nowMs = now();
  const seed = createSeed(nowMs, `${user}-${planet}`, "boss");

  const luck = player.stats?.luck || 0;
  const roll = rngFloat(seed + "-boss") * 100;
  const hit = roll <= luck;

  const bossData: BossDatum[] = player.boss_data.map((b) =>
    b.name === planet ? { ...b, lastBattle: nowMs } : b
  );

  if (!hit) {
    const luckMod = planet === "Terracore" ? luck / 10 : luck / 5;
    const roll2 = rngFloat(seed + "-relic") * 100;
    let rarity: Rarity;
    let amount: number;
    if (roll2 <= 70) {
      rarity = "common";
      amount = Math.max(rngFloat(seed + "-amt") * 1.25 * luckMod + 1, 0.1);
    } else if (roll2 <= 90) {
      rarity = "uncommon";
      amount = Math.max(rngFloat(seed + "-amt") * 1.0 * luckMod + 1, 0.1);
    } else if (roll2 <= 98) {
      rarity = "rare";
      amount = Math.max(rngFloat(seed + "-amt") * 0.75 * luckMod + 1, 0.1);
    } else if (roll2 <= 99) {
      rarity = "epic";
      amount = Math.max(rngFloat(seed + "-amt") * 0.5 * luckMod + 1, 0.1);
    } else {
      rarity = "legendary";
      amount = Math.max(0.1 * luckMod, 0.1);
    }
    amount = parseFloat(amount.toFixed(3));

    const relics = state.inventory[user]?.relics || [];
    const existing = relics.find((r) => r.type.toLowerCase() === rarity);
    const updatedRelics = existing
      ? relics.map((r) =>
          r.type.toLowerCase() === rarity ? { ...r, amount: r.amount + amount } : r
        )
      : [
          ...relics,
          {
            _id: `${user}-${rarity}-${nowMs}`,
            username: user,
            version: 1,
            type: rarity.toUpperCase() as Rarity | "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY",
            amount,
            market: { listed: false, amount: 0, price: 0, seller: null, created: 0, expires: 0, sold: 0 },
          },
        ];

    useGameStore.setState((s) => ({
      players: {
        ...s.players,
        [user]: {
          ...player,
          flux: (player.flux || 0) - cfg.flux,
          boss_data: bossData,
          last_upgrade_time: nowMs,
          ...applyXp({ level: player.level || 1, experience: player.experience || 0 }, BOSS_XP),
        },
      },
      inventory: {
        ...s.inventory,
        [user]: { ...s.inventory[user], relics: updatedRelics },
      },
    }));
    return { ok: true, result: "miss", drop: `${rarity} relics`, rarity };
  }

  const crateSeed = seed + "-crate";
  const rarityRoll = Math.floor(rngFloat(crateSeed + "r") * 1001);
  const dropRoll = Math.floor(rngFloat(crateSeed + "d") * 1001);
  let rarity: Rarity = "common";
  for (let i = 0; i < cfg.rarityThresholds.length; i++) {
    if (rarityRoll <= cfg.rarityThresholds[i]) {
      rarity = RARITIES[i];
      break;
    }
  }

  if (dropRoll <= cfg.consumableThreshold) {
    const pool = rarity === "uncommon" ? UNCOMMON_CONSUMABLES : rarity === "rare" ? RARE_CONSUMABLES : EPIC_CONSUMABLES;
    const type = pool[rngInt(crateSeed + "c", pool.length)];
    const consumables = state.inventory[user]?.consumables || [];
    const existing = consumables.find((c) => c.type === type);
    const updatedConsumables = existing
      ? consumables.map((c) => (c.type === type ? { ...c, amount: c.amount + 1 } : c))
      : [
          ...consumables,
          {
            _id: `${user}-${type}-${nowMs}`,
            username: user,
            version: 1,
            type,
            amount: 1,
            market: { listed: false, amount: 0, price: "0", seller: "", created: 0, expires: 0, sold: 0 },
          },
        ];

    useGameStore.setState((s) => ({
      players: {
        ...s.players,
        [user]: {
          ...player,
          flux: (player.flux || 0) - cfg.flux,
          boss_data: bossData,
          last_upgrade_time: nowMs,
          ...applyXp({ level: player.level || 1, experience: player.experience || 0 }, BOSS_XP),
        },
      },
      inventory: {
        ...s.inventory,
        [user]: { ...s.inventory[user], consumables: updatedConsumables },
      },
    }));
    return { ok: true, result: "hit", drop: `${type} consumable`, rarity };
  }

  const crates = state.inventory[user]?.crates || [];
  useGameStore.setState((s) => ({
    players: {
      ...s.players,
      [user]: {
        ...player,
        flux: (player.flux || 0) - cfg.flux,
        boss_data: bossData,
        last_upgrade_time: nowMs,
        ...applyXp({ level: player.level || 1, experience: player.experience || 0 }, BOSS_XP),
      },
    },
    inventory: {
      ...s.inventory,
      [user]: {
        ...s.inventory[user],
        crates: [
          ...crates,
          {
            _id: `${user}-crate-${nowMs}`,
            rarity,
            owner: user,
            acquired: nowMs,
          },
        ],

      },
    },
  }));
  return { ok: true, result: "hit", drop: `${rarity} crate`, rarity };
}
