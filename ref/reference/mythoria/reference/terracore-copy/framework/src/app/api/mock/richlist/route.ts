import { getDataset } from "@/mock/dataset";
import type { RichlistEntry } from "@/mock/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") ?? "total";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const sorters: Record<string, (a: RichlistEntry, b: RichlistEntry) => number> = {
    total: (a, b) => b.total - a.total,
    staked: (a, b) => b.staked - a.staked,
    liquid: (a, b) => b.liquid - a.liquid,
    stash: (a, b) => b.stash - a.stash,
    flux: (a, b) => b.flux - a.flux,
  };
  const list = getDataset().richlist.slice().sort(sorters[sort] ?? sorters.total!);
  list.forEach((r, i) => (r.rank = i + 1));
  return Response.json(list.slice(offset, offset + limit));
}
