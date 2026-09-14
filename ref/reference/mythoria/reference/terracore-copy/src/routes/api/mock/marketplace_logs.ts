import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/marketplace_logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
        const all = getDataset().marketLogs;
        const page = all.slice(offset, offset + limit);
        return Response.json({
          totalPages: Math.max(1, Math.ceil(all.length / limit)),
          data: page,
        });
      },
    },
  },
});
