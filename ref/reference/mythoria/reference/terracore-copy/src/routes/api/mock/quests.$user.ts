import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/quests/$user")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const q = getDataset().quests[params.user] ?? [];
        return Response.json(q);
      },
    },
  },
});
