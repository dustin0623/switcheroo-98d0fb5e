import type { IItemTemplate } from "@/lib/modules/item-templates/types.server";

type NFTTemplate = Omit<IItemTemplate, keyof import("mongoose").Document | "supply_minted">;

const DESC = "Mount NFTs in Mythoria are legendary beasts and magical steeds that grant their rider enhanced defense and endurance when equipped.";

export const MOUNT_TEMPLATES: NFTTemplate[] = [
  { id: 4000, name: "Ironhoof Stallion",      type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4001, name: "Shadowmane",             type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4002, name: "Stoneback Rhino",        type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4003, name: "Emberwing Drake",        type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4004, name: "Frostmane Wolf",         type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4005, name: "Thornback Basilisk",     type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4006, name: "Blazing Wyvern",         type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4007, name: "Grimhoof Destrier",      type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4008, name: "Verdant Serpent",        type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4009, name: "Duskwing Gryphon",       type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4010, name: "Ancient Tortoise",       type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4011, name: "Moonstrider Elk",        type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4012, name: "Gilded Pegasus",         type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4013, name: "Ashclaw Manticore",      type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4014, name: "Crystalline Unicorn",    type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4015, name: "Boneback Colossus",      type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4016, name: "Storm Elk",              type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4017, name: "Tidecaller Leviathan",   type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4018, name: "Runed Dire Bear",        type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 4019, name: "Phantom Stallion",       type: "mount", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
];
