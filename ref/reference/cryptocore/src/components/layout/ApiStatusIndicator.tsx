import { Server, ServerOff } from "lucide-react";

import { useApiStatus } from "@/hooks/useApiStatus";
import { cn } from "@/lib/utils";

export function ApiStatusIndicator({ compact = false }: { compact?: boolean }) {
  const { online, loading } = useApiStatus();

  const base = cn(
    "inline-flex items-center gap-1.5 rounded-md text-xs",
    compact ? "justify-center p-1.5" : "px-2 py-1",
  );

  if (loading || online === null) {
    return (
      <span
        className={cn(base, "bg-muted/50 text-muted-foreground")}
        title="Checking server…"
      >
        <Server className="h-3.5 w-3.5 shrink-0 animate-pulse" />
        {!compact && <span className="hidden sm:inline">Server …</span>}
      </span>
    );
  }

  if (!online) {
    return (
      <span
        className={cn(base, "border border-destructive/20 bg-destructive/10 text-destructive")}
        title="Server offline"
      >
        <ServerOff className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span className="hidden sm:inline">Server offline</span>}
      </span>
    );
  }

  return (
    <span
      className={cn(base, "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600")}
      title="Server online"
    >
      <Server className="h-3.5 w-3.5 shrink-0" />
      {!compact && <span className="hidden sm:inline">Server online</span>}
    </span>
  );
}
