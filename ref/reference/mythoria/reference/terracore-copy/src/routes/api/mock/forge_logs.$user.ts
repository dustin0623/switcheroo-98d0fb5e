import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/forge_logs/$user")({
  server: {
    handlers: {
      GET: async ({ params }) => Response.json(getDataset().forgeLogs[params.user] ?? []),
    },
  },
});
