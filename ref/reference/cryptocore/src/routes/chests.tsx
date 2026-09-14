import { createFileRoute } from "@tanstack/react-router";

import { ChestsPage } from "@/features/pages/ChestsPage";

export const Route = createFileRoute("/chests")({
  head: () => ({
    meta: [
      { title: "Chests — CryptoCore" },
      { name: "description", content: "Open chests for NFT-style rig equipment with random rarity." },
      { property: "og:title", content: "Chests — CryptoCore" },
      { property: "og:description", content: "Spend HASH on chests and roll rare mining gear." },
    ],
  }),
  component: ChestsPage,
});
