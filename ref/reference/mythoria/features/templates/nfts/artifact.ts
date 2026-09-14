import type { IItemTemplate } from "@/lib/modules/item-templates/types.server";

type NFTTemplate = Omit<IItemTemplate, keyof import("mongoose").Document | "supply_minted">;

const DESC = "Artifact NFTs in Mythoria are ancient relics and enchanted objects that amplify arcane power and luck when carried by their wielder.";

export const ARTIFACT_TEMPLATES: NFTTemplate[] = [
  { id: 3000, name: "Runebound Tome",        type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3001, name: "Orb of Foresight",      type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3002, name: "Talisman of the Veil",  type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3003, name: "Shard of Eternity",     type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3004, name: "Enchanted Compass",     type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3005, name: "Spectral Lantern",      type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3006, name: "Moonstone Pendant",     type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3007, name: "Hexblade Focus",        type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3008, name: "Warding Charm",         type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3009, name: "Aether Vial",           type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3010, name: "Grimoire of Shadows",   type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3011, name: "Soul Anchor",           type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3012, name: "Titan's Eye",           type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3013, name: "Leystone Ring",         type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
  { id: 3014, name: "Cursed Hourglass",      type: "artifact", edition: "Beta", max_supply: 10000, image: "", description: DESC, attributes: { damage: 0, defense: 0, arcane: 0, dodge: 0, crit: 0, luck: 0 }, market: { listed: false, price: 0 } },
];
