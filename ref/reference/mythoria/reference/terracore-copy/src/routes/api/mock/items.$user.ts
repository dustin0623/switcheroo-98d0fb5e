import { createFileRoute } from "@tanstack/react-router";
import { getDataset } from "@/mock/dataset";

export const Route = createFileRoute("/api/mock/items/$user")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const inv = getDataset().inventory[params.user];
        if (!inv) return new Response("Not found", { status: 404 });
        return Response.json(inv);
      },
    },
  },
});
