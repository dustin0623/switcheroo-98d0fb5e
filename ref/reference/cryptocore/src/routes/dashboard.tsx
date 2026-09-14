import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage } from "@/features/pages/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CryptoCore Mining Rig" },
      {
        name: "description",
        content:
          "Track your hash rate, claim your vault, raid rival miners and upgrade your rig from the CryptoCore dashboard.",
      },
      { property: "og:title", content: "Dashboard — CryptoCore Mining Rig" },
      {
        property: "og:description",
        content: "Vault, mining, stats and activity for your CryptoCore rig.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});
