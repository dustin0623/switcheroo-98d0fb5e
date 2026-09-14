const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export const formatHash = (value: number, decimals = 2): string =>
  value >= 100_000
    ? compact.format(value)
    : value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

export const formatInt = (value: number): string =>
  Math.round(value).toLocaleString("en-US");

export const formatHashRate = (value: number): string => `${formatInt(value)} H/s`;

export const formatPercent = (value: number, decimals = 0): string =>
  `${value.toFixed(decimals)}%`;

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null) return "—";
  if (seconds <= 0) return "full";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const formatRelativeTime = (at: number): string => {
  const diff = Math.max(0, Date.now() - at) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/** Countdown text like "3h 12m 40s". Returns null-safe "—" for no target. */
export const formatCountdown = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return "—";
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

