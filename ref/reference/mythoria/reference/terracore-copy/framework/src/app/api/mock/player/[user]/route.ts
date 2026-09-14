import { getDataset } from "@/mock/dataset";

export async function GET(_: Request, { params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  const p = getDataset().players[user];
  if (!p) return new Response("Not found", { status: 404 });
  return Response.json(p);
}
