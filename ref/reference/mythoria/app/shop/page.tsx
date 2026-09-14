import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site-layout";

export const metadata: Metadata = {
  title: "Shop — Mythoria",
  description: "Purchase chests with $AETHER to unlock items and gear.",
  openGraph: {
    title: "Shop — Mythoria",
    description: "Purchase chests with $AETHER to unlock items.",
  },
};

const crates = [
  {
    name: "Wooden Chest",
    rarity: "COMMON",
    color: "text-muted-foreground border-border",
    desc: "A crate containing a common item. A steady source of equipment to get started.",
    cost: "1,183,194 $AETHER",
    usd: "~$5.00",
  },
  {
    name: "Bronze Chest",
    rarity: "UNCOMMON",
    color: "text-emerald-400 border-emerald-500/40",
    desc: "Guaranteed uncommon-or-better item. Great for building a solid loadout.",
    cost: "2,366,389 $AETHER",
    usd: "~$10",
  },
  {
    name: "Silver Chest",
    rarity: "RARE",
    color: "text-sky-400 border-sky-500/40",
    desc: "Guaranteed rare-or-better item. Unlocks Tier 3 quest access.",
    cost: "4,732,778 $AETHER",
    usd: "~$20",
  },
  {
    name: "Golden Chest",
    rarity: "EPIC",
    color: "text-fuchsia-400 border-fuchsia-500/40",
    desc: "Guaranteed epic-or-better item. Top-tier quest performance.",
    cost: "8,282,361 $AETHER",
    usd: "~$35",
  },
];

export default function ShopPage() {
  return (
    <PageShell>
      <div className="container-tc py-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-wider text-foreground mb-8">
          🛍 Shop
        </h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {crates.map((c) => (
            <div key={c.name} className="bracket-frame bg-card/40 flex flex-col">
              <div className="w-full aspect-square bg-secondary/40 rounded-md mb-4" />
              <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
              <span
                className={`inline-block text-[10px] font-bold tracking-widest px-2 py-0.5 border rounded mt-1 w-fit ${c.color}`}
              >
                {c.rarity}
              </span>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">
                {c.desc}
              </p>
              <div className="mt-4 border border-border rounded-md p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="text-primary font-semibold">{c.cost}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">≈ USD</span>
                  <span className="text-foreground">{c.usd}</span>
                </div>
              </div>
              <Link
                href="/login"
                className="mt-4 block text-center border border-primary text-primary rounded-md px-4 py-2 text-sm font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Login to Purchase
              </Link>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
