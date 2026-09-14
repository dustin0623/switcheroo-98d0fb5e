import type { IItemTemplate } from "@/lib/modules/item-templates/types.server";

type NFTTemplate = Omit<IItemTemplate, keyof import("mongoose").Document | "supply_minted">;

const DESC = "Weapon NFT items in Mythoria are non-fungible tokens representing unique weapons that boost your character's offensive stats when equipped.";

export const WEAPON_TEMPLATES: NFTTemplate[] = [
  { id: 2000, name: "Micro Blaster",           type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2001, name: "Flare Gun",               type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2002, name: "Golden Gun",              type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2003, name: "Glick's Glock",           type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2004, name: "Rivet Gun",               type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2005, name: "Double Barrel Handgun",   type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2006, name: "Nightfall Assult Rifle",  type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2007, name: "Vortex Viper",            type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2008, name: "Vengeance Seeker",        type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2009, name: "Dark Blaster",            type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2010, name: "Void Bringer",            type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2011, name: "Echo Blaster",            type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2012, name: "Iron Maiden",             type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2013, name: "Vengeance Seeker",        type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2014, name: "Omega Destroyer",         type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2015, name: "Goliath's Gaze",          type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2016, name: "Quickdraw",               type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2017, name: "Wildcat",                 type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2018, name: "Inferno Fury",            type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 2019, name: "Blackout",                type: "weapon", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
];
