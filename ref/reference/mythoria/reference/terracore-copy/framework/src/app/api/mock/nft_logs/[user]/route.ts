import { getDataset } from "@/mock/dataset";

export async function GET(_: Request, { params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  return Response.json(getDataset().nftLogs[user] ?? []);
}
