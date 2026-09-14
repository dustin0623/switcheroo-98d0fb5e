import type { ReactNode } from "react";
import { PageShell } from "@/components/site-layout";

/* ---------- Shell ---------- */

export function LogsPage({
  title,
  headerRight,
  children,
}: {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageShell>
      <div className="container-tc py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wider text-foreground">
            {title}
          </h1>
          {headerRight}
        </div>
        {children}
      </div>
    </PageShell>
  );
}

/* ---------- Stat cards ---------- */

export function StatCard({
  label,
  value,
  accent = "text-foreground",
  hint,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="bracket-frame">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-bold tracking-wide ${accent}`}>
        {value}
      </div>
    </div>
  );
}

/* ---------- Records container ---------- */

export function RecordsBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bracket-frame p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <span className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          {title}
        </span>
        <button
          type="button"
          aria-label="Refresh"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          ↻
        </button>
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ---------- Table ---------- */

export function LogsTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  rows: Record<string, ReactNode>[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 font-medium ${
                  c.align === "right"
                    ? "text-right"
                    : c.align === "center"
                    ? "text-center"
                    : "text-left"
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t border-border/40 hover:bg-secondary/40 transition-colors"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 align-middle ${
                    c.align === "right"
                      ? "text-right"
                      : c.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Small UI bits ---------- */

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "danger" | "warning" | "info" | "muted";
}) {
  const map = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-primary/15 text-primary",
    danger: "bg-destructive/15 text-destructive",
    warning: "bg-yellow-500/15 text-yellow-400",
    info: "bg-blue-500/15 text-blue-400",
    muted: "bg-muted text-muted-foreground",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "success" }: { tone?: "success" | "danger" | "warning" | "muted" }) {
  const map = {
    success: "bg-primary",
    danger: "bg-destructive",
    warning: "bg-yellow-400",
    muted: "bg-muted-foreground",
  } as const;
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[tone]}`} />
  );
}

/* ---------- Deterministic mock helpers ---------- */

export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

export function timeAgo(minutesAgo: number): string {
  if (minutesAgo < 60) return `${Math.max(1, minutesAgo)} mins ago`;
  const h = Math.floor(minutesAgo / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return `a day ago`;
  if (d < 30) return `${d} days ago`;
  const mo = Math.floor(d / 30);
  if (mo === 1) return `a month ago`;
  return `${mo} months ago`;
}

export function fmt(n: number, decimals = 3): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
