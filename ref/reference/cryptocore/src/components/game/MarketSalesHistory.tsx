import { History, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useServerLogs } from "@/hooks/useServerLogs";
import { marketLogMessage, toMarketRow } from "@/lib/logs-format";
import { formatHash, formatRelativeTime } from "@/lib/format";

/** Public history of items sold on the marketplace, read from the logs collection. */
export function MarketSalesHistory() {
  const { logs, loading, refresh } = useServerLogs("sales", true, 25);
  const rows = logs.map(toMarketRow);

  return (
    <section className="card-soft space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4 text-muted-foreground" />
          Sales history
        </h2>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void refresh()}>
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {loading ? "Loading sales…" : "No marketplace sales recorded yet."}
        </p>
      ) : (
        <ul className="divide-y divide-border/50">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
              <div className="min-w-0">
                <p className="truncate font-medium">{marketLogMessage(row)}</p>
                <p className="text-[11px] text-muted-foreground">
                  @{row.wallet}
                  {row.counterparty ? ` → @${row.counterparty}` : ""} ·{" "}
                  {formatRelativeTime(row.at)}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-primary">
                {formatHash(row.price, 0)} HASH
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}