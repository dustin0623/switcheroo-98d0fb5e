import { createFileRoute } from "@tanstack/react-router";

import { MarketplacePage } from "@/features/pages/MarketplacePage";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — CryptoCore" },
      { name: "description", content: "Browse rig equipment listings. Trading arrives in a later build." },
      { property: "og:title", content: "Marketplace — CryptoCore" },
      { property: "og:description", content: "Preview the CryptoCore equipment marketplace." },
    ],
  }),
  component: MarketplacePage,
});
