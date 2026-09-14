'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/features/game-store/game-store";

/**
 * /inventory redirects to /<activeUser>/items — matching the nav link behavior
 * of the reference app.
 */
export default function InventoryRedirect() {
  const router = useRouter();
  const activeUser = useGameStore((s) => s.activeUser);

  useEffect(() => {
    router.replace(`/${activeUser}/items`);
  }, [router, activeUser]);

  return null;
}
