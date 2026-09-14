import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/quest_board")({
  server: {
    handlers: {
      GET: async () => Response.json(getDataset().questBoard),
    },
  },
});
