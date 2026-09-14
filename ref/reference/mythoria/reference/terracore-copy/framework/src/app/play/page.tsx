"use client";

// Example of a fully client-rendered interactive page — the Next.js analog of
// `src/routes/play.tsx` in the TanStack app. It uses the exact same Zustand
// store copied under `src/stores/`, showing that state-management code is
// framework-agnostic. Only routing + data-fetch primitives differ.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/stores/game-store";

export default function PlayPage() {
  const activeUser = useGameStore((s) => s.activeUser);
  const setActiveUser = useGameStore((s) => s.setActiveUser);
  const citizens = useGameStore((s) => s.citizens);
  const player = useGameStore((s) => s.players[activeUser] ?? null);
  const fetchPlayer = useGameStore((s) => s.fetchPlayer);

  // Prevent SSR/CSR hydration mismatch: the store is persisted to localStorage,
  // so gate reads until after mount.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    void fetchPlayer(activeUser);
  }, [activeUser, fetchPlayer]);

  if (!ready) return <main className="container"><p className="muted">Loading…</p></main>;

  return (
    <main className="container">
      <h1>Play (client component)</h1>
      <p className="muted">
        This page runs entirely in the browser. Data flows through the same
        Zustand store as the TanStack app; only the routing differs.
      </p>

      <section style={{ marginTop: 16 }}>
        <p>Active: <b>{activeUser}</b></p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {citizens.map((c) => (
            <button key={c} onClick={() => setActiveUser(c)}>{c}</button>
          ))}
        </div>
      </section>

      {player && (
        <section className="panel" style={{ marginTop: 24 }}>
          <h2>{player.username}</h2>
          <p>Level {player.level} · XP {player.experience.toLocaleString()}</p>
          <p>Scrap {Math.round(player.scrap).toLocaleString()} · Flux {player.flux.toFixed(2)}</p>
          <p className="muted">Attacks {player.attacks} · Claims {player.claims}</p>
          <p><Link href={`/${player.username}/items`}>View inventory →</Link></p>
        </section>
      )}
    </main>
  );
}
