import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/features/pages/ProfilePage";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CryptoCore" },
      { name: "description", content: "Lifetime HASH mining, raiding and claiming statistics." },
      { property: "og:title", content: "Profile — CryptoCore" },
      { property: "og:description", content: "Your HASH career stats at a glance." },
    ],
  }),
  component: ProfilePage,
});
