import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/leaderboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
        return Response.json(getDataset().leaderboard.slice(offset, offset + limit));
      },
    },
  },
});
