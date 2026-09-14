import { getDataset } from "@/mock/dataset";

export async function GET(_: Request, { params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  const inv = getDataset().inventory[user];
  if (!inv) return new Response("Not found", { status: 404 });
  return Response.json(inv);
}
