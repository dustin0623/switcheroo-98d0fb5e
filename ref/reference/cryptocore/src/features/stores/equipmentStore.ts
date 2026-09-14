import "@/features/stores/legacyStorage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { SLOT_KEYS } from "@/features/constants/game";
import { upgradedItem } from "@/features/game/items";
import type { Equipment, SlotKey } from "@/features/types/game";

type EquippedMap = Record<SlotKey, string | null>;

const emptyEquipped = (): EquippedMap =>
  SLOT_KEYS.reduce((acc, slot) => ({ ...acc, [slot]: null }), {} as EquippedMap);

interface EquipmentState {
  inventory: Equipment[];
  equipped: EquippedMap;
  addItem: (item: Equipment) => void;
  equip: (id: string) => Equipment | null;
  unequip: (slot: SlotKey) => void;
  upgradeItem: (id: string) => Equipment | null;
  removeItem: (id: string) => void;
  reset: () => void;
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      inventory: [],
      equipped: emptyEquipped(),

      addItem: (item) => set((state) => ({ inventory: [item, ...state.inventory] })),

      equip: (id) => {
        const item = get().inventory.find((entry) => entry.id === id);
        if (!item) return null;
        set((state) => ({
          equipped: { ...state.equipped, [item.slot]: item.id },
          inventory: state.inventory.map((entry) =>
            entry.slot === item.slot ? { ...entry, equipped: entry.id === item.id } : entry,
          ),
        }));
        return item;
      },

      unequip: (slot) =>
        set((state) => ({
          equipped: { ...state.equipped, [slot]: null },
          inventory: state.inventory.map((entry) =>
            entry.slot === slot ? { ...entry, equipped: false } : entry,
          ),
        })),

      upgradeItem: (id) => {
        const item = get().inventory.find((entry) => entry.id === id);
        if (!item) return null;
        const next = upgradedItem(item);
        set((state) => ({
          inventory: state.inventory.map((entry) => (entry.id === id ? next : entry)),
        }));
        return next;
      },

      removeItem: (id) =>
        set((state) => {
          const item = state.inventory.find((entry) => entry.id === id);
          const equipped = { ...state.equipped };
          if (item && equipped[item.slot] === id) equipped[item.slot] = null;
          return { inventory: state.inventory.filter((entry) => entry.id !== id), equipped };
        }),

      reset: () => set({ inventory: [], equipped: emptyEquipped() }),
    }),
    { name: "cryptocore.equipment", version: 1 },
  ),
);

export const pickEquippedItems = (
  inventory: Equipment[],
  equipped: Record<SlotKey, string | null>,
): Equipment[] =>
  SLOT_KEYS.map((slot) => {
    const id = equipped[slot];
    return id ? inventory.find((item) => item.id === id) : undefined;
  }).filter((item): item is Equipment => Boolean(item));
