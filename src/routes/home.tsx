import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const HomeDesktopShell = lazy(() => import("@/components/game/home-desktop-shell"));

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "ARCOON — Home" },
      {
        name: "description",
        content:
          "The ARCOON home base: armory, inventory, crafting, quests, marketplace and more from one shell.",
      },
      { property: "og:title", content: "ARCOON — Home" },
      {
        property: "og:description",
        content:
          "The ARCOON home base: armory, inventory, crafting, quests, marketplace and more from one shell.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ink-900">
      <p className="text-sm tracking-widest text-white uppercase">Loading ARCOON</p>
    </div>
  );
}

function HomePage() {
  return (
    <main data-game-route className="h-screen w-screen overflow-hidden bg-ink-900">
      <h1 className="sr-only">ARCOON — home</h1>
      <ClientOnly fallback={<Loading />}>
        <Suspense fallback={<Loading />}>
          <HomeDesktopShell />
        </Suspense>
      </ClientOnly>
    </main>
  );
}
