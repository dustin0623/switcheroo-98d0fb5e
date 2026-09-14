import type { IItemTemplate } from "@/lib/modules/item-templates/types.server";

type NFTTemplate = Omit<IItemTemplate, keyof import("mongoose").Document | "supply_minted">;

const DESC = "Armor NFT items in Mythoria are non-fungible tokens representing unique pieces of armor that boost your character's defensive stats when equipped.";

export const ARMOR_TEMPLATES: NFTTemplate[] = [
  { id: 1000, name: "Impenetrable Shield", type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1001, name: "Gas Mask",            type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1002, name: "Kevalr Vest",         type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1003, name: "Hazmat Suit",         type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1004, name: "Combat Boots",        type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1005, name: "Space Boots",         type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1006, name: "Space Suit",          type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1007, name: "Heavy Battle Suit",   type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1008, name: "Space Marine Suit",   type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1009, name: "Pilots Gloves",       type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1010, name: "Cargo Pants",         type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1011, name: "Space Gloves",        type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 1012, name: "Energy Shield",       type: "armor", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
];
