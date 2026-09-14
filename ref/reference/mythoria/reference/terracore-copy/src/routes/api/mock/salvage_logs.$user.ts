import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/salvage_logs/$user")({
  server: {
    handlers: {
      GET: async ({ params }) => Response.json(getDataset().salvageLogs[params.user] ?? []),
    },
  },
});
