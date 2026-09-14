import { useEffect, useState } from "react";

import { EquipmentGrid } from "@/components/game/EquipmentGrid";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { RARITY_META, SLOT_META, STAT_KEYS, STAT_META } from "@/features/constants/game";
import {
  MARKET_FEE,
  suggestedPrice,
  useMarketplaceStore,
} from "@/features/stores/marketplaceStore";
import {
  SALVAGE_MULTIPLIERS,
  salvageValue,
  upgradeCost,
  upgradedStats,
  UPGRADE_MULTIPLIER,
} from "@/features/game/items";
import { formatHash } from "@/lib/format";
import { slotIcon } from "@/lib/icons";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useEquipmentStore } from "@/features/stores/equipmentStore";
import { usePlayerStore } from "@/features/stores/playerStore";
import { useAuthStore } from "@/features/stores/authStore";
import type { Equipment, SlotKey } from "@/features/types/game";

const round3 = (value: number) => Math.round(value * 1000) / 1000;

type Pending = { kind: "salvage" | "upgrade" | "sell"; item: Equipment } | null;

/** Item identity header used at the top of the upgrade / sell dialogs. */
function ItemSummary({ item }: { item: Equipment }) {
  const rarity = RARITY_META[item.rarity];
  const Icon = slotIcon(item.slot);
  return (
    <div className="flex gap-3 border-b border-border pb-4">
      <span
        className={cn(
          "grid size-14 shrink-0 place-items-center rounded-xl",
          rarity.bgClass,
          rarity.textClass,
        )}
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {item.name}
          <span className={cn("text-[10px] uppercase", rarity.textClass)}>{rarity.label}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {SLOT_META[item.slot].label} · Level {item.level}
        </p>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const inventory = useEquipmentStore((state) => state.inventory);
  const equip = useEquipmentStore((state) => state.equip);
  const unequip = useEquipmentStore((state) => state.unequip);
  const removeItem = useEquipmentStore((state) => state.removeItem);
  const upgradeItem = useEquipmentStore((state) => state.upgradeItem);

  const sparks = usePlayerStore((state) => state.sparks);
  const creditSparks = usePlayerStore((state) => state.creditSparks);
  const spendSparks = usePlayerStore((state) => state.spendSparks);

  const listItem = useMarketplaceStore((state) => state.listItem);
  const username = useAuthStore((state) => state.username) ?? "you";
  const mode = useAuthStore((state) => state.mode);
  /** Demo accounts play locally, so there is no real market to sell into. */
  const canSell = mode === "wallet";

  const [pending, setPending] = useState<Pending>(null);
  const [price, setPrice] = useState("");

  const item = pending?.item ?? null;

  useEffect(() => {
    if (pending?.kind === "sell") setPrice(String(suggestedPrice(pending.item)));
  }, [pending]);

  const handleEquip = (entry: Equipment) => {
    equip(entry.id);
    notify(`${entry.name} equipped`, "success");
  };

  const handleUnequip = (slot: SlotKey) => {
    unequip(slot);
    notify("Equipment unequipped", "info");
  };

  const cost = item ? upgradeCost(item) : 0;
  const affordable = sparks >= cost;
  const listPrice = Number(price);
  const priceValid = Number.isFinite(listPrice) && listPrice > 0;
  const net = priceValid ? listPrice * (1 - MARKET_FEE) : 0;

  const confirm = () => {
    if (!pending) return;
    const { kind, item: target } = pending;

    if (kind === "salvage") {
      const value = salvageValue(target);
      removeItem(target.id);
      creditSparks(value);
      notify(`Salvaged ${target.name} for ${formatHash(value, 3)} SPARKS`, "success");
    }

    if (kind === "upgrade") {
      if (!spendSparks(upgradeCost(target))) {
        notify("Not enough SPARKS to upgrade this item", "danger");
        setPending(null);
        return;
      }
      upgradeItem(target.id);
      notify(`${target.name} upgraded to level ${target.level + 1}`, "success");
    }

    if (kind === "sell") {
      if (!priceValid) return;
      removeItem(target.id);
      listItem(target, listPrice, username);
      notify(`${target.name} listed for ${formatHash(listPrice)} HASH on the marketplace`, "success");
    }

    setPending(null);
  };

  const nextStats = item ? upgradedStats(item.stats) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Every rig part you own. Equip gear, upgrade it with SPARKS, or salvage it back into SPARKS."
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold">Gear ({inventory.length})</h2>
        <EquipmentGrid
          items={inventory}
          onEquip={handleEquip}
          onUnequip={(entry) => handleUnequip(entry.slot)}
          onUpgrade={(entry) => setPending({ kind: "upgrade", item: entry })}
          onSalvage={(entry) => setPending({ kind: "salvage", item: entry })}
          onSell={canSell ? (entry) => setPending({ kind: "sell", item: entry }) : undefined}
          emptyMessage="Your inventory is empty. Open a chest to find your first rig part."
        />
      </section>

      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) => (open ? null : setPending(null))}
      >
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
          {item && pending ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {pending.kind === "salvage"
                    ? "Salvage Item"
                    : pending.kind === "upgrade"
                      ? "Upgrade Item"
                      : "List For Sale"}
                </AlertDialogTitle>
                <AlertDialogDescription className="sr-only">
                  {pending.kind} {item.name}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <ItemSummary item={item} />

              {pending.kind === "upgrade" && nextStats ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    Upgrade this item for{" "}
                    <span className="font-semibold text-success">
                      ~{formatHash(cost, 3)} SPARKS
                    </span>
                    . The item stats will improve based on the following table.
                  </p>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="bg-secondary/40">
                          <td className="px-3 py-2 font-medium">Your SPARKS</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatHash(sparks, 3)}
                          </td>
                          <td className="w-8 px-1 py-2 text-center text-destructive">→</td>
                          <td className="px-3 py-2 text-right tabular-nums text-destructive">
                            -{formatHash(cost, 3)}
                          </td>
                        </tr>
                        <tr className="border-t border-border/60">
                          <td className="px-3 py-2 font-medium">Level</td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.level}</td>
                          <td className="px-1 py-2 text-center text-success">→</td>
                          <td className="px-3 py-2 text-right tabular-nums text-success">
                            {item.level + 1}
                          </td>
                        </tr>
                        {STAT_KEYS.filter((key) => (item.stats[key] ?? 0) > 0).map((key) => (
                          <tr key={key} className="border-t border-border/60 bg-secondary/20">
                            <td className="px-3 py-2 font-medium">{STAT_META[key].label}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {round3(item.stats[key] ?? 0)}
                            </td>
                            <td className="px-1 py-2 text-center text-success">→</td>
                            <td className="px-3 py-2 text-right tabular-nums text-success">
                              {round3(nextStats[key] ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Every rolled stat gains {Math.round((UPGRADE_MULTIPLIER - 1) * 100)}% per level.
                  </p>
                </div>
              ) : null}

              {pending.kind === "salvage" ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    Salvage this item for{" "}
                    <span className="font-semibold text-success">
                      {formatHash(salvageValue(item), 3)} SPARKS
                    </span>
                    . The item is destroyed in the process.
                  </p>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/60 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Stat</th>
                          <th className="px-3 py-2 text-right font-medium">Value</th>
                          <th className="px-3 py-2 text-right font-medium">Multiplier</th>
                          <th className="px-3 py-2 text-right font-medium">Sparks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {STAT_KEYS.map((key) => {
                          const value = item.stats[key] ?? 0;
                          const mult = SALVAGE_MULTIPLIERS[key];
                          return (
                            <tr key={key} className="border-t border-border/60">
                              <td className="px-3 py-1.5">{STAT_META[key].label}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums">
                                {round3(value)}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                                x{mult}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-success">
                                {round3(value * mult)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {pending.kind === "sell" ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    List this item on the in-game marketplace. Other miners (or NPCs on refresh) can buy it. When it sells, you receive the price minus a{" "}
                    {Math.round(MARKET_FEE * 100)}% marketplace fee.
                  </p>
                  <div>
                    <p className="mb-1.5 text-sm font-medium">Price:</p>
                    <div className="flex overflow-hidden rounded-md border border-input">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        className="rounded-none border-0 focus-visible:ring-0"
                      />
                      <span className="grid shrink-0 place-items-center border-l border-input bg-secondary px-3 text-xs font-semibold">
                        HASH
                      </span>
                    </div>
                    <p className="mt-1.5 text-right text-xs text-muted-foreground">
                      When sold you receive ~
                      <span className="font-semibold text-success">{formatHash(net)} HASH</span>{" "}
                      after fees · suggested {formatHash(suggestedPrice(item))}
                    </p>
                  </div>
                </div>
              ) : null}

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirm}
                  disabled={
                    (pending.kind === "upgrade" && !affordable) ||
                    (pending.kind === "sell" && !priceValid)
                  }
                >
                  {pending.kind === "upgrade" && !affordable ? "Not enough SPARKS" : "Confirm"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
