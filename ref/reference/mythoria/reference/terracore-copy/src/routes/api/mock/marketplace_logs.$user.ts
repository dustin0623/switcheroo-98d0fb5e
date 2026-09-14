import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/marketplace_logs/$user")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rows = getDataset().userMarketLogs[params.user] ?? [];
        return Response.json(rows);
      },
    },
  },
});
