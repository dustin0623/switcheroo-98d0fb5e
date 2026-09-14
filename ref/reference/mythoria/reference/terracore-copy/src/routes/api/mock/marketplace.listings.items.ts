import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/marketplace/listings/items")({
  server: {
    handlers: {
      GET: async () => Response.json(getDataset().marketItems),
    },
  },
});
