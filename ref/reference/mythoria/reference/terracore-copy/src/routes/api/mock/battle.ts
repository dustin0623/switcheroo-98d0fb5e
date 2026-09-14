import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/battle")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
        const players = getDataset().battle.players.slice(offset, offset + limit);
        return Response.json({ players });
      },
    },
  },
});
