import { NextRequest } from "next/server";
import { connectDatabase } from "@/lib/config/database";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { apiOk } from "@/lib/api/error-response";

export async function GET(req: NextRequest): Promise<Response> {
  await connectDatabase();
  const limit  = Math.min(200, Number(req.nextUrl.searchParams.get("limit")  ?? 100));
  const offset = Math.max(0,   Number(req.nextUrl.searchParams.get("offset") ?? 0));
  const players = await PlayerModel
    .find(
      {},
      {
        wallet: 1, username: 1, favor: 1, level: 1, experience: 1,
        arcane: 1, damage: 1, defense: 1,
        mgold: 1, items: 1, stats: 1,
        attacks: 1, claims: 1, scrap: 1,
      }
    )
    .sort({ favor: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
  return apiOk({ players });
}
