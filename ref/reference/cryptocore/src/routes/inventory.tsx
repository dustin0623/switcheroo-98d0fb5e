import { createFileRoute } from "@tanstack/react-router";

import { InventoryPage } from "@/features/pages/InventoryPage";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — CryptoCore" },
      {
        name: "description",
        content: "Browse, filter and equip every rig part you own in CryptoCore.",
      },
      { property: "og:title", content: "Inventory — CryptoCore" },
      {
        property: "og:description",
        content: "Browse, filter and equip every rig part you own in CryptoCore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});
