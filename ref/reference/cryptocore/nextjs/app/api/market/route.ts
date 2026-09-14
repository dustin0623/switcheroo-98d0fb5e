import { jsonResponse } from "@/lib/api/cors";
import { findActiveListings } from "@/lib/modules/market-listings/repository.server";
import { findItemsByNumbers } from "@/lib/modules/items/repository.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortParam = searchParams.get("sort");
    const sort: "price_asc" | "price_desc" | "newest" =
      sortParam === "price_asc" || sortParam === "price_desc" ? sortParam : "newest";
    const parsedLimit = Number(searchParams.get("limit") ?? 50);
    const limit = Math.min(100, Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50);
    const rawCursor = searchParams.get("cursor");
    const parsedCursor = rawCursor ? Number(rawCursor) : undefined;
    const cursor = parsedCursor !== undefined && Number.isFinite(parsedCursor) ? parsedCursor : undefined;
    const result = await findActiveListings(sort, limit, cursor);
    const items = await findItemsByNumbers(result.listings.map((l) => l.itemNumber));
    const itemsByNumber = new Map(items.map((item) => [item.itemNumber, item]));
    const listings = result.listings.map((listing) => ({
      ...listing,
      item: itemsByNumber.get(listing.itemNumber) ?? null,
    }));
    return jsonResponse({ ok: true, listings, nextCursor: result.nextCursor }, request);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[market]", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, request, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "GET, OPTIONS" } });
}
