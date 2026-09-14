import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "@/features/pages/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CryptoCore — Idle Crypto Mining Game on Solana" },
      {
        name: "description",
        content:
          "Build your rig, mine $HASH, open chests, raid rival miners and trade gear on the marketplace in CryptoCore.",
      },
      { property: "og:title", content: "CryptoCore — Idle Crypto Mining Game on Solana" },
      {
        property: "og:description",
        content: "Mine, upgrade, raid and trade in this idle crypto mining game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
