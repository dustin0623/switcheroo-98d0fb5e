import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/player/$user")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const p = getDataset().players[params.user];
        if (!p) return new Response("Not found", { status: 404 });
        return Response.json(p);
      },
    },
  },
});
