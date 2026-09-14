import { createFileRoute } from "@tanstack/react-router";

import { WikiPage } from "@/features/pages/WikiPage";

export const Route = createFileRoute("/wiki")({
  head: () => ({
    meta: [
      { title: "Wiki — CryptoCore Game Documentation" },
      {
        name: "description",
        content:
          "How CryptoCore works: mining rates, vault capacity, stat effects, chest drop odds, raid mechanics and marketplace fees.",
      },
      { property: "og:title", content: "Wiki — CryptoCore Game Documentation" },
      {
        property: "og:description",
        content: "Full reference for the $HASH economy: mining, stats, gear rarity, chest odds, raids and trading.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WikiPage,
});
