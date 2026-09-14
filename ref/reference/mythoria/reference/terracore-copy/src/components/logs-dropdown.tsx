import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

export type LogsDropdownItem = {
  to: string;
  params?: Record<string, string>;
  label: string;
};

export function LogsDropdown({ items }: { items: LogsDropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-3 py-2 text-xs font-semibold tracking-widest border border-border rounded-md text-muted-foreground hover:text-primary hover:border-primary transition-colors inline-flex items-center gap-1"
      >
        Logs <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[180px] bg-background border border-border rounded-md shadow-lg z-30"
        >
          {items.map((it) => (
            <Link
              key={it.to + JSON.stringify(it.params ?? {})}
              to={it.to as never}
              params={it.params as never}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-xs font-semibold tracking-widest text-foreground hover:bg-muted hover:text-primary"
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
