import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGameStore } from "@/stores/game-store";


export function SiteHeader() {
  const activeUser = useGameStore((s) => s.activeUser);
  const citizens = useGameStore((s) => s.citizens);
  const setActiveUser = useGameStore((s) => s.setActiveUser);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const navItems = [
    { to: "/play", label: "PLAY", icon: "▶", params: undefined },
    { to: "/market", label: "MARKET", icon: "▤", params: undefined },
    { to: "/shop", label: "SHOP", icon: "🛍", params: undefined },
    { to: "/$user/items", label: "INVENTORY", icon: "▦", params: { user: activeUser } },
  ] as const;

  const exploreItems: Array<
    | { kind: "link"; to: string; label: string; icon: string }
    | { kind: "external"; href: string; label: string; icon: string }
    | { kind: "divider" }
  > = [
    { kind: "link", to: "/leaderboard", label: "LEADERBOARD", icon: "🏆" },
    { kind: "link", to: "/items", label: "ITEMS ARCHIVE", icon: "🗂" },
    { kind: "link", to: "/stats", label: "STATS", icon: "📊" },
    { kind: "link", to: "/richlist", label: "RICHLIST", icon: "💰" },
    { kind: "divider" },
    { kind: "external", href: "https://www.mythoriagame.com/updates", label: "GAME UPDATES", icon: "📣" },
    { kind: "external", href: "https://www.mythoriagame.com/wiki", label: "OFFICIAL WIKI", icon: "📖" },
    { kind: "external", href: "https://discord.gg/mythoria", label: "JOIN DISCORD", icon: "💬" },
  ];

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="container-tc flex items-center justify-between py-4 gap-6">
        <Link to="/" className="text-2xl font-bold tracking-widest text-foreground">
          MYTHO<span className="text-primary">RIA</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              params={item.params as never}
              className="px-3 py-2 text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              activeProps={{ className: "text-primary" }}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div className="relative" ref={exploreRef}>
            <button
              type="button"
              onClick={() => setExploreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={exploreOpen}
              className="px-3 py-2 text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <span aria-hidden>◎</span>
              EXPLORE
              <span aria-hidden className="text-[0.6rem]">▼</span>
            </button>
            {exploreOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 bg-background border border-border/60 rounded-md shadow-lg py-2 z-50"
              >
                {exploreItems.map((item, i) => {
                  if (item.kind === "divider") {
                    return <div key={`d-${i}`} className="my-2 border-t border-border/60" />;
                  }
                  const content = (
                    <>
                      <span className="tracking-widest">{item.label}</span>
                      <span aria-hidden className="text-base">{item.icon}</span>
                    </>
                  );
                  const className =
                    "flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-accent/30 transition-colors";
                  return item.kind === "link" ? (
                    <Link
                      key={item.to}
                      to={item.to as "/leaderboard"}
                      onClick={() => setExploreOpen(false)}
                      className={className}
                    >
                      {content}
                    </Link>
                  ) : (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setExploreOpen(false)}
                      className={className}
                    >
                      {content}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
        <div className="flex items-center gap-2">
          <select
            aria-label="Active hero"
            value={activeUser}
            onChange={(e) => setActiveUser(e.target.value)}
            className="bg-input/40 border border-border rounded-md px-2 py-1.5 text-xs font-semibold tracking-widest text-foreground"
          >
            {citizens.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-semibold tracking-widest border border-primary text-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            LOGIN →
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container-tc py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>
          Made with <span className="text-destructive">♥</span> by @mythoria
        </p>
        <p>By using this service you accept our Terms of Service and Privacy Policy</p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const hideGlobalChrome = pathname === "/planets" || pathname === "/quests";

  return (
    <div className="min-h-screen flex flex-col">
      {!hideGlobalChrome && <SiteHeader />}
      <main className="flex-1">{children}</main>
      {!hideGlobalChrome && <SiteFooter />}
    </div>
  );
}


export function EmptyPage({ title, message }: { title: string; message?: string }) {
  return (
    <PageShell>
      <div className="container-tc py-24">
        <div className="bracket-frame text-center py-24">
          <h1 className="text-3xl font-bold tracking-wider">{title}</h1>
          {message && <p className="mt-4 text-muted-foreground">{message}</p>}
        </div>
      </div>
    </PageShell>
  );
}
