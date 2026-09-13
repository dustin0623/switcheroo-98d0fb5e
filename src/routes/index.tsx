import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const HomeDesktopShell = lazy(() => import("@/components/game/home-desktop-shell"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARCOON — Frog Archer Stage Runner" },
      {
        name: "description",
        content:
          "ARCOON is a pixel bow-combat game. Manage your gear, pick a map, clear every stage of escalating waves, and unlock the next hunting ground.",
      },
      { property: "og:title", content: "ARCOON — Frog Archer Stage Runner" },
      {
        property: "og:description",
        content:
          "Manage your gear, pick a map, clear every stage of escalating waves, and unlock the next hunting ground in ARCOON.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ink-900">
      <p className="text-sm tracking-widest text-white uppercase">Loading ARCOON</p>
    </div>
  );
}

function Index() {
  return (
    <main data-game-route className="h-screen w-screen overflow-hidden bg-ink-900">
      <h1 className="sr-only">ARCOON — frog archer stage runner</h1>
      <ClientOnly fallback={<Loading />}>
        <Suspense fallback={<Loading />}>
          <HomeDesktopShell />
        </Suspense>
      </ClientOnly>
    </main>
  );
}
