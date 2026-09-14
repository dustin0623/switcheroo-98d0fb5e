import { useCallback, useEffect, useState } from "react";

import { getActivityLogs, getMarketSales, getMyMarketLogs, isDemoMode } from "@/lib/api/client";
import type { LogDto } from "@/lib/api/types";

type Source = "activity" | "market" | "sales";

const fetchers: Record<Source, (limit: number) => Promise<{ ok: boolean; logs?: LogDto[] }>> = {
  activity: getActivityLogs,
  market: getMyMarketLogs,
  sales: getMarketSales,
};

/**
 * Reads the server `logs` collection. Silently yields an empty list in demo
 * mode or when the API is unreachable so the UI can fall back to local state.
 */
export function useServerLogs(source: Source, enabled = true, limit = 50) {
  const [logs, setLogs] = useState<LogDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || isDemoMode()) {
      setLogs([]);
      return;
    }
    setLoading(true);
    const result = await fetchers[source](limit);
    setLogs(result.ok && result.logs ? result.logs : []);
    setLoading(false);
  }, [source, enabled, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { logs, loading, refresh };
}