// src/lib/game/chest.server.ts
import {
  CHEST_LADDERS,
  RARITY_STAT_COUNT,
  RARITY_INDEX,
  CHESTS,
  STAT_KEYS,
} from "@/features/constants/game";
import { randomItemName } from "@/features/game/item-names";
import type { ChestKey, Rarity, SlotKey, StatKey } from "@/features/types/game";
import { insertItem, mintNextItemNumber } from "@/lib/modules/items/repository.server";
import { createLog } from "@/lib/modules/logs/repository.server";
import { debitHash } from "@/lib/modules/players/repository.server";
import { createSeededRng } from "./rng";

const SLOT_ORDER: SlotKey[] = [
  "asicMiner",
  "motherboard",
  "powerSupply",
  "coolingSystem",
  "networkModule",
  "firmwareChip",
];

export function rollRarity(chest: ChestKey, luck: number, seed: string): Rarity {
  const rng = createSeededRng(seed);
  const roll = rng() * 100_000 + Math.min(luck * 100, 5_000);
  const ladder = CHEST_LADDERS[chest];
  for (const step of ladder) {
    const max = Number.isFinite(step!.max) ? step!.max : 100_000;
    if (roll <= max) return step!.rarity;
  }
  return ladder[ladder.length - 1]!.rarity;
}

export function pickRandomSlot(seed: string): SlotKey {
  const rng = createSeededRng(seed);
  return SLOT_ORDER[Math.floor(rng() * SLOT_ORDER.length)]!;
}

export function rollStats(
  rarity: Rarity,
  seed: string,
): Record<StatKey, number> {
  const rng = createSeededRng(seed);
  const countEntry = RARITY_STAT_COUNT[rarity];
  const count = Array.isArray(countEntry)
    ? countEntry[Math.floor(rng() * countEntry.length)]!
    : countEntry;

  const rarityMultiplier = RARITY_INDEX[rarity];
  const baseStatValue = Math.floor(rng() * 4) + rarityMultiplier; // 1–4 + rarity index

  const rolled: Record<StatKey, number> = {
    hashRate: 0,
    hackPower: 0,
    security: 0,
    luck: 0,
    firewall: 0,
    exploit: 0,
  };

  const availableKeys = [...STAT_KEYS];
  for (let i = 0; i < count && availableKeys.length > 0; i++) {
    const idx = Math.floor(rng() * availableKeys.length);
    const key = availableKeys.splice(idx, 1)[0];
    if (!key) continue;
    rolled[key] = baseStatValue + Math.floor(rng() * 3); // small variance
  }

  return rolled;
}

export async function openChest(
  wallet: string,
  chest: ChestKey,
  seed: string,
): Promise<{ ok: boolean; item?: Record<string, unknown>; error?: string }> {
  const price = CHESTS[chest].price;
  const { ok } = await debitHash(wallet, price);
  if (!ok) return { ok: false, error: "Not enough HASH" };

  const { findPlayerByWallet } = await import("@/lib/modules/players/repository.server");
  const player = await findPlayerByWallet(wallet);
  if (!player) return { ok: false, error: "Player not found" };

  const rarity = rollRarity(chest, player.statLevels.luck, seed);
  const slot = pickRandomSlot(seed);
  const stats = rollStats(rarity, seed);
  const itemNumber = await mintNextItemNumber();

  const item = await insertItem({
    itemNumber,
    owner: wallet,
    name: randomItemName(slot, seed),
    slot,
    rarity,
    level: 1,
    stats,
    equipped: false,
    salvaged: false,
    image: `${slot}.png`,
    createdAt: Date.now(),
    lastTransfer: 0,
  });

  await createLog({
    type: "chest",
    wallet,
    amount: -price,
    seed,
    data: {
      chest,
      rarity,
      slot,
      itemNumber,
    },
  });

  return { ok: true, item: item.toObject() };
}
