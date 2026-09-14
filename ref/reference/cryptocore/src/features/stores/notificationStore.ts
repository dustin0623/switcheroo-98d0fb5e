import "@/features/stores/legacyStorage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { MAX_ACTIVITY_ENTRIES } from "@/features/constants/game";
import { createId } from "@/features/game/random";
import type { ActivityEntry } from "@/features/types/game";

interface NotificationState {
  activity: ActivityEntry[];
  push: (message: string, kind?: ActivityEntry["kind"]) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      activity: [],
      push: (message, kind = "info") =>
        set((state) => ({
          activity: [
            { id: createId("act"), message, kind, at: Date.now() },
            ...state.activity,
          ].slice(0, MAX_ACTIVITY_ENTRIES),
        })),
      clear: () => set({ activity: [] }),
    }),
    { name: "cryptocore.notifications", version: 1 },
  ),
);
