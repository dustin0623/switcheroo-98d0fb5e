import { useState } from "react";

import { ChestCard } from "@/components/game/ChestCard";
import { ChestModal } from "@/components/game/ChestModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { PURCHASABLE_CHEST_KEYS, CHESTS, RARITY_META } from "@/features/constants/game";
import { openChest } from "@/features/game/chest";
import { useGameStats } from "@/hooks/useGameStats";
import { formatHash } from "@/lib/format";
import { notify } from "@/lib/notify";
import { useChestStore } from "@/features/stores/chestStore";
import { useEquipmentStore } from "@/features/stores/equipmentStore";
import { usePlayerStore } from "@/features/stores/playerStore";
import type { ChestKey, Equipment } from "@/features/types/game";

export function ChestsPage() {
  const { wallet, total } = useGameStats();
  const spend = usePlayerStore((state) => state.spendSink);
  const addItem = useEquipmentStore((state) => state.addItem);
  const equip = useEquipmentStore((state) => state.equip);
  const recordOpen = useChestStore((state) => state.recordOpen);

  const [activeChest, setActiveChest] = useState<ChestKey | null>(null);
  const [reward, setReward] = useState<Equipment | null>(null);

  const handleOpen = (chest: ChestKey) => {
    const price = CHESTS[chest].price;
    if (!spend(price)) {
      notify("Not enough HASH for that chest", "danger");
      return;
    }
    recordOpen(chest, price);
    setActiveChest(chest);
    setReward(null);

    window.setTimeout(() => {
      const item = openChest(chest, total.luck);
      addItem(item);
      setReward(item);
      notify(`${RARITY_META[item.rarity].label} drop: ${item.name}`, "loot");
    }, 1100);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chests"
        description="Every chest rolls a random slot, rarity, stat set and stat values. Luck nudges the odds upward."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PURCHASABLE_CHEST_KEYS.map((chest) => (
          <ChestCard
            key={chest}
            chest={chest}
            wallet={wallet}
            busy={activeChest !== null && reward === null}
            onOpen={handleOpen}
          />
        ))}
      </div>

      <ChestModal
        open={activeChest !== null}
        chest={activeChest}
        reward={reward}
        onClose={() => {
          setActiveChest(null);
          setReward(null);
        }}
      />
    </div>
  );
}
