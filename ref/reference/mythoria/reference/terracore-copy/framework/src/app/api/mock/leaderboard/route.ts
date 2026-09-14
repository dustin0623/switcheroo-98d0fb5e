import { getDataset } from "@/mock/dataset";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  return Response.json(getDataset().leaderboard.slice(offset, offset + limit));
}
