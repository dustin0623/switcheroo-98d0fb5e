import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/claim_logs/$user")({
  server: {
    handlers: {
      GET: async ({ params }) => Response.json(getDataset().claimLogs[params.user] ?? []),
    },
  },
});
