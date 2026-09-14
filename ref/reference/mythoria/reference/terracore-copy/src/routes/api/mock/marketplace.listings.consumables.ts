import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/marketplace/listings/consumables")({
  server: {
    handlers: {
      GET: async () => Response.json(getDataset().marketConsumables),
    },
  },
});
