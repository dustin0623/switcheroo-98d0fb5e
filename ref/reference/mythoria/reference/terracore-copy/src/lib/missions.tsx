import type { ReactNode } from "react";
import { Eye, Coins, Shield, Swords, Wrench } from "lucide-react";
import stealth from "@/assets/mission-stealth.jpg";
import fortune from "@/assets/mission-fortune.jpg";
import defense from "@/assets/mission-defense.jpg";
import combat from "@/assets/mission-combat.jpg";
import salvage from "@/assets/mission-salvage.jpg";

export type SlotKey = "WPN" | "ARM" | "SHIP" | "AVT" | "TOOL";
export type CategoryKey = "STEALTH" | "FORTUNE" | "DEFENSE" | "COMBAT" | "SALVAGE";

export type Mission = {
  slug: string;
  tier: number;
  tierCls: string;
  category: CategoryKey;
  categoryIcon: ReactNode;
  title: string;
  brief: string;
  time: string;
  scrap: string;
  scrapFiat: string;
  baseDraws: number;
  levelReq: number;
  primary: {
    key: "Speed" | "Luck" | "Defense" | "Attack" | "Gathering";
    short: "DOD" | "LUC" | "DEF" | "DAM" | "ENG";
    required: number;
    have: number;
    itemsOnly?: boolean;
  };
  requiredSlot: SlotKey;
  slotLabel: "Weapon" | "Armor" | "Ship" | "Avatar" | "Tool";
  slotOptional: boolean;
  relics: { legendary: number; epic: number; rare: number; uncommon: number; common: number; yield: number };
  image: string;
};

export const PLAYER_LEVEL = 14;

export const missions: Mission[] = [
  {
    slug: "op-cold-insertion",
    tier: 2,
    tierCls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    category: "STEALTH",
    categoryIcon: <Eye className="h-3 w-3" />,
    title: "Op: Cold Insertion",
    brief:
      "Enter a hostile compound using forged credentials and retrieve a physical object from secured storage. The exit window closes in four hours and no exfil...",
    time: "4h",
    scrap: "358 $MGOLD",
    scrapFiat: "1.2K",
    baseDraws: 3,
    levelReq: 10,
    primary: { key: "Speed", short: "DOD", required: 5, have: 0, itemsOnly: true },
    requiredSlot: "ARM",
    slotLabel: "Armor",
    slotOptional: true,
    relics: { legendary: 1, epic: 2, rare: 12, uncommon: 44, common: 41, yield: 30 },
    image: stealth,
  },
  {
    slug: "hunt-sector-z-anomaly",
    tier: 3,
    tierCls: "bg-sky-500/20 text-sky-400 border-sky-500/40",
    category: "FORTUNE",
    categoryIcon: <Coins className="h-3 w-3" />,
    title: "Hunt: Sector Z Anomaly",
    brief:
      "Long-range scanners keep flagging an unusual mass signature deep in the outer belt. It could be a drift rock. It could be something considerably more...",
    time: "12h",
    scrap: "842 $MGOLD",
    scrapFiat: "1.2K",
    baseDraws: 4,
    levelReq: 25,
    primary: { key: "Luck", short: "LUC", required: 12, have: 0, itemsOnly: true },
    requiredSlot: "AVT",
    slotLabel: "Avatar",
    slotOptional: false,
    relics: { legendary: 6, epic: 9, rare: 21, uncommon: 33, common: 32, yield: 30 },
    image: fortune,
  },
  {
    slug: "hold-the-burning-breach",
    tier: 5,
    tierCls: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    category: "DEFENSE",
    categoryIcon: <Shield className="h-3 w-3" />,
    title: "Hold: The Burning Breach",
    brief:
      "A spatial anomaly has torn open in the upper atmosphere of the sector's most populated world. What's emerging through it has no intention of stopping, an...",
    time: "2d",
    scrap: "14.4K $MGOLD",
    scrapFiat: "1.2K",
    baseDraws: 10,
    levelReq: 100,
    primary: { key: "Defense", short: "DEF", required: 500, have: 690 },
    requiredSlot: "SHIP",
    slotLabel: "Ship",
    slotOptional: false,
    relics: { legendary: 16, epic: 11, rare: 14, uncommon: 31, common: 29, yield: 30 },
    image: defense,
  },
  {
    slug: "raid-the-obsidian-vault",
    tier: 4,
    tierCls: "bg-teal-500/20 text-teal-400 border-teal-500/40",
    category: "COMBAT",
    categoryIcon: <Swords className="h-3 w-3" />,
    title: "Raid: The Obsidian Vault",
    brief:
      "A hardened underground complex built to survive planetary bombardment. The original designers never anticipated someone tunneling in from below —...",
    time: "1d",
    scrap: "3.5K $MGOLD",
    scrapFiat: "1.2K",
    baseDraws: 6,
    levelReq: 50,
    primary: { key: "Attack", short: "DAM", required: 200, have: 480 },
    requiredSlot: "WPN",
    slotLabel: "Weapon",
    slotOptional: false,
    relics: { legendary: 12, epic: 10, rare: 19, uncommon: 30, common: 28, yield: 30 },
    image: combat,
  },
  {
    slug: "salvage-colossus-fragments",
    tier: 4,
    tierCls: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    category: "SALVAGE",
    categoryIcon: <Wrench className="h-3 w-3" />,
    title: "Dismantle: The Colossus Fragments",
    brief:
      "A destroyed dreadnought slowly spiraling into the upper atmosphere of a gas giant. The retrieval window is seventy-two hours before gravity makes...",
    time: "1d",
    scrap: "3.5K $MGOLD",
    scrapFiat: "1.2K",
    baseDraws: 6,
    levelReq: 50,
    primary: { key: "Gathering", short: "ENG", required: 200, have: 52 },
    requiredSlot: "TOOL",
    slotLabel: "Tool",
    slotOptional: false,
    relics: { legendary: 12, epic: 8, rare: 11, uncommon: 35, common: 33, yield: 30 },
    image: salvage,
  },
  {
    slug: "hold-cradle-station",
    tier: 5,
    tierCls: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    category: "DEFENSE",
    categoryIcon: <Shield className="h-3 w-3" />,
    title: "Hold: Cradle Station",
    brief:
      "The most critical civilian installation in the sector — a generation ship's construction yard housing forty thousand workers. Its fall does not just mean...",
    time: "2d",
    scrap: "14.4K $MGOLD",
    scrapFiat: "1.2K",
    baseDraws: 10,
    levelReq: 100,
    primary: { key: "Defense", short: "DEF", required: 500, have: 690 },
    requiredSlot: "SHIP",
    slotLabel: "Ship",
    slotOptional: false,
    relics: { legendary: 16, epic: 11, rare: 14, uncommon: 31, common: 29, yield: 30 },
    image: defense,
  }
];

export function getMission(slug: string): Mission | undefined {
  return missions.find((m) => m.slug === slug);
}
