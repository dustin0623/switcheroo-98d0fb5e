import { now } from "@/lib/clock";
import type { Crate, Item, ItemType } from "@/mock/types";
import { useGameStore } from "@/stores/game-store";
import { rollItemAttributes, rollItemRarity } from "@/stores/formulas/crates";
import { createSeed, rngInt } from "@/stores/rng";

const ITEM_TYPES: ItemType[] = ["weapon", "armor", "ship", "special", "avatar"];
const EDITIONS = ["Genesis", "Founder", "Pioneer", "Survivor", "Wanderer"];


function nextItemNumber(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function openCrate(
  user: string,
  crateId: string
): { ok: boolean; item?: Item; reason?: string } {
  const state = useGameStore.getState();
  const inventory = state.inventory[user];
  if (!inventory) return { ok: false, reason: "No inventory" };

  const crates = inventory.crates as Crate[];
  const crateIndex = crates.findIndex((c) => c._id === crateId);
  if (crateIndex === -1) return { ok: false, reason: "Crate not found" };

  const crate = crates[crateIndex];
  const nowMs = now();
  const seed = createSeed(nowMs, crateId, user);
  const rarity = rollItemRarity(crate.rarity, seed);
  const type = ITEM_TYPES[rngInt(seed + "-type", ITEM_TYPES.length)];
  const attributes = rollItemAttributes(type, rarity, seed + "-attrs");
  const itemNumber = nextItemNumber();

  const item: Item = {
    _id: `${user}-item-${itemNumber}`,
    name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    id: itemNumber,
    edition: EDITIONS[rngInt(seed + "-edition", EDITIONS.length)],
    print: 1,
    max_supply: 10000,
    description: `A ${rarity} ${type} forged from the wreckage of TerraCore.`,
    image: `/images/items/${type}_${rarity}.png`,
    owner: user,
    type,
    rarity,
    equiped: false,
    burnt: false,
    attributes,
    market: { listed: false, price: 0, seller: null, created: 0, expires: 0, sold: 0 },
    item_number: itemNumber,
    level: 1,
    version: 1,
    lastTransfer: nowMs,
  };

  const nextCrates = [...crates];
  nextCrates.splice(crateIndex, 1);

  useGameStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      [user]: {
        ...inventory,
        crates: nextCrates,
        items: [...inventory.items, item],
      },
    },
    nftLogs: {
      ...s.nftLogs,
      [user]: [
        {
          item_id: item.id,
          item_number: item.item_number,
          rarity: item.rarity,
          owner: user,
          type: item.type,
          attributes: item.attributes,
          edition: item.edition,
          seed,
          roll: rarity === crate.rarity ? 0 : 1,
          timestamp: nowMs,
        },
        ...(s.nftLogs[user] ?? []),
      ],
    },
  }));

  return { ok: true, item };
}

