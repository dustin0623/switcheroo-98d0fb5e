import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { InventoryShell, FilterTabs } from "@/components/inventory";
import { Pill, seedFromString, mulberry32, fmt } from "@/components/logs";

const CATEGORIES = ["All", "Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;

const RELICS = [
  { name: "Common", tone: "muted" as const, hue: 260, drop: [["COMMON", "90%"], ["UNCOMMON", "9%"], ["RARE", "0.75%"], ["EPIC", "0.20%"], ["LEGENDARY", "0.05%"]] },
  { name: "Uncommon", tone: "success" as const, hue: 160, drop: [["UNCOMMON", "95%"], ["RARE", "4%"], ["EPIC", "0.90%"], ["LEGENDARY", "0.10%"]] },
  { name: "Rare", tone: "info" as const, hue: 240, drop: [["RARE", "95%"], ["EPIC", "4%"], ["LEGENDARY", "1%"]] },
  { name: "Epic", tone: "warning" as const, hue: 300, drop: [["EPIC", "98%"], ["LEGENDARY", "2%"]] },
  { name: "Legendary", tone: "danger" as const, hue: 60, drop: [["LEGENDARY", "100%"]] },
] as const;

export const Route = createFileRoute("/$user/relics")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.user}'s Artifacts — Mythoria` },
      { name: "description", content: `${params.user}'s relic inventory.` },
      { property: "og:title", content: `${params.user}'s Artifacts — Mythoria` },
      { property: "og:description", content: `${params.user}'s relic inventory.` },
    ],
  }),
  component: RelicsPage,
});

function RelicsPage() {
  const { user } = Route.useParams();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const rows = useMemo(() => {
    const rand = mulberry32(seedFromString(`${user}-relics`));
    return RELICS.map((r) => ({
      ...r,
      qty: +(rand() * 100 + 5).toFixed(3),
    }));
  }, [user]);

  const filtered = rows.filter((r) => (cat === "All" ? true : r.name === cat));

  return (
    <InventoryShell user={user} active="relics" titleWord="Artifacts" showLogs={false}>
      <FilterTabs
        tabs={CATEGORIES as unknown as string[]}
        active={cat}
        onChange={(v) => setCat(v as typeof cat)}
        rightSlot={
          <Link
            to="/market/relics"
            className="px-3 py-1.5 text-xs font-semibold border border-purple-500 text-purple-400 rounded-md"
          >
            Check Market
          </Link>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Rarity</th>
              <th className="px-4 py-3 text-left">Drop Rates</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.name} className="border-t border-border/40 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border border-border/60"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.75 0.18 ${r.hue}) 0%, oklch(0.2 0.05 260) 100%)`,
                        clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                      }}
                    />
                    <div>
                      <div className="font-semibold">{r.name} Artifacts</div>
                      <div className="text-[11px] text-muted-foreground max-w-sm">
                        Artifacts can be combined to get a "crate" of the corresponding rarity. Artifacts required: 100
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={r.tone}>{r.name}</Pill>
                </td>
                <td className="px-4 py-3 text-right md:text-left">
                  <div className="text-xs font-mono space-y-0.5">
                    {r.drop.map(([k, v]) => (
                      <div key={k}>
                        <span className={`text-${r.tone === "muted" ? "muted-foreground" : "foreground"}`}>
                          {k}:
                        </span>{" "}
                        <span className="text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-lg">{fmt(r.qty, 3)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center py-6 border-t border-border/60">
        <Link
          to="/market/relics"
          className="px-4 py-2 text-xs font-semibold border border-purple-500 text-purple-400 rounded-md"
        >
          Check Market
        </Link>
      </div>
    </InventoryShell>
  );
}
