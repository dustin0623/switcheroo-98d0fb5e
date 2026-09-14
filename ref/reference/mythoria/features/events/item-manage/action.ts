/**
 * features/events/item-manage/action.ts
 *
 * Pure events — equip, unequip, salvage, and forge items.
 * Operates on plain state snapshots; no DB calls.
 */

import { now } from "@/lib/clock";
import type { EquippedSlot, Item, Player } from "@/features/types";
import { useGameStore } from "@/features/game-store/game-store";
import { enchantAttributes, enchantCost, dismantleValue } from "@/features/game-store/formulas/crates";

const SLOTS = ["avatar", "weapon", "armor", "mount", "accessory"] as const;

function toSlot(item: Item): EquippedSlot {
  return {
    item_number: item.item_number,
    item_id: item.id,
    item_equipped: true,
    attributes: item.attributes,
    rarity: item.rarity,
    level: item.level,
  };
}

function computeStats(items: Partial<Player["items"]>) {
  const stats = { damage: 0, defense: 0, arcane: 0, speed: 0, crit: 0, luck: 0 };
  for (const slot of SLOTS) {
    const a = items[slot]?.attributes;
    if (!a) continue;
    stats.damage  += a.damage;
    stats.defense += a.defense;
    stats.arcane  += a.arcane;
    stats.speed   += a.speed;
    stats.crit    += a.crit;
    stats.luck    += a.luck;
  }
  return stats;
}

export function equipItem(user: string, itemNumber: number): { ok: boolean; reason?: string } {
  const state = useGameStore.getState();
  const inventory = state.inventory[user];
  const player = state.players[user];
  if (!inventory || !player) return { ok: false, reason: "No player" };

  const item = inventory.items.find((i) => i.item_number === itemNumber);
  if (!item) return { ok: false, reason: "Item not found" };
  if (item.owner !== user) return { ok: false, reason: "Not your item" };
  if (item.burnt) return { ok: false, reason: "Item already salvaged" };

  const nowMs = now();
  const updatedItems = inventory.items.map((i) =>
    i.item_number === itemNumber ? { ...i, equiped: true } : i
  );

  const items = { ...player.items };
  const prev = items[item.type];
  if (prev) {
    const prevIndex = updatedItems.findIndex((i) => i.item_number === prev.item_number);
    if (prevIndex !== -1) updatedItems[prevIndex] = { ...updatedItems[prevIndex], equiped: false };
  }
  items[item.type] = toSlot({ ...item, equiped: true });

  useGameStore.setState((s) => ({
    inventory: { ...s.inventory, [user]: { ...inventory, items: updatedItems } },
    players: {
      ...s.players,
      [user]: { ...player, items, stats: computeStats(items), last_upgrade_time: nowMs },
    },
  }));
  return { ok: true };
}

export function unequipSlot(user: string, slot: keyof Player["items"]): { ok: boolean; reason?: string } {
  const state = useGameStore.getState();
  const inventory = state.inventory[user];
  const player = state.players[user];
  if (!inventory || !player) return { ok: false, reason: "No player" };

  const equipped = player.items?.[slot];
  if (!equipped) return { ok: false, reason: "Nothing equipped" };

  const nowMs = now();
  const updatedItems = inventory.items.map((i) =>
    i.item_number === equipped.item_number ? { ...i, equiped: false } : i
  );

  const items = { ...player.items };
  delete items[slot];

  useGameStore.setState((s) => ({
    inventory: { ...s.inventory, [user]: { ...inventory, items: updatedItems } },
    players: {
      ...s.players,
      [user]: { ...player, items, stats: computeStats(items), last_upgrade_time: nowMs },
    },
  }));
  return { ok: true };
}

export function salvageItem(user: string, itemNumber: number): { ok: boolean; essence?: number; reason?: string } {
  const state = useGameStore.getState();
  const inventory = state.inventory[user];
  const player = state.players[user];
  if (!inventory || !player) return { ok: false, reason: "No player" };

  const itemIndex = inventory.items.findIndex((i) => i.item_number === itemNumber);
  if (itemIndex === -1) return { ok: false, reason: "Item not found" };
  const item = inventory.items[itemIndex];
  if (item.equiped) return { ok: false, reason: "Unequip first" };
  if (item.burnt) return { ok: false, reason: "Already salvaged" };

  const essence = dismantleValue(item.attributes);
  const nowMs = now();
  const updatedItems = inventory.items.map((i, idx) =>
    idx === itemIndex ? { ...i, burnt: true, equiped: false, owner: "" } : i
  );

  useGameStore.setState((s) => ({
    inventory: { ...s.inventory, [user]: { ...inventory, items: updatedItems } },
    players: {
      ...s.players,
      [user]: { ...player, essence: (player.essence || 0) + essence, last_upgrade_time: nowMs },
    },
    salvageLogs: {
      ...s.salvageLogs,
      [user]: [
        { username: user, item_number: itemNumber, value: essence, time: nowMs },
        ...(s.salvageLogs[user] ?? []),
      ],
    },
  }));
  return { ok: true, essence };
}

export function forgeItem(user: string, itemNumber: number): { ok: boolean; reason?: string } {
  const state = useGameStore.getState();
  const inventory = state.inventory[user];
  const player = state.players[user];
  if (!inventory || !player) return { ok: false, reason: "No player" };

  const itemIndex = inventory.items.findIndex((i) => i.item_number === itemNumber);
  if (itemIndex === -1) return { ok: false, reason: "Item not found" };
  const item = inventory.items[itemIndex];
  if (item.burnt) return { ok: false, reason: "Item already salvaged" };

  const cost = enchantCost(item);
  if ((player.essence || 0) < cost) return { ok: false, reason: "Not enough essence" };

  const nowMs = now();
  const forgedItem: Item = {
    ...item,
    attributes: enchantAttributes(item.attributes),
    level: item.level + 1,
    version: (item.version || 0) + 1,
  };
  const updatedItems = inventory.items.map((i, idx) => (idx === itemIndex ? forgedItem : i));

  const items = { ...player.items };
  if (items[item.type]?.item_number === itemNumber) {
    items[item.type] = toSlot(forgedItem);
  }

  useGameStore.setState((s) => ({
    inventory: { ...s.inventory, [user]: { ...inventory, items: updatedItems } },
    players: {
      ...s.players,
      [user]: {
        ...player,
        essence: (player.essence || 0) - cost,
        items,
        stats: computeStats(items),
        last_upgrade_time: nowMs,
      },
    },
    forgeLogs: {
      ...s.forgeLogs,
      [user]: [
        { username: user, item: forgedItem, essence: cost.toFixed(3), time: nowMs.toString() },
        ...(s.forgeLogs[user] ?? []),
      ],
    },
  }));
  return { ok: true };
}
