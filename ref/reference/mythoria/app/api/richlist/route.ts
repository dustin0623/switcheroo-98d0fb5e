import { NextRequest } from "next/server";
import { connectDatabase } from "@/lib/config/database";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { apiOk } from "@/lib/api/error-response";

// sort keys → PlayerModel field used for sorting
const SORT_FIELDS: Record<string, string> = {
  total:     "aether", // approximate — real total aggregated below
  staked:    "staked",
  liquid:    "aether",
  stash:     "stashsize",
  essence:   "essence",
};

export async function GET(req: NextRequest): Promise<Response> {
  await connectDatabase();
  const sort   = req.nextUrl.searchParams.get("sort") ?? "total";
  const limit  = Math.min(500, Number(req.nextUrl.searchParams.get("limit")  ?? 100));
  const offset = Math.max(0,   Number(req.nextUrl.searchParams.get("offset") ?? 0));

  const sortField = SORT_FIELDS[sort] ?? SORT_FIELDS.total!;

  const docs = await PlayerModel
    .find(
      {},
      { wallet: 1, username: 1, staked: 1, aether: 1, stashsize: 1, essence: 1 }
    )
    .sort({ [sortField]: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  const players = docs.map((p, i) => ({
    rank:     offset + i + 1,
    username: p.username ?? p.wallet,
    staked:   p.staked     ?? 0,
    liquid:   p.aether     ?? 0,
    stash:    p.stashsize  ?? 0,
    essence:  p.essence    ?? 0,
    total:    (p.staked ?? 0) + (p.aether ?? 0) + (p.stashsize ?? 0),
  }));

  return apiOk({ players });
}
