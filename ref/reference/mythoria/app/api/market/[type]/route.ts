import { NextRequest }              from "next/server";
import { apiOk, apiError }          from "@/lib/api/error-response";
import { connectDatabase }          from "@/lib/config/database";
import { findListedItems }          from "@/lib/modules/items/repository.server";
import { findListedCrates }         from "@/lib/modules/crates/repository.server";
import { findListedConsumables }    from "@/lib/modules/consumables/repository.server";
import { findListedRelics }         from "@/lib/modules/relics/repository.server";

type Params = Promise<{ type: string }>;
const VALID_TYPES = ["items", "crates", "consumables", "relics"] as const;
type MarketType = typeof VALID_TYPES[number];

export async function GET(
  req: NextRequest,
  { params }: { params: Params },
): Promise<Response> {
  const { type } = await params;

  if (!VALID_TYPES.includes(type as MarketType)) {
    return apiError(`Unknown market type: ${type}`, "INVALID_TYPE", 400);
  }

  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50));
  const skip  = Math.max(0,   Number(req.nextUrl.searchParams.get("skip")  ?? 0));

  await connectDatabase();

  let listings: unknown[];
  switch (type as MarketType) {
    case "items":       listings = await findListedItems(limit, skip);       break;
    case "crates":      listings = await findListedCrates(limit, skip);      break;
    case "consumables": listings = await findListedConsumables(limit, skip); break;
    case "relics":      listings = await findListedRelics(limit, skip);      break;
  }

  return apiOk({ type, listings, limit, skip });
}
