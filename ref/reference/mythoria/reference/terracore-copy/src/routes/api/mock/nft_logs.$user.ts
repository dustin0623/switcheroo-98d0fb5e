import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/nft_logs/$user")({
  server: {
    handlers: {
      GET: async ({ params }) => Response.json(getDataset().nftLogs[params.user] ?? []),
    },
  },
});
